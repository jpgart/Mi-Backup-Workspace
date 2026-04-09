import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { extractFullText, getCleanLines, extractFacturaNumber } from '../utils/textExtractor';
import { OUTPUT_FILES } from '../config';

/**
 * Módulo de extracción de datos de factura.
 * Genera Consolidado.csv y Medidores.csv a partir de los JSON parseados.
 * Basado en el extractor.ts original del Enel_Parser, parametrizado.
 */

interface InvoiceData {
  archivo: string;
  cliente: string;
  rut: string;
  n_factura: string;
  n_cliente: string;
  fecha_emision: string;
  total_monto_neto: string;
  total_iva: string;
  monto_exento: string;
  monto_total: string;
  [key: string]: string; // Para los items dinámicos
}

interface MedidorData {
  archivo: string;
  n_factura: string;
  n_medidor: string;
  propiedad: string;
  constante: string;
  lectura_anterior: string;
  lectura_actual: string;
  consumo: string;
}

export interface ExtractorResult {
  invoiceCount: number;
  medidorCount: number;
  dynamicColumns: number;
}

/**
 * Extrae datos consolidados y de medidores desde los JSON parseados.
 * 
 * @param jsonDir - Carpeta que contiene los archivos JSON
 * @param outputDir - Carpeta donde guardar los CSV (usualmente la subcarpeta csv/)
 * @param clientProjectName - Nombre del cliente/proyecto confirmado por el usuario
 */
export async function extractData(jsonDir: string, outputDir: string, clientProjectName: string): Promise<ExtractorResult> {
  const files = fs.readdirSync(jsonDir).filter((f: string) => f.endsWith('.json'));

  const allItemsSet = new Set<string>();
  const parsedData: InvoiceData[] = [];
  const parsedMedidores: MedidorData[] = [];

  // Almacenes para el consenso
  const nameCounts: Record<string, number> = {};
  const rutCounts: Record<string, number> = {};

  for (const file of files) {
    const dataPath = path.join(jsonDir, file);
    const jsonContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const fullText = extractFullText(jsonContent);
    const lines = getCleanLines(fullText);

    const invoice: InvoiceData = {
      archivo: file,
      cliente: '',
      rut: '',
      n_factura: '',
      n_cliente: '',
      fecha_emision: '',
      total_monto_neto: '',
      total_iva: '',
      monto_exento: '',
      monto_total: ''
    };

    // Extraer RUT (Usando la nueva utilidad robusta si estuviera disponible, o lógica local mejorada)
    const rutsMatch = fullText.match(/\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/g);
    if (rutsMatch) {
      // Filtrar RUT de Enel y limpiar puntos
      const clientRuts = rutsMatch
        .map(r => r.replace(/\./g, ''))
        .filter(r => !r.includes("93913000"));
      
      if (clientRuts.length > 0) {
        invoice.rut = clientRuts[0];
        rutCounts[invoice.rut] = (rutCounts[invoice.rut] || 0) + 1;
      }
    }

    // Extraer Factura N°
    invoice.n_factura = extractFacturaNumber(fullText);

    // Extraer N° Cliente (Enel)
    const clientNumMatch = fullText.match(/\b([1-9]\d{5,7}-\d)\b/);
    if (clientNumMatch && clientNumMatch[1] !== invoice.rut) invoice.n_cliente = clientNumMatch[1];

    // Fechas
    const dates = fullText.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    if (dates && dates.length > 0) invoice.fecha_emision = dates[0] || '';

    // Heurística para Nombre de Cliente
    let rawName = '';
    for (let i = 0; i < lines.length; i++) {
       // Buscar líneas que contengan "Señor(es)" o la palabra "INDUSTRIA" (comun en este cliente)
       if (lines[i].includes("Señor(es)") || lines[i].includes("INDUSTRIA")) {
         rawName = lines[i].replace(/.*Señor\(es\):?\s*/i, '').replace(invoice.rut || '', '').trim();
         // Si la línea quedó muy corta, probar la siguiente o anterior
         if (rawName.length < 5) rawName = lines[i+1] || lines[i-1] || '';
         break;
       }
    }
    
    if (rawName) {
      // Limpiar ruidos comunes
      invoice.cliente = rawName.replace(/R\.U\.T.*/i, '').replace(/\s+/g, ' ').trim();
      nameCounts[invoice.cliente] = (nameCounts[invoice.cliente] || 0) + 1;
    }

    // Extraer Totales Exactos
    const neto = fullText.match(/Total Monto Neto\s+([\d\.]+)/i);
    if (neto) invoice.total_monto_neto = neto[1];

    const ivaMatch = fullText.match(/Total I\.V\.A\.\s*\(19\%\)\s+([\d\.]+)/i) || fullText.match(/Total I\.V\.A\.\s+([\d\.]+)/i);
    if (ivaMatch) invoice.total_iva = ivaMatch[1];

    const exento = fullText.match(/Monto Exento\s+([\d\.]+)/i);
    if (exento) invoice.monto_exento = exento[1];

    const mtotal = fullText.match(/Monto Total\s+([\d\.]+)/i);
    if (mtotal) invoice.monto_total = mtotal[1];

    // Extracción Dinámica de Items de Cobro
    let inItemZone = false;
    for (const line of lines) {
      if (line.includes("INDEFINIDO") || line.match(/^\d{2}\/\d{2}\/\d{4}$/)) inItemZone = true;
      if (line.match(/Total Monto Neto/i)) break;

      if (inItemZone) {
        const itemRegex = /^([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\.\(\)\s\d\+]{5,})\s+(\d{1,3}(?:\.\d{3})*)(?:\s|$)/;
        const match = line.match(itemRegex);
        if (match) {
          let desc = match[1].trim();
          desc = desc.replace(/\s*\([\d\.,\s]+[a-zA-Z]+\)/g, '').trim();
          if (!["Total", "FACTURA", "COMERCIAL"].some(ex => desc.includes(ex))) {
            invoice[desc] = match[2];
            allItemsSet.add(desc);
          }
        }
      }
    }

    // Extraer Tabla de Medidores (Robustecido Final)
    let lastMedId = "";
    let lastProp = "";

    for (let line of lines) {
      // Limpiar ruidos
      line = line.replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑ]/g, ' ');
      
      // Regex que busca específicamente el patrón de [Constante] [Anterior] [Actual] [Consumo]
      // Esto aparece en ambas líneas (la que tiene ID y la que no)
      const metricsRegex = /([\d\.]+,\d{2,3})\s+([\d\.]+,\d{2,3})\s+([\d\.]+,\d{2,3})\s+(\d+)/;
      const metricsMatch = line.match(metricsRegex);
      
      if (metricsMatch) {
         // Verificamos si esta línea también tiene el ID del medidor al principio
         const idRegex = /([0-9A-Z]{6,15})\s+([a-zA-ZñÑáéíóúÁÉÍÓÚ]+)/;
         const idMatch = line.match(idRegex);
         
         if (idMatch) {
           lastMedId = idMatch[1];
           lastProp = idMatch[2];
         }
         
         if (lastMedId) {
            parsedMedidores.push({
              archivo: file,
              n_factura: invoice.n_factura || 'ERROR',
              n_medidor: lastMedId,
              propiedad: lastProp,
              constante: metricsMatch[1],
              lectura_anterior: metricsMatch[2],
              lectura_actual: metricsMatch[3],
              consumo: metricsMatch[4]
            });
         }
      }
    }

    parsedData.push(invoice);
  }

  // APLICAR CONSENSO (Moda)
  const consensusName = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || clientProjectName;
  const consensusRut = Object.entries(rutCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  parsedData.forEach(inv => {
    inv.cliente = consensusName;
    inv.rut = consensusRut;
    if (!inv.n_factura) inv.n_factura = 'ERROR: NO ENCONTRADA';
  });

  // Generación de Columnas Maestras
  const headers = [
    { id: 'archivo', title: 'Archivo Fuente' },
    { id: 'cliente', title: 'Nombre Cliente' },
    { id: 'rut', title: 'R.U.T Cliente' },
    { id: 'n_cliente', title: 'N° Cliente (Enel)' },
    { id: 'n_factura', title: 'N° Factura' },
    { id: 'fecha_emision', title: 'Fecha Emisión' },
    { id: 'total_monto_neto', title: 'Factura: Monto Neto' },
    { id: 'total_iva', title: 'Factura: I.V.A.' },
    { id: 'monto_exento', title: 'Factura: Monto Exento' },
    { id: 'monto_total', title: 'Factura: Monto Total' }
  ];

  allItemsSet.forEach(item => {
    headers.push({ id: item, title: `Item: ${item}` });
  });

  // Naming: [Cliente] - [Tipo].csv
  const consolidadoFilename = `${clientProjectName} - ${OUTPUT_FILES.CONSOLIDADO}`;
  const medidoresFilename = `${clientProjectName} - ${OUTPUT_FILES.MEDIDORES}`;

  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, consolidadoFilename),
    header: headers
  });

  await csvWriter.writeRecords(parsedData);

  const csvMedidoresWriter = createObjectCsvWriter({
    path: path.join(outputDir, medidoresFilename),
    header: [
      { id: 'n_factura', title: 'N° Factura' },
      { id: 'archivo', title: 'Archivo Fuente' },
      { id: 'n_medidor', title: 'N° Medidor' },
      { id: 'propiedad', title: 'Propiedad' },
      { id: 'constante', title: 'Constante' },
      { id: 'lectura_anterior', title: 'Lectura Anterior' },
      { id: 'lectura_actual', title: 'Lectura Actual' },
      { id: 'consumo', title: 'Consumo kWh' }
    ]
  });

  await csvMedidoresWriter.writeRecords(parsedMedidores);

  console.log(`   📊 Consolidado: ${parsedData.length} facturas (Consenso: ${consensusName})`);
  console.log(`   🔌 Medidores: ${parsedMedidores.length} registros`);

  return {
    invoiceCount: parsedData.length,
    medidorCount: parsedMedidores.length,
    dynamicColumns: headers.length
  };
}
