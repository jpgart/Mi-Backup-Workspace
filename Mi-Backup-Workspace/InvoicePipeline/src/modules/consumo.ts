import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { extractFullText, getCleanLines, extractFacturaNumber } from '../utils/textExtractor';
import { formatCLP } from '../utils/formatters';
import { OUTPUT_FILES } from '../config';

/**
 * Módulo de extracción de consumo detallado.
 * Genera Consumo_P.csv con desglose de cada concepto de cobro.
 * Basado en Consumo_P.ts original del Enel_Parser, parametrizado.
 */

interface ConsumoPData {
  archivo: string;
  n_factura: string;
  concepto: string;
  medida_parentesis: string;
  gasto_clp: string;
}

export interface ConsumoResult {
  totalRows: number;
}

/**
 * Procesa los consumos detallados de todos los JSON en una carpeta.
 * 
 * @param jsonDir - Carpeta con los archivos JSON
 * @param outputDir - Carpeta donde guardar el CSV (usualmente la subcarpeta csv/)
 * @param clientProjectName - Nombre del cliente para la nomenclatura
 */
export async function procesarConsumo(jsonDir: string, outputDir: string, clientProjectName: string): Promise<ConsumoResult> {
  const files = fs.readdirSync(jsonDir).filter((f: string) => f.endsWith('.json'));
  const parsedConsumos: ConsumoPData[] = [];

  for (const file of files) {
    const dataPath = path.join(jsonDir, file);
    const jsonContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const fullText = extractFullText(jsonContent);
    let n_factura = extractFacturaNumber(fullText);
    if (!n_factura) n_factura = 'ERROR: NO ENCONTRADA';
    
    const lines = getCleanLines(fullText);

    let inItemZone = false;
    for (const line of lines) {
      if (line.includes("INDEFINIDO") || line.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        inItemZone = true;
      }

      if (inItemZone) {
        const itemRegex = /^([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\.\,\-\(\)\s\d\+\%]+?)\s+(\d{1,3}(?:\.\d{3})*)(?:\s|$)/;
        const match = line.match(itemRegex);
        if (match) {
          let descFull = match[1].trim();
          let gasto = match[2];

          // Filtros de Falsos Positivos
          const excludes = ["OJOS", "SANTIAGO", "FACTURA", "COMERCIAL", "Timbre"];
          if (!excludes.some(ex => descFull.toLowerCase().includes(ex.toLowerCase())) && descFull.length > 5) {
            let medida = "";
            let concepto = descFull;

            const parentesisMatch = descFull.match(/\(([^)]+)\)/);
            if (parentesisMatch) {
              medida = parentesisMatch[1];
              concepto = descFull.replace(/\([^)]+\)/g, '').trim();
            }

            parsedConsumos.push({
              archivo: file,
              n_factura: n_factura,
              concepto: concepto,
              medida_parentesis: medida,
              gasto_clp: gasto
            });
          }
        }
      }
    }

    // Totales de control
    const mtotal = fullText.match(/Monto Total[\s\n]+([\d\.]+)/i);
    const totalRealNum = mtotal ? parseInt(mtotal[1].replace(/\./g, ''), 10) : 0;

    const consumosDelArchivo = parsedConsumos.filter(c => c.archivo === file && c.n_factura === n_factura);
    const sumaGastos = consumosDelArchivo.reduce((acc, c) => {
      const conceptosExcluidos = ["monto neto", "iva", "monto total", "exento"];
      if (conceptosExcluidos.some(ex => c.concepto.toLowerCase().includes(ex))) return acc;
      return acc + (parseInt(c.gasto_clp.replace(/\./g, ''), 10) || 0);
    }, 0);

    const controlData = [
      { c: "Suma Gasto Real (Calculada)", v: sumaGastos },
      { c: "Dato Real (Extraído de JSON)", v: totalRealNum },
      { c: "Diferencia Suma vs Real", v: sumaGastos - totalRealNum }
    ];

    for (const ctrl of controlData) {
      parsedConsumos.push({
        archivo: file,
        n_factura: n_factura,
        concepto: ctrl.c,
        medida_parentesis: "",
        gasto_clp: formatCLP(ctrl.v)
      });
    }
  }

  const filename = `${clientProjectName} - ${OUTPUT_FILES.CONSUMO}`;
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, filename),
    header: [
      { id: 'n_factura', title: 'N° Factura' },
      { id: 'archivo', title: 'Archivo Fuente' },
      { id: 'concepto', title: 'Concepto' },
      { id: 'medida_parentesis', title: 'Dato Medida (Paréntesis)' },
      { id: 'gasto_clp', title: 'Gasto Real (CLP)' }
    ]
  });

  await csvWriter.writeRecords(parsedConsumos);
  console.log(`   📋 Consumo: ${parsedConsumos.length} filas de consumos y gastos`);

  return { totalRows: parsedConsumos.length };
}
