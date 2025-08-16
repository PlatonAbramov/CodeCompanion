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

      // Простой алгоритм извлечения табличных данных из текста
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const items: ParsedInvoiceItem[] = [];

      // Ищем строки, которые могут содержать табличные данные
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Пропускаем заголовки и пустые строки
        if (this.isHeaderLine(line) || line.length < 10) {
          continue;
        }

        // Пытаемся извлечь данные из строки
        const parsedItem = this.parseTableLine(line, i + 1);
        if (parsedItem) {
          items.push(parsedItem);
        }
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
}