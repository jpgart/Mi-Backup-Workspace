import * as fs from 'fs';
import * as path from 'path';

/**
 * Módulo de parseo de PDFs usando LiteParse.
 * Solo conserva la primera página de cada PDF.
 */

export interface ParseResult {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

/**
 * Parsea todos los PDFs de una carpeta y guarda los JSON en el directorio de output.
 * Solo conserva la primera página de cada PDF.
 * 
 * @param inputFolder - Ruta absoluta a la carpeta con PDFs
 * @param outputFolder - Ruta absoluta a la carpeta de salida para JSON
 * @param clientName - Nombre del cliente para la nomenclatura
 */
export async function parsePdfs(inputFolder: string, outputFolder: string, clientName: string): Promise<ParseResult> {
  // Importar LiteParse dinámicamente
  const { LiteParse } = await import('@llamaindex/liteparse');

  const parser = new LiteParse({
    ocrEnabled: true,
    ocrLanguage: 'spa',
    numWorkers: 2,
    dpi: 300,
    outputFormat: 'json',
    targetPages: '1',
    preserveVerySmallText: true,
    preserveLayoutAlignmentAcrossPages: true,
    preciseBoundingBox: true
  });

  // Asegurar que el directorio de output existe
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const files = fs.readdirSync(inputFolder).filter((f: string) => f.toLowerCase().endsWith('.pdf'));
  const result: ParseResult = {
    totalFiles: files.length,
    successCount: 0,
    errorCount: 0,
    errors: []
  };

  console.log(`\n📄 Fase 1: Parseo de PDFs → JSON (Cliente: ${clientName})`);
  console.log(`   Solo se conservará la PRIMERA PÁGINA de cada PDF.\n`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = path.join(inputFolder, file);
    const baseName = file.replace(/\.pdf$/i, '');
    const jsonFilename = `${baseName} - ${clientName}.json`;
    const outputPath = path.join(outputFolder, jsonFilename);

    // Si el JSON ya existe, saltar
    if (fs.existsSync(outputPath)) {
      console.log(`   ⏭️  [${i + 1}/${files.length}] ${file} — ya existe, saltando.`);
      result.successCount++;
      continue;
    }

    try {
      console.log(`   📄 [${i + 1}/${files.length}] Parseando ${file}...`);
      const parseResult = await parser.parse(inputPath);

      // FILTRAR: Solo conservar la primera página
      const filteredResult = filterFirstPage(parseResult);

      fs.writeFileSync(outputPath, JSON.stringify(filteredResult, null, 2));
      console.log(`   ✅ [${i + 1}/${files.length}] ${file} → ${jsonFilename}`);
      result.successCount++;
    } catch (error) {
      const errorMsg = `Error parseando ${file}: ${error}`;
      console.error(`   ❌ [${i + 1}/${files.length}] ${errorMsg}`);
      result.errors.push(errorMsg);
      result.errorCount++;
    }
  }

  return result;
}

/**
 * Filtra el resultado de LiteParse para conservar solo la primera página.
 * Maneja múltiples formatos de salida posibles de LiteParse.
 */
function filterFirstPage(parseResult: any): any {
  if (!parseResult) return parseResult;

  // Si tiene un array de pages, conservar solo la primera
  if (parseResult.pages && Array.isArray(parseResult.pages) && parseResult.pages.length > 0) {
    return {
      ...parseResult,
      pages: [parseResult.pages[0]],
      _pipelineNote: 'Filtrado: solo primera página conservada'
    };
  }

  // Si tiene un campo text directo, dejarlo tal cual (es un solo bloque)
  return parseResult;
}
