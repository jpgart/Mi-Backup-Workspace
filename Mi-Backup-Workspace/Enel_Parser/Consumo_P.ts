import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

const inputDir = path.join(process.cwd(), '../my-liteparse-project/data/output_json');
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));

interface ConsumoPData {
  archivo: string;
  n_factura: string;
  concepto: string;
  medida_parentesis: string;
  gasto_clp: string;
}

const parsedConsumos: ConsumoPData[] = [];

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

  // Extraer Factura N° para tener contexto
  let n_factura = '';
  const factMatch = fullText.match(/FACTURA ELECTRÓNICA[\s\n]+(\d{6,10})/);
  if (factMatch) n_factura = factMatch[1];
  else {
     const nMatchAlt = fullText.match(/N°\s*(\d{6,10})/);
     if (nMatchAlt) n_factura = nMatchAlt[1];
  }

  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let inItemZone = false;
  for (const line of lines) {
    if (line.includes("INDEFINIDO") || line.match(/^\d{2}\/\d{2}\/\d{4}$/) || line.match(/LO BOZA/)) {
      inItemZone = true; // Aproximamos el comienzo de los cobros dinámicos
    }
    // Ya no rompemos en 'Total Monto Neto' para permitir extraer los totales

    if (inItemZone || (!inItemZone && parseFloat(line) > 0)) {
        // Expresión para: Palabra(s), una cantidad opcional (para kWh) -> grandes espacios -> un numero de monto (Ej. 2.866.744)
        const itemRegex = /^([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\.\,\-\(\)\s\d\+\%]+?)\s+(\d{1,3}(?:\.\d{3})*)(?:\s|$)/;
        const match = line.match(itemRegex);
        if (match) {
            let descFull = match[1].trim();
            let gasto = match[2];
            
            // Filtros de Falsos Positivos
            const excludes = ["OJOS", "SANTIAGO", "FACTURA", "COMERCIAL", "Timbre"];
            const isInvalid = excludes.some(ex => descFull.toLowerCase().includes(ex.toLowerCase()));
            
            if (descFull.length > 5 && !isInvalid && !descFull.match(/^\d+$/)) {
                let medida = "";
                let concepto = descFull;
                
                // Rescatar datos entre paréntesis
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
  } // Fin del for (const line of lines)

  // Extraer el "Total Real" del texto JSON 
  let totalRealStr = "0";
  // Buscamos "Total a pagar", si no está buscamos "Monto Total"
  const matchPagar = fullText.match(/Total a pagar[\s\n]+([\d\.]+)/i);
  if (matchPagar) {
      totalRealStr = matchPagar[1];
  } else {
      const matchMonto = fullText.match(/Monto Total[\s\n]+([\d\.]+)/i);
      if (matchMonto) totalRealStr = matchMonto[1];
  }
  const totalRealNum = parseInt(totalRealStr.replace(/\./g, ''), 10) || 0;

  // -- Agregar la suma total para este archivo --
  let sumaGastos = 0;
  const consumosDelArchivo = parsedConsumos.filter(c => c.archivo === file && c.n_factura === n_factura);
  for (const c of consumosDelArchivo) {
      // Para que la suma cuadre exactamente con la boleta, no debemos sumar elementos que
      // son un "Sub-total" (como el Monto Neto) porque estaríamos duplicando los valores de los ítems.
      const conceptosAExcluirDeSuma = ["Total Monto Neto", "Monto Exento", "Monto Total"];
      if (!conceptosAExcluirDeSuma.includes(c.concepto)) {
          const valorNum = parseInt(c.gasto_clp.replace(/\./g, ''), 10);
          if (!isNaN(valorNum)) {
              sumaGastos += valorNum;
          }
      }
  }

  const sumaFormateada = sumaGastos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  parsedConsumos.push({
      archivo: file,
      n_factura: n_factura,
      concepto: "Suma Gasto Real (Calculada)",
      medida_parentesis: "",
      gasto_clp: sumaFormateada
  });

  parsedConsumos.push({
      archivo: file,
      n_factura: n_factura,
      concepto: "Dato Real (Extraído de JSON)",
      medida_parentesis: "",
      gasto_clp: totalRealNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  });

  const diferencia = sumaGastos - totalRealNum;
  parsedConsumos.push({
      archivo: file,
      n_factura: n_factura,
      concepto: "Diferencia Suma vs Real",
      medida_parentesis: "",
      gasto_clp: diferencia.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  });
}

const csvPath = path.join(process.cwd(), 'Consumo_P.csv');
const csvWriter = createObjectCsvWriter({
  path: csvPath,
  header: [
    { id: 'archivo', title: 'Archivo Fuente' },
    { id: 'n_factura', title: 'N° Factura' },
    { id: 'concepto', title: 'Concepto' },
    { id: 'medida_parentesis', title: 'Dato Medida (Paréntesis)' },
    { id: 'gasto_clp', title: 'Gasto Real (CLP)' }
  ]
});

csvWriter.writeRecords(parsedConsumos)
  .then(() => {
    console.log(`\n================================`);
    console.log(`✅ ¡Proceso Completado con Éxito!`);
    console.log(`🔌 Rescatadas ${parsedConsumos.length} filas de consumos y gastos.`);
    console.log(`💾 Los datos se exportaron a: ${csvPath}`);
    console.log(`================================\n`);
  });
