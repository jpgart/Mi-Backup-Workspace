import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { INPUT_PDFS_DIR, OUTPUT_ROOT_DIR, OUTPUT_SUBFOLDERS, OUTPUT_FILES } from './config';
import { parsePdfs } from './modules/pdfParser';
import { extractData } from './modules/extractor';
import { procesarConsumo } from './modules/consumo';
import { calcularReactiva } from './modules/reactiva';
import { generarResumen } from './modules/resumen';

/**
 * Punto de entrada principal del pipeline.
 */

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  📊 Pipeline de Procesamiento de Facturas Eléctricas ║');
  console.log('║  v1.1.0 — InvoicePipeline                           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(INPUT_PDFS_DIR)) {
    console.error(`❌ No se encontró el directorio de input: ${INPUT_PDFS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(INPUT_PDFS_DIR, { withFileTypes: true });
  const folders = entries.filter((e: fs.Dirent) => e.isDirectory()).map((e: fs.Dirent) => e.name);

  if (folders.length === 0) {
    console.error('❌ No hay subcarpetas en input_pdfs/');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const onlyParse = args.includes('--only-parse');
  const onlyAnalyze = args.includes('--only-analyze');

  console.log('📂 Carpetas disponibles:\n');
  folders.forEach((folder, index) => {
    const pdfCount = fs.readdirSync(path.join(INPUT_PDFS_DIR, folder))
      .filter(f => f.toLowerCase().endsWith('.pdf')).length;
    console.log(`   [${index + 1}] ${folder} (${pdfCount} PDFs)`);
  });
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const selectedIndex = await new Promise<number>((resolve) => {
    rl.question('👉 Selecciona el número de carpeta: ', (answer) => {
      const num = parseInt(answer, 10);
      if (isNaN(num) || num < 1 || num > folders.length) {
        console.error('❌ Selección inválida.');
        process.exit(1);
      }
      resolve(num - 1);
    });
  });

  const selectedFolder = folders[selectedIndex];
  
  // Preguntar el nombre del cliente
  const clientName = await new Promise<string>((resolve) => {
    rl.question(`👤 Ingrese el nombre del cliente [Default: ${selectedFolder}]: `, (answer) => {
      rl.close();
      resolve(answer.trim() || selectedFolder);
    });
  });

  const inputFolder = path.join(INPUT_PDFS_DIR, selectedFolder);
  const outputBase = path.join(OUTPUT_ROOT_DIR, selectedFolder);
  const jsonDir = path.join(outputBase, OUTPUT_SUBFOLDERS.JSON);
  const csvDir = path.join(outputBase, OUTPUT_SUBFOLDERS.CSV);

  console.log(`\n🎯 Proyecto: ${clientName}`);
  console.log(`   📂 Carpeta PDF: ${selectedFolder}`);
  console.log(`   📁 Salida:      ${outputBase}`);

  // Asegurar directorios
  [outputBase, jsonDir, csvDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const startTime = Date.now();

  // FASE 1: Parseo
  if (!onlyAnalyze) {
    console.log('\n' + '═'.repeat(60));
    console.log(`FASE 1: Parseo de PDFs → JSON (Carpeta: ${selectedFolder})`);
    console.log('═'.repeat(60));

    const parseResult = await parsePdfs(inputFolder, jsonDir, clientName);
    console.log(`\n   ✅ Parseo completado: ${parseResult.successCount}/${parseResult.totalFiles} archivos`);
  }

  if (onlyParse) {
    console.log('\n✅ Pipeline detenido después del parseo.');
    return;
  }

  // FASE 2: Extracción Consolidada
  console.log('\n' + '═'.repeat(60));
  console.log('FASE 2: Extracción y Consenso de Datos');
  console.log('═'.repeat(60) + '\n');
  const extractResult = await extractData(jsonDir, csvDir, clientName);

  // FASE 3: Consumo Detallado
  console.log('\n' + '═'.repeat(60));
  console.log('FASE 3: Análisis de Consumo Detallado');
  console.log('═'.repeat(60) + '\n');
  const consumoResult = await procesarConsumo(jsonDir, csvDir, clientName);

  // FASE 4: Energía Reactiva
  console.log('\n' + '═'.repeat(60));
  console.log('FASE 4: Análisis de Potencia y Factor de Potencia');
  console.log('═'.repeat(60) + '\n');
  const reactivaResult = await calcularReactiva(csvDir, clientName);

  // FASE 5: Resumen Analítico
  console.log('\n' + '═'.repeat(60));
  console.log('FASE 5: Consolidación y Verificaciones Analíticas');
  console.log('═'.repeat(60) + '\n');
  const resumenResult = await generarResumen(csvDir, clientName);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║               📊 REPORTE FINAL v1.1                  ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  👤 Cliente:    ${clientName.padEnd(37)}║`);
  console.log(`║  📄 Facturas:   ${extractResult.invoiceCount.toString().padEnd(37)}║`);
  console.log(`║  🔌 Medidores:  ${extractResult.medidorCount.toString().padEnd(37)}║`);
  console.log(`║  ⚡ Multas FP:  ${reactivaResult.multaCount.toString().padEnd(37)}║`);
  console.log(`║  ⚠️  Alertas:    ${resumenResult.alertCount.toString().padEnd(37)}║`);
  console.log(`║  ⏱️  Tiempo:     ${(elapsed + 's').padEnd(37)}║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  📁 Resultados en:                                   ║');
  console.log(`║     ${csvDir.replace(process.env.HOME || '', '~')}`);
  console.log('║                                                      ║');
  console.log(`║  • ${clientName} - Consolidado.csv   ║`);
  console.log(`║  • ${clientName} - Resumen_Cliente.csv ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  console.error('\n❌ Error fatal en el pipeline:', err);
  process.exit(1);
});
