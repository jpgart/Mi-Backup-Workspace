import * as fs from 'fs';

/**
 * Utilidades para lectura y escritura de archivos CSV.
 */

/**
 * Parsea una línea CSV respetando comillas (campos con comas internas).
 * Basada en la función parseLine del calculoReactiva.ts original.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Lee un archivo CSV y retorna un array de objetos con clave = header, valor = celda.
 */
export function readCsvAsObjects(csvPath: string): Record<string, string>[] {
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const content = fs.readFileSync(csvPath, 'utf-8').trim();
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || '';
    }
    records.push(record);
  }

  return records;
}
