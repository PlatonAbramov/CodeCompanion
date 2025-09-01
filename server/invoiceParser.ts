import * as XLSX from 'xlsx';
import csvParser from 'csv-parser';
// Use dynamic import to avoid PDF parse issues
let pdfParse: any;
import * as fs from 'fs';
import * as path from 'path';

export interface ParsedInvoiceItem {
  position?: number;
  name: string;
  quantity?: number;
  unit?: string;
  price?: number;
  totalCost?: number;
  description?: string;
}

export interface ParsedInvoiceResult {
  success: boolean;
  items: ParsedInvoiceItem[];
  errors?: string[];
  format?: string;
  suggestColumnMapping?: boolean;
  rawData?: any;
}

export class InvoiceParser {
  
  /**
   * Парсит документ инвойса в зависимости от формата
   */
  async parseInvoice(filePath: string, fileName: string): Promise<ParsedInvoiceResult> {
    try {
      const fileExt = path.extname(fileName).toLowerCase();
      
      switch (fileExt) {
        case '.pdf':
          return await this.parsePDF(filePath);
        case '.xlsx':
        case '.xls':
          return await this.parseExcel(filePath);
        case '.csv':
          return await this.parseCSV(filePath);
        default:
          return {
            success: false,
            items: [],
            errors: [`Неподдерживаемый формат файла: ${fileExt}. Поддерживаются: PDF, XLSX, XLS, CSV`]
          };
      }
    } catch (error: any) {
      console.error('Error parsing invoice:', error);
      return {
        success: false,
        items: [],
        errors: [`Ошибка при обработке файла: ${error?.message || 'Неизвестная ошибка'}`]
      };
    }
  }

  /**
   * Парсит документ инвойса из buffer'а
   */
  async parseInvoiceFromBuffer(buffer: Buffer, fileName: string): Promise<ParsedInvoiceResult> {
    try {
      const fileExt = path.extname(fileName).toLowerCase();
      
      switch (fileExt) {
        case '.pdf':
          return await this.parsePDFFromBuffer(buffer);
        case '.xlsx':
        case '.xls':
          return await this.parseExcelFromBuffer(buffer);
        case '.csv':
          return await this.parseCSVFromBuffer(buffer);
        default:
          return {
            success: false,
            items: [],
            errors: [`Неподдерживаемый формат файла: ${fileExt}. Поддерживаются: PDF, XLSX, XLS, CSV`]
          };
      }
    } catch (error: any) {
      console.error('Error parsing invoice from buffer:', error);
      return {
        success: false,
        items: [],
        errors: [`Ошибка при обработке файла: ${error?.message || 'Неизвестная ошибка'}`]
      };
    }
  }

  /**
   * Парсинг PDF документа
   */
  private async parsePDF(filePath: string): Promise<ParsedInvoiceResult> {
    try {
      console.log('PDF Parser - attempting to read file:', filePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const dataBuffer = fs.readFileSync(filePath);
      return await this.parsePDFFromBuffer(dataBuffer);
    } catch (error: any) {
      console.error('Error parsing PDF:', error);
      return {
        success: false,
        items: [],
        format: 'PDF',
        errors: [`Ошибка при парсинге PDF: ${error?.message || 'Неизвестная ошибка'}`]
      };
    }
  }

  /**
   * Парсинг PDF документа из buffer'а
   */
  private async parsePDFFromBuffer(buffer: Buffer): Promise<ParsedInvoiceResult> {
    try {
      // Lazy load PDF parser to avoid initialization issues
      if (!pdfParse) {
        const moduleLib = await import('module');
        const require = moduleLib.createRequire(import.meta.url);
        pdfParse = require('pdf-parse/lib/pdf-parse.js');
      }
      
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text;

      // Улучшенный алгоритм парсинга табличных данных
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const items: ParsedInvoiceItem[] = [];

      // Ищем заголовок таблицы
      let tableStartIndex = -1;
      
      // Ищем заголовок таблицы
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Ищем заголовок таблицы
        if (line.includes('No.') && line.includes('Description') && line.includes('Quantity')) {
          tableStartIndex = i + 1; // Начинаем с следующей строки после заголовка
          break;
        }
      }

      if (tableStartIndex === -1) {
        return {
          success: false,
          items: [],
          format: 'PDF',
          errors: ['Не удалось найти заголовок таблицы в PDF документе']
        };
      }

      // Полная отладка каждой строки для понимания структуры
      console.log(`\n=== DEBUGGING PDF PARSING ===`);
      console.log(`Starting from line ${tableStartIndex}, total lines: ${lines.length}`);
      
      for (let i = tableStartIndex; i < Math.min(tableStartIndex + 25, lines.length); i++) {
        const line = lines[i].trim();
        if (line.includes('Subtotal')) break;
        console.log(`Line ${i}: "${line}"`);
        
        const hasNumbers = line.match(/^(.+?)\s+(\d+)\s+(\d+)\s+(\d+)$/);
        if (hasNumbers) {
          console.log(`  -> Has numbers: text="${hasNumbers[1]}", qty=${hasNumbers[2]}, price=${hasNumbers[3]}, total=${hasNumbers[4]}`);
        }
      }
      
      // Простой и прямой подход: собираем элементы по парам строк
      // Элемент 1: строки 0-1 (Укрывочные... + 1 мебели...)
      // Элемент 3: строки 3-4 (Стены... + 3 покраска...)
      
      const dataLines: string[] = [];
      for (let i = tableStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Subtotal')) break;
        if (line) dataLines.push(line);
      }
      
      console.log('\nCollected data lines:', dataLines.length);
      
      // Усовершенствованная логика парсинга для многострочных элементов
      console.log('=== ENHANCED MULTI-LINE PDF PARSING ===');
      
      // Сначала найдем все строки с числами в конце (завершающие строки элементов)
      const itemEndLines: Array<{index: number, line: string, quantity: number, price: number, total: number}> = [];
      
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        
        // Ищем завершающие строки элементов (только числа: количество цена сумма)
        const numbersOnlyMatch = line.match(/^\s*(\d+)\s+(\d+(?:[,\.]\d+)?)\s+(\d+(?:[,\.]\d+)?)\s*$/);
        if (numbersOnlyMatch) {
          const quantity = this.parseNumber(numbersOnlyMatch[1]);
          const price = this.parseNumber(numbersOnlyMatch[2]);
          const total = this.parseNumber(numbersOnlyMatch[3]);
          
          if (quantity && price && total) {
            itemEndLines.push({
              index: i,
              line: line,
              quantity,
              price,
              total
            });
            console.log(`Found item end line ${i}: "${line}" -> ${quantity} × ${price} = ${total}`);
          }
        }
      }
      
      console.log(`Found ${itemEndLines.length} item end lines`);
      
      // Теперь для каждой завершающей строки найдем начало элемента
      for (const endLine of itemEndLines) {
        let position = items.length + 1;
        let description = '';
        
        // Идем назад от завершающей строки, собирая описание
        let startIndex = endLine.index - 1;
        let foundPosition = false;
        const descriptionParts: string[] = [];
        
        // Ищем начало элемента (номер позиции)
        for (let j = endLine.index - 1; j >= 0; j--) {
          const line = dataLines[j].trim();
          
          // Проверяем, является ли строка номером позиции
          const positionMatch = line.match(/^(\d+)$/);
          if (positionMatch) {
            position = parseInt(positionMatch[1]);
            foundPosition = true;
            console.log(`Found position ${position} at line ${j}`);
            break;
          }
          
          // Проверяем, является ли строка началом другого элемента
          const otherItemMatch = line.match(/^(\d+)\s+(.+)/);
          if (otherItemMatch) {
            // Это начало другого элемента, прекращаем поиск
            break;
          }
          
          // Добавляем строку к описанию (в обратном порядке)
          if (line && !line.match(/^\d+\s+\d+\s+\d+$/)) {
            descriptionParts.unshift(line);
          }
        }
        
        // Объединяем все части описания
        description = descriptionParts.join(' ').trim();
        
        // Если не нашли позицию в отдельной строке, попробуем извлечь из первой части описания
        if (!foundPosition && descriptionParts.length > 0) {
          const firstPart = descriptionParts[0];
          const posAtStart = firstPart.match(/^(\d+)\s+(.+)/);
          if (posAtStart) {
            position = parseInt(posAtStart[1]);
            descriptionParts[0] = posAtStart[2].trim();
            description = descriptionParts.join(' ').trim();
            foundPosition = true;
            console.log(`Found position ${position} at start of description`);
          }
        }
        
        // Если все еще не нашли позицию, используем следующий порядковый номер
        if (!foundPosition) {
          position = items.length + 1;
          console.log(`Assigning position ${position} to multi-line item`);
        }
        
        // Добавляем элемент если есть описание
        if (description) {
          items.push({
            position,
            name: description,
            quantity: endLine.quantity,
            unit: '',
            price: endLine.price,
            totalCost: endLine.total,
            description: description
          });
          
          console.log(`Created multi-line item ${position}: "${description}" (${endLine.quantity} × ${endLine.price} = ${endLine.total})`);
        }
      }
      
      // Также проверим однострочные элементы (на случай если что-то пропустили)
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        
        // Ищем полные однострочные элементы: "номер описание количество цена сумма"
        const singleLineMatch = line.match(/^(\d+)\s+(.+?)\s+(\d+)\s+(\d+(?:[,\.]\d+)?)\s+(\d+(?:[,\.]\d+)?)\s*$/);
        if (singleLineMatch) {
          const position = parseInt(singleLineMatch[1]);
          const description = singleLineMatch[2].trim();
          const quantity = this.parseNumber(singleLineMatch[3]);
          const price = this.parseNumber(singleLineMatch[4]);
          const total = this.parseNumber(singleLineMatch[5]);
          
          // Проверяем, что такой элемент еще не добавлен
          const alreadyExists = items.some(item => item.position === position);
          
          if (!alreadyExists && quantity && price && total && description) {
            items.push({
              position,
              name: description,
              quantity,
              unit: '',
              price,
              totalCost: total,
              description: description
            });
            
            console.log(`Created single-line item ${position}: "${description}" (${quantity} × ${price} = ${total})`);
          }
        }
      }
      
      // Сортируем по позиции и удаляем дубликаты
      items.sort((a, b) => a.position - b.position);
      
      // Удаляем дубликаты по позиции (оставляем первый)
      const uniqueItems = items.filter((item, index, arr) => {
        return index === 0 || item.position !== arr[index - 1].position;
      });

      return {
        success: uniqueItems.length > 0,
        items: uniqueItems,
        format: 'PDF',
        errors: uniqueItems.length === 0 ? ['Не удалось найти табличные данные в PDF документе'] : undefined,
        suggestColumnMapping: uniqueItems.length === 0
      };

    } catch (error: any) {
      return {
        success: false,
        items: [],
        format: 'PDF',
        errors: [`Ошибка парсинга PDF: ${error?.message || 'Неизвестная ошибка'}`]
      };
    }
  }

  /**
   * Парсинг Excel документа
   */
  private async parseExcel(filePath: string): Promise<ParsedInvoiceResult> {
    try {
      const buffer = fs.readFileSync(filePath);
      return await this.parseExcelFromBuffer(buffer);
    } catch (error: any) {
      return {
        success: false,
        items: [],
        format: 'XLSX',
        errors: [`Ошибка парсинга Excel: ${error?.message || 'Неизвестная ошибка'}`]
      };
    }
  }

  /**
   * Парсинг Excel документа из buffer'а
   */
  private async parseExcelFromBuffer(buffer: Buffer): Promise<ParsedInvoiceResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Конвертируем в JSON с заголовками
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!rawData || rawData.length < 2) {
        return {
          success: false,
          items: [],
          format: 'XLSX',
          errors: ['Excel файл пустой или содержит менее 2 строк'],
          suggestColumnMapping: true,
          rawData
        };
      }

      // Первая строка - заголовки
      const headers = rawData[0] as string[];
      const items: ParsedInvoiceItem[] = [];

      // Автоматически определяем колонки
      const columnMap = this.detectColumns(headers);

      console.log(`Excel parsing started. Headers:`, headers);
      console.log(`Column mapping:`, columnMap);

      // Сначала найдем все строки с завершающими данными (количество, цена, сумма)
      const itemEndRows: Array<{index: number, row: any[], quantity: number, price: number, total: number, position?: number}> = [];
      
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] as any[];
        if (!row || row.length === 0) continue;

        const quantity = this.parseNumber(this.getCellValue(row, columnMap.quantity));
        const price = this.parseNumber(this.getCellValue(row, columnMap.price)); 
        const totalCost = this.parseNumber(this.getCellValue(row, columnMap.totalCost));

        // Если есть количество И (цена ИЛИ общая стоимость), это завершающая строка элемента
        if (quantity && (price || totalCost)) {
          // Попробуем найти номер позиции в первой колонке или в названии
          let position: number | undefined;
          
          // Проверяем первую колонку на номер позиции
          const firstCol = this.getCellValue(row, 0);
          if (firstCol) {
            const posMatch = firstCol.match(/^(\d+)$/);
            if (posMatch) {
              position = parseInt(posMatch[1]);
            }
          }

          itemEndRows.push({
            index: i,
            row,
            quantity,
            price: price || 0,
            total: totalCost || (quantity * (price || 0)),
            position
          });

          console.log(`Found item end row ${i}: pos=${position}, qty=${quantity}, price=${price}, total=${totalCost || (quantity * (price || 0))}`);
        }
      }

      console.log(`Found ${itemEndRows.length} item end rows`);

      // Теперь для каждой завершающей строки соберем полное описание
      let processedRows = 0;
      let usedRows = new Set<number>();

      for (const endRow of itemEndRows) {
        let position = endRow.position || (items.length + 1);
        let descriptionParts: string[] = [];
        
        // Собираем описание из текущей строки и предыдущих
        let startIndex = endRow.index;
        
        // Сначала проверим текущую строку на описание
        const currentName = this.getCellValue(endRow.row, columnMap.name);
        if (currentName && !currentName.match(/^(\d+)$/)) {
          descriptionParts.push(currentName);
        }

        // Теперь идем назад, собирая описание, пока не найдем начало следующего элемента
        for (let j = endRow.index - 1; j >= 1; j--) {
          // Пропускаем уже использованные строки
          if (usedRows.has(j)) break;
          
          const prevRow = rawData[j] as any[];
          if (!prevRow || prevRow.length === 0) continue;

          // Проверяем, есть ли в этой строке числовые данные (количество/цена/сумма)
          const prevQty = this.parseNumber(this.getCellValue(prevRow, columnMap.quantity));
          const prevPrice = this.parseNumber(this.getCellValue(prevRow, columnMap.price));
          const prevTotal = this.parseNumber(this.getCellValue(prevRow, columnMap.totalCost));
          
          // Если есть числовые данные, это уже другой элемент
          if (prevQty || prevPrice || prevTotal) {
            break;
          }

          // Проверяем первую колонку на номер позиции
          const firstCol = this.getCellValue(prevRow, 0);
          if (firstCol) {
            const posMatch = firstCol.match(/^(\d+)$/);
            if (posMatch) {
              // Это номер позиции для нашего элемента
              position = parseInt(posMatch[1]);
              usedRows.add(j);
              continue;
            }
          }

          // Собираем описание из колонки с названием
          const prevName = this.getCellValue(prevRow, columnMap.name);
          if (prevName && !prevName.match(/^(\d+)$/)) {
            descriptionParts.unshift(prevName);
            usedRows.add(j);
          }
        }

        // Помечаем текущую строку как использованную
        usedRows.add(endRow.index);

        // Создаем элемент
        const fullDescription = descriptionParts.join(' ').trim();
        const item: ParsedInvoiceItem = {
          position: position,
          name: fullDescription || `Позиция ${position}`,
          quantity: endRow.quantity,
          unit: this.getCellValue(endRow.row, columnMap.unit),
          price: endRow.price,
          totalCost: endRow.total,
          description: this.getCellValue(endRow.row, columnMap.description)
        };

        items.push(item);
        processedRows++;

        console.log(`Created item ${position}: "${fullDescription}" (${endRow.quantity} × ${endRow.price} = ${endRow.total})`);
      }

      const skippedRows = rawData.length - 1 - usedRows.size;
      console.log(`Excel parsing: processed ${processedRows} items, used ${usedRows.size} rows, skipped ${skippedRows} rows, total data rows: ${rawData.length - 1}`);

      return {
        success: items.length > 0,
        items,
        format: 'XLSX',
        errors: items.length === 0 ? ['Не удалось извлечь данные из Excel файла'] : undefined,
        suggestColumnMapping: columnMap.name === -1,
        rawData
      };

    } catch (error: any) {
      return {
        success: false,
        items: [],
        format: 'XLSX',
        errors: [`Ошибка парсинга Excel: ${error?.message || 'Неизвестная ошибка'}`]
      };
    }
  }

  /**
   * Парсинг CSV документа
   */
  private async parseCSV(filePath: string): Promise<ParsedInvoiceResult> {
    try {
      const buffer = fs.readFileSync(filePath);
      return await this.parseCSVFromBuffer(buffer);
    } catch (error: any) {
      return {
        success: false,
        items: [],
        format: 'CSV',
        errors: [`Ошибка парсинга CSV: ${error?.message || 'Неизвестная ошибка'}`]
      };
    }
  }

  /**
   * Парсинг CSV документа из buffer'а
   */
  private async parseCSVFromBuffer(buffer: Buffer): Promise<ParsedInvoiceResult> {
    return new Promise((resolve) => {
      const items: ParsedInvoiceItem[] = [];
      const errors: string[] = [];
      let headers: string[] = [];
      let isFirstRow = true;
      
      const Readable = require('stream').Readable;
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      stream
        .pipe(csvParser({ separator: ',' }))
        .on('headers', (headerList: string[]) => {
          headers = headerList;
        })
        .on('data', (row: any) => {
          if (isFirstRow) {
            isFirstRow = false;
            return;
          }

          // Автоматически определяем колонки
          const columnMap = this.detectColumns(headers);
          
          const item: ParsedInvoiceItem = {
            position: items.length + 1,
            name: row[headers[columnMap.name]] || `Позиция ${items.length + 1}`,
            quantity: this.parseNumber(row[headers[columnMap.quantity]]),
            unit: row[headers[columnMap.unit]],
            price: this.parseNumber(row[headers[columnMap.price]]),
            totalCost: this.parseNumber(row[headers[columnMap.totalCost]]),
            description: row[headers[columnMap.description]]
          };

          // Если общая стоимость не указана, рассчитываем
          if (!item.totalCost && item.quantity && item.price) {
            item.totalCost = item.quantity * item.price;
          }

          items.push(item);
        })
        .on('end', () => {
          resolve({
            success: items.length > 0,
            items,
            format: 'CSV',
            errors: items.length === 0 ? ['CSV файл не содержит данных'] : undefined,
            suggestColumnMapping: headers.length === 0
          });
        })
        .on('error', (error: any) => {
          resolve({
            success: false,
            items: [],
            format: 'CSV',
            errors: [`Ошибка парсинга CSV: ${error?.message || 'Неизвестная ошибка'}`]
          });
        });
    });
  }

  /**
   * Автоматическое определение колонок по заголовкам
   */
  private detectColumns(headers: string[]): {
    name: number;
    quantity: number;
    unit: number;
    price: number;
    totalCost: number;
    description: number;
  } {
    const columnMap = {
      name: -1,
      quantity: -1,
      unit: -1,
      price: -1,
      totalCost: -1,
      description: -1
    };

    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase().replace(/[^а-яё\w]/g, '');

      // Наименование
      if (headerLower.includes('наименование') || headerLower.includes('название') || 
          headerLower.includes('работа') || headerLower.includes('позиция') ||
          headerLower.includes('name') || headerLower.includes('item')) {
        columnMap.name = index;
      }

      // Количество
      else if (headerLower.includes('количество') || headerLower.includes('кол') ||
               headerLower.includes('qty') || headerLower.includes('quantity')) {
        columnMap.quantity = index;
      }

      // Единица измерения
      else if (headerLower.includes('единица') || headerLower.includes('ед') ||
               headerLower.includes('unit') || headerLower.includes('мера')) {
        columnMap.unit = index;
      }

      // Цена
      else if (headerLower.includes('цена') || headerLower.includes('стоимость') ||
               headerLower.includes('price') || headerLower.includes('cost') ||
               headerLower.includes('руб') || headerLower.includes('aed')) {
        if (headerLower.includes('общая') || headerLower.includes('итого') || 
            headerLower.includes('total') || headerLower.includes('сумма')) {
          columnMap.totalCost = index;
        } else {
          columnMap.price = index;
        }
      }

      // Описание
      else if (headerLower.includes('описание') || headerLower.includes('примечание') ||
               headerLower.includes('description') || headerLower.includes('note')) {
        columnMap.description = index;
      }
    });

    return columnMap;
  }

  /**
   * Проверяет, является ли строка заголовком таблицы
   */
  private isHeaderLine(line: any): boolean {
    const headerKeywords = [
      'наименование', 'количество', 'цена', 'стоимость', 'итого',
      'name', 'quantity', 'price', 'cost', 'total', '№', 'no'
    ];
    
    const lineLower = line.toLowerCase();
    return headerKeywords.some(keyword => lineLower.includes(keyword));
  }

  /**
   * Парсит строку таблицы из PDF
   */
  private parseTableLine(line: any, position: number): ParsedInvoiceItem | null {
    // Простой алгоритм: ищем числа и текст
    const parts = line.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length < 2) return null;

    // Ищем числовые значения
    const numbers = parts.filter(part => !isNaN(parseFloat(part.replace(',', '.'))));
    
    // Первая часть обычно номер позиции или название
    let name = parts[0];
    let nameEndIndex = 0;

    // Собираем название до первого числа
    for (let i = 1; i < parts.length; i++) {
      if (isNaN(parseFloat(parts[i].replace(',', '.')))) {
        name += ' ' + parts[i];
        nameEndIndex = i;
      } else {
        break;
      }
    }

    const item: ParsedInvoiceItem = {
      position,
      name: name.trim(),
      quantity: numbers.length > 0 ? this.parseNumber(numbers[0]) : undefined,
      price: numbers.length > 1 ? this.parseNumber(numbers[1]) : undefined,
      totalCost: numbers.length > 2 ? this.parseNumber(numbers[2]) : undefined
    };

    // Если общая стоимость не указана, рассчитываем
    if (!item.totalCost && item.quantity && item.price) {
      item.totalCost = item.quantity * item.price;
    }

    return item;
  }

  /**
   * Получает значение ячейки из массива
   */
  private getCellValue(row: any[], columnIndex: number): string | undefined {
    if (columnIndex === -1 || columnIndex >= row.length) return undefined;
    
    const cellValue = row[columnIndex];
    if (cellValue === null || cellValue === undefined) return undefined;
    
    const stringValue = String(cellValue).trim();
    if (stringValue === '' || stringValue === 'undefined' || stringValue === 'null') return undefined;
    
    return stringValue;
  }



  private addBufferedItem(buffer: { position?: number; description: string[] }, items: ParsedInvoiceItem[]): void {
    if (buffer.position && buffer.description.length > 0) {
      const fullDescription = buffer.description.join(' ').trim();
      
      // Добавляем элемент без числовых данных (будут заполнены нулями)
      items.push({
        position: buffer.position,
        name: fullDescription,
        quantity: 0,
        unit: '',
        price: 0,
        totalCost: 0,
        description: fullDescription
      });
    }
  }

  /**
   * Парсит числовое значение
   */
  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    
    const cleaned = String(value).replace(/[^\d.,\-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) return undefined;
    
    // Limit to prevent database overflow (precision 12, scale 3 = max 999999999.999)
    return Math.min(Math.abs(parsed), 999999999);
  }

  /**
   * Улучшенный парсинг строки таблицы с поддержкой разделения на описание и числовые данные
   */
  private parseTableLineAdvanced(line: string, position: number): Partial<ParsedInvoiceItem> {
    // Ищем числовые значения в конце строки
    const numericMatch = line.match(/(.+?)\s+(\d+(?:[.,]\d+)?)\s*([a-zA-Z]*)\s*(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)$/);
    
    if (numericMatch) {
      const [, description, quantity, unit, price, total] = numericMatch;
      return {
        position,
        name: description.trim(),
        quantity: this.parseNumber(quantity),
        unit: unit || undefined,
        price: this.parseNumber(price),
        totalCost: this.parseNumber(total)
      };
    }
    
    // Если числовые данные не найдены, считаем это описанием
    return {
      position,
      name: line.trim()
    };
  }

  /**
   * Проверяет, содержит ли строка числовые данные (количество, цена, стоимость)
   */
  private containsNumericData(line: string): boolean {
    // Ищем паттерны: число [единица] число число (количество [единица] цена стоимость)
    return /\d+(?:[.,]\d+)?\s*[a-zA-Z]*\s*\d+(?:[.,]\d+)?\s+\d+(?:[.,]\d+)?/.test(line);
  }

  /**
   * Извлекает числовые данные из строки
   */
  private extractNumericData(line: string): {
    quantity?: number;
    unit?: string;
    price?: number;
    totalCost?: number;
  } {
    const match = line.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z]*)\s*(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/);
    
    if (match) {
      const [, quantity, unit, price, total] = match;
      return {
        quantity: this.parseNumber(quantity),
        unit: unit || undefined,
        price: this.parseNumber(price),
        totalCost: this.parseNumber(total)
      };
    }
    
    return {};
  }
}