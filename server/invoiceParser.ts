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
   * Парсинг документа из буфера данных
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
      
      // Lazy load PDF parser to avoid initialization issues
      if (!pdfParse) {
        const moduleLib = await import('module');
        const require = moduleLib.createRequire(import.meta.url);
        pdfParse = require('pdf-parse/lib/pdf-parse.js');
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
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
      
      // Обрабатываем по очереди, собирая описания
      let i = 0;
      while (i < dataLines.length) {
        const currentLine = dataLines[i];
        const numbersMatch = currentLine.match(/^(.+?)\s+(\d+)\s+(\d+)\s+(\d+)$/);
        
        if (numbersMatch) {
          // Это завершающая строка элемента
          const [, textPart, quantity, price, total] = numbersMatch;
          
          // Проверяем, есть ли номер в начале текста
          const positionMatch = textPart.match(/^(\d+)\s+(.+)/);
          
          if (positionMatch) {
            // Однострочный элемент: "2 Демонтаж и монтаж затирки 1 1500 1500"
            const position = parseInt(positionMatch[1]);
            const description = positionMatch[2].trim();
            
            items.push({
              position,
              name: description,
              quantity: this.parseNumber(quantity)!,
              unit: '',
              price: this.parseNumber(price)!,
              totalCost: this.parseNumber(total)!,
              description: description
            });
            
            console.log(`Single-line item ${position}: "${description}"`);
          } else {
            // Многострочный элемент - нужно найти предыдущую строку
            if (i > 0) {
              const prevLine = dataLines[i - 1];
              const prevPositionMatch = prevLine.match(/^(\d+)?\s*(.+)/);
              
              if (prevPositionMatch) {
                let position = 1;
                let fullDescription = '';
                
                // Если есть номер в предыдущей строке
                if (prevPositionMatch[1]) {
                  position = parseInt(prevPositionMatch[1]);
                  fullDescription = prevPositionMatch[2].trim() + ' ' + textPart.trim();
                } else {
                  // Ищем номер еще раньше или используем последовательный номер
                  position = items.length + 1;
                  fullDescription = prevLine + ' ' + textPart.trim();
                }
                
                items.push({
                  position,
                  name: fullDescription,
                  quantity: this.parseNumber(quantity)!,
                  unit: '',
                  price: this.parseNumber(price)!,
                  totalCost: this.parseNumber(total)!,
                  description: fullDescription
                });
                
                console.log(`Multi-line item ${position}: "${fullDescription}"`);
              }
            }
          }
        }
        
        i++;
      }

      return {
        success: items.length > 0,
        items,
        format: 'PDF',
        errors: items.length === 0 ? ['Не удалось найти табличные данные в PDF документе'] : undefined,
        suggestColumnMapping: items.length === 0
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
   * Парсинг PDF документа из буфера
   */
  private async parsePDFFromBuffer(buffer: Buffer): Promise<ParsedInvoiceResult> {
    try {
      console.log('PDF Parser - attempting to parse buffer, size:', buffer.length);
      
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
      console.log(`\n=== DEBUGGING PDF PARSING FROM BUFFER ===`);
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
      const dataLines: string[] = [];
      for (let i = tableStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Subtotal') || line.includes('Total') || line.includes('VAT')) {
          break;
        }
        if (line && !line.includes('Вывоз и уборка строительного мусора')) {
          dataLines.push(line);
        } else if (line.includes('Вывоз и уборка строительного мусора')) {
          dataLines.push(line);
          break;
        }
      }

      console.log('Collected data lines:', dataLines.length);

      // Парсим строки 
      let i = 0;
      while (i < dataLines.length) {
        const currentLine = dataLines[i].trim();
        
        // Ищем строку с числами в конце (количество, цена, сумма)
        const numbersMatch = currentLine.match(/^(.+?)\s+(\d+)\s+(\d+)\s+(\d+)$/);
        
        if (numbersMatch) {
          // Это завершающая строка элемента
          const [, textPart, quantity, price, total] = numbersMatch;
          
          // Проверяем, есть ли номер в начале текста
          const positionMatch = textPart.match(/^(\d+)\s+(.+)/);
          
          if (positionMatch) {
            // Однострочный элемент: "2 Демонтаж и монтаж затирки 1 1500 1500"
            const position = parseInt(positionMatch[1]);
            const description = positionMatch[2].trim();
            
            items.push({
              position,
              name: description,
              quantity: this.parseNumber(quantity)!,
              unit: '',
              price: this.parseNumber(price)!,
              totalCost: this.parseNumber(total)!,
              description: description
            });
            
            console.log(`Single-line item ${position}: "${description}"`);
          } else {
            // Многострочный элемент - нужно найти предыдущую строку
            if (i > 0) {
              const prevLine = dataLines[i - 1];
              const prevPositionMatch = prevLine.match(/^(\d+)?\s*(.+)/);
              
              if (prevPositionMatch) {
                let position = 1;
                let fullDescription = '';
                
                // Если есть номер в предыдущей строке
                if (prevPositionMatch[1]) {
                  position = parseInt(prevPositionMatch[1]);
                  fullDescription = prevPositionMatch[2].trim() + ' ' + textPart.trim();
                } else {
                  // Ищем номер еще раньше или используем последовательный номер
                  position = items.length + 1;
                  fullDescription = prevLine + ' ' + textPart.trim();
                }
                
                items.push({
                  position,
                  name: fullDescription,
                  quantity: this.parseNumber(quantity)!,
                  unit: '',
                  price: this.parseNumber(price)!,
                  totalCost: this.parseNumber(total)!,
                  description: fullDescription
                });
                
                console.log(`Multi-line item ${position}: "${fullDescription}"`);
              }
            }
          }
        }
        
        i++;
      }

      return {
        success: items.length > 0,
        items,
        format: 'PDF',
        errors: items.length === 0 ? ['Не удалось найти табличные данные в PDF документе'] : undefined,
        suggestColumnMapping: items.length === 0
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
      const workbook = XLSX.readFile(filePath);
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

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] as any[];
        if (!row || row.length === 0 || row.every(cell => !cell)) {
          continue;
        }

        const item: ParsedInvoiceItem = {
          position: i,
          name: this.getCellValue(row, columnMap.name) || `Позиция ${i}`,
          quantity: this.parseNumber(this.getCellValue(row, columnMap.quantity)),
          unit: this.getCellValue(row, columnMap.unit),
          price: this.parseNumber(this.getCellValue(row, columnMap.price)),
          totalCost: this.parseNumber(this.getCellValue(row, columnMap.totalCost)),
          description: this.getCellValue(row, columnMap.description)
        };

        // Если общая стоимость не указана, рассчитываем
        if (!item.totalCost && item.quantity && item.price) {
          item.totalCost = item.quantity * item.price;
        }

        items.push(item);
      }

      return {
        success: items.length > 0,
        items,
        format: 'XLSX',
        errors: items.length === 0 ? ['Не удалось извлечь данные из Excel файла'] : undefined,
        suggestColumnMapping: columnMap.name === -1, // Если не нашли колонку с наименованием
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
    return new Promise((resolve) => {
      const items: ParsedInvoiceItem[] = [];
      const errors: string[] = [];
      let headers: string[] = [];
      let isFirstRow = true;

      fs.createReadStream(filePath)
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
    if (columnIndex === -1 || !row[columnIndex]) return undefined;
    return String(row[columnIndex]).trim();
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

  /**
   * Парсинг Excel документа из буфера
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
        };
      }

      // Ищем строку с заголовками
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const row = rawData[i] as any[];
        if (row && this.isHeaderRow(row)) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        return {
          success: false,
          items: [],
          format: 'XLSX',
          errors: ['Не удалось найти заголовки таблицы в Excel файле'],
          suggestColumnMapping: true,
          rawData: rawData.slice(0, 10) // Показываем первые 10 строк
        };
      }

      const headers = rawData[headerRowIndex] as any[];
      const columnMap = this.detectColumnMapping(headers);

      if (!columnMap.name && !columnMap.quantity && !columnMap.price) {
        return {
          success: false,
          items: [],
          format: 'XLSX',
          errors: ['Не удалось автоматически определить колонки. Проверьте заголовки таблицы.'],
          suggestColumnMapping: true,
          rawData: rawData.slice(0, 10)
        };
      }

      const items: ParsedInvoiceItem[] = [];
      let position = 1;

      // Обрабатываем строки данных
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i] as any[];
        
        if (!row || row.length === 0) continue;
        
        // Пропускаем пустые строки
        const hasData = row.some(cell => cell !== undefined && cell !== null && cell !== '');
        if (!hasData) continue;

        const item: ParsedInvoiceItem = {
          position,
          name: this.getCellValue(row, columnMap.name) || `Позиция ${position}`,
          quantity: this.parseNumber(this.getCellValue(row, columnMap.quantity)),
          unit: this.getCellValue(row, columnMap.unit),
          price: this.parseNumber(this.getCellValue(row, columnMap.price)),
          totalCost: this.parseNumber(this.getCellValue(row, columnMap.totalCost)),
          description: this.getCellValue(row, columnMap.description)
        };

        // Рассчитываем общую стоимость если не указана
        if (!item.totalCost && item.quantity && item.price) {
          item.totalCost = item.quantity * item.price;
        }

        items.push(item);
        position++;
      }

      return {
        success: items.length > 0,
        items,
        format: 'XLSX',
        errors: items.length === 0 ? ['Не найдено строк с данными в Excel файле'] : undefined
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
   * Парсинг CSV документа из буфера
   */
  private async parseCSVFromBuffer(buffer: Buffer): Promise<ParsedInvoiceResult> {
    try {
      const csvText = buffer.toString('utf8');
      
      return new Promise((resolve) => {
        const results: any[] = [];
        const stream = require('stream');
        const readable = new stream.Readable();
        readable.push(csvText);
        readable.push(null);
        
        readable
          .pipe(csvParser())
          .on('data', (data: any) => results.push(data))
          .on('end', () => {
            if (results.length === 0) {
              resolve({
                success: false,
                items: [],
                format: 'CSV',
                errors: ['CSV файл пустой или не содержит данных']
              });
              return;
            }

            const headers = Object.keys(results[0]);
            const columnMap = this.detectColumnMapping(headers);

            if (!columnMap.name && !columnMap.quantity && !columnMap.price) {
              resolve({
                success: false,
                items: [],
                format: 'CSV',
                errors: ['Не удалось автоматически определить колонки в CSV файле'],
                suggestColumnMapping: true,
                rawData: results.slice(0, 10)
              });
              return;
            }

            const items: ParsedInvoiceItem[] = [];
            let position = 1;

            for (const row of results) {
              // Пропускаем пустые строки
              const hasData = Object.values(row).some(value => value !== undefined && value !== null && value !== '');
              if (!hasData) continue;

              const item: ParsedInvoiceItem = {
                position,
                name: this.getCellValue(row, columnMap.name) || `Позиция ${position}`,
                quantity: this.parseNumber(this.getCellValue(row, columnMap.quantity)),
                unit: this.getCellValue(row, columnMap.unit),
                price: this.parseNumber(this.getCellValue(row, columnMap.price)),
                totalCost: this.parseNumber(this.getCellValue(row, columnMap.totalCost)),
                description: this.getCellValue(row, columnMap.description)
              };

              // Рассчитываем общую стоимость если не указана
              if (!item.totalCost && item.quantity && item.price) {
                item.totalCost = item.quantity * item.price;
              }

              items.push(item);
              position++;
            }

            resolve({
              success: items.length > 0,
              items,
              format: 'CSV',
              errors: items.length === 0 ? ['Не найдено строк с данными в CSV файле'] : undefined
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
   * Проверяет, является ли строка заголовком таблицы (для Excel/CSV)
   */
  private isHeaderRow(row: any[]): boolean {
    if (!row || row.length === 0) return false;
    
    const headerKeywords = [
      'наименование', 'количество', 'цена', 'стоимость', 'итого', 'единица',
      'name', 'quantity', 'price', 'cost', 'total', 'unit', '№', 'no', 'description'
    ];
    
    const rowText = row.join(' ').toLowerCase();
    return headerKeywords.some(keyword => rowText.includes(keyword));
  }

  /**
   * Получает значение ячейки по индексу
   */
  private getCellValue(row: any, index?: number): string | undefined {
    if (index === undefined || index < 0) return undefined;
    
    if (Array.isArray(row)) {
      return row[index]?.toString?.() || undefined;
    }
    
    if (typeof row === 'object') {
      const keys = Object.keys(row);
      const key = keys[index];
      return key ? row[key]?.toString?.() : undefined;
    }
    
    return undefined;
  }
}