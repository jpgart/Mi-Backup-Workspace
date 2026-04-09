import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

// Leer directamente la carpeta de JSON generada
const inputDir = path.join(process.cwd(), '../my-liteparse-project/data/output_json');
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));

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

const allItemsSet = new Set<string>();
const parsedData: InvoiceData[] = [];
const parsedMedidores: MedidorData[] = [];

for (const file of files) {
  const dataPath = path.join(inputDir, file);
  const jsonContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Consolidar el 'text' de todas las páginas
  let fullText = '';
  if (jsonContent.pages) {
    for (const page of jsonContent.pages) {
      if (page.text) fullText += page.text + '\n';
      else if (page.objects) { 
         fullText += page.objects.map((o: any) => o.text || o.str).join(' ');
      }
    }
  } else if (jsonContent.text) {
     fullText = jsonContent.text;
  }
  
  if (!fullText) fullText = JSON.stringify(jsonContent);

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

  // Extraer RUT (Excluyendo el de Enel)
  const rutsMatch = fullText.match(/\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/g);
  if (rutsMatch) {
    const clientRuts = rutsMatch.filter(r => !r.includes("93.913.000"));
    if (clientRuts.length > 0) invoice.rut = clientRuts[0];
  }

  // Extraer Factura N°
  const factMatch = fullText.match(/FACTURA ELECTRÓNICA[\s\n]+(\d{6,10})/);
  if (factMatch) invoice.n_factura = factMatch[1];
  else {
     const nMatchAlt = fullText.match(/N°\s*(\d{6,10})/);
     if (nMatchAlt) invoice.n_factura = nMatchAlt[1];
  }

  // Extraer N° Cliente (Un número como 1338543-2 que anda flotando)
  const clientNumMatch = fullText.match(/\b([1-9]\d{5,7}-\d)\b/); 
  if (clientNumMatch && clientNumMatch[1] !== invoice.rut) invoice.n_cliente = clientNumMatch[1];

  // Fechas (Normalmente la primera fecha con formato DD/MM/YYYY es de emisión)
  const dates = fullText.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  if (dates.length > 0) invoice.fecha_emision = dates[0]; 

  // Heurística Específica para Nombre de Cliente
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (let i = 0; i < lines.length; i++) {
    if (invoice.rut && lines[i].includes(invoice.rut)) {
      let maybeClient = lines[i].replace(invoice.rut, '').trim();
      if ((maybeClient.length < 5 || maybeClient.match(/^[\d\s]+$/)) && i > 0) {
        maybeClient = lines[i-1];
      }
      invoice.cliente = maybeClient.replace(/\s+/g, ' ').replace(/\d{2}\.\d{3}\.\d{3}-\d/, '').trim();
      break;
    }
  }
  // Si no obtuvo cliente pero tenemos INDUSTRIA MECANICA, forzamos
  if(!invoice.cliente || invoice.cliente.includes("Y RUT")) {
     const maybeVogt = lines.find(l => l.includes("INDUSTRIA MECANICA"));
     if (maybeVogt) invoice.cliente = "INDUSTRIA MECANICA VOGT S.A.";
  }

  // Extraer Totales Exactos
  const neto = fullText.match(/Total Monto Neto\s+([\d\.]+)/i);
  if (neto) invoice.total_monto_neto = neto[1];

  // IVA - saltar "(19%)"
  const iva = fullText.match(/Total I\.V\.A\.[\s\S]{1,10}?([\d\.]+)/i);
  if (iva && iva[1] === "19" || iva && iva[1] === "19.") {
      const ivaVal = fullText.match(/Total I\.V\.A\.\s*\(19\%\)\s+([\d\.]+)/i);
      if (ivaVal) invoice.total_iva = ivaVal[1];
  } else if (iva) {
      invoice.total_iva = iva[1];
  }

  const exento = fullText.match(/Monto Exento\s+([\d\.]+)/i);
  if (exento) invoice.monto_exento = exento[1];

  const mtotal = fullText.match(/Monto Total\s+([\d\.]+)/i);
  if (mtotal) invoice.monto_total = mtotal[1];

  // Extracción Dinámica de Items de Cobro
  // Evitamos capturar líneas de texto que no son cobros mediante banderas heurísticas
  let inItemZone = false;
  for (const line of lines) {
    if (line.includes("INDEFINIDO") || line.match(/^\d{2}\/\d{2}\/\d{4}$/) || line.match(/LO BOZA/)) {
      inItemZone = true; // Aproximamos el comienzo de los cobros dinámicos
    }
    if (line.match(/Total Monto Neto/i) || line.match(/Monto Total/i)) {
      break; // Zona de items terminada
    }

    if (inItemZone || (!inItemZone && parseFloat(line) > 0)) {
        // Expresión para: Palabra(s), una cantidad opcional (para kWh) -> grandes espacios -> un numero de monto
        const itemRegex = /^([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\.\(\)\s\d\+]+?)\s+(\d{1,3}(?:\.\d{3})*)(?:\s|$)/;
        const match = line.match(itemRegex);
        if (match) {
            let desc = match[1].trim();
            let value = match[2];
            
            // Filtros de Falsos Positivos
            const excludes = ["Total", "OJOS", "SANTIAGO", "FACTURA", "COMERCIAL"];
            const isInvalid = excludes.some(ex => desc.includes(ex));
            
            // Remover las mediciones entre paréntesis (ej: "(45600kWh)") para que no se duplique esta info con la tabla Medidores
            desc = desc.replace(/\s*\([\d\.,\s]+[a-zA-Z]+\)/g, '').trim();
            
            if (desc.length > 5 && !isInvalid && !desc.match(/^\d+$/)) {
                invoice[desc] = value;
                allItemsSet.add(desc); // Agregamos a los headers globales
            }
        }
    }
  }
  
  // Extraer Tabla de Medidores
  for (const line of lines) {
    const medRegex = /^([0-9A-Z]{6,15})\s+([a-zA-ZñÑáéíóúÁÉÍÓÚ]+)\s+([\d\,\.]+)\s+([\d\,\.]+)\s+([\d\,\.]+)\s+(\d+)(?:\s|$)/;
    const medMatch = line.match(medRegex);
    if(medMatch) {
        parsedMedidores.push({
           archivo: file,
           n_factura: invoice.n_factura,
           n_medidor: medMatch[1],
           propiedad: medMatch[2],
           constante: medMatch[3],
           lectura_anterior: medMatch[4],
           lectura_actual: medMatch[5],
           consumo: medMatch[6]
        });
    }
  }

  parsedData.push(invoice);
}
// Generación de Columnas Maestras
const headers = [
  { id: 'archivo', title: 'Archivo Fuente' },
  { id: 'cliente', title: 'Nombre Cliente' },
  { id: 'rut', title: 'R.U.T Cliente' },
  { id: 'n_cliente', title: 'N° Cliente (Enel)' },
  { id: 'n_factura', title: 'N° de Factura' },
  { id: 'fecha_emision', title: 'Fecha Emisión' },
  { id: 'total_monto_neto', title: 'Factura: Monto Neto' },
  { id: 'total_iva', title: 'Factura: I.V.A.' },
  { id: 'monto_exento', title: 'Factura: Monto Exento' },
  { id: 'monto_total', title: 'Factura: Monto Total' }
];

// Agregamos las columnas dinámicas (los items)
allItemsSet.forEach(item => {
   headers.push({ id: item, title: `Item: ${item}` });
});

const csvPath = path.join(process.cwd(), 'Consolidado.csv');
const csvWriter = createObjectCsvWriter({
  path: csvPath,
  header: headers
});

csvWriter.writeRecords(parsedData)
  .then(() => {
    
    // Escribir el segundo CSV de Medidores
    const csvMedidoresWriter = createObjectCsvWriter({
      path: path.join(process.cwd(), 'Medidores.csv'),
      header: [
        { id: 'archivo', title: 'Archivo Fuente' },
        { id: 'n_factura', title: 'N° Factura' },
        { id: 'n_medidor', title: 'N° Medidor' },
        { id: 'propiedad', title: 'Propiedad' },
        { id: 'constante', title: 'Constante' },
        { id: 'lectura_anterior', title: 'Lectura Anterior' },
        { id: 'lectura_actual', title: 'Lectura Actual' },
        { id: 'consumo', title: 'Consumo kWh' }
      ]
    });

    csvMedidoresWriter.writeRecords(parsedMedidores).then(() => {
        console.log(`\n================================`);
        console.log(`✅ ¡Parseo Completado con Éxito!`);
        console.log(`📂 Rescatados ${parsedData.length} facturas.`);
        console.log(`🔌 Rescatados ${parsedMedidores.length} registros de medidores.`);
        console.log(`📊 Total columnas dinámicas facturas: ${headers.length}`);
        console.log(`💾 Las Facturas se exportaron a: ${csvPath}`);
        console.log(`💾 Los Medidores se exportaron a: Medidores.csv`);
        console.log(`================================\n`);
    });
  });
