import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { readCsvAsObjects } from '../utils/csvHelper';
import { parseCLP } from '../utils/formatters';
import { OUTPUT_FILES, FP_THRESHOLD } from '../config';

/**
 * Módulo de cálculo de energía reactiva y factor de potencia.
 * Genera Calculo_Reactiva.csv con FP calculado y estimación de multas.
 * Basado en calculoReactiva.ts original, MEJORADO con cálculo de multa en pesos.
 */

export interface ReactivaResult {
  facturaCount: number;
  multaCount: number;
}

/**
 * Calcula el Factor de Potencia y multas estimadas para cada factura.
 * 
 * @param outputDir - Carpeta que contiene los CSV (subcarpeta csv/)
 * @param clientProjectName - Nombre del cliente para la nomenclatura
 */
export async function calcularReactiva(outputDir: string, clientProjectName: string): Promise<ReactivaResult> {
  const medidoresFilename = `${clientProjectName} - ${OUTPUT_FILES.MEDIDORES}`;
  const consolidadoFilename = `${clientProjectName} - ${OUTPUT_FILES.CONSOLIDADO}`;
  const outFilename = `${clientProjectName} - ${OUTPUT_FILES.REACTIVA}`;

  const medidoresCsvPath = path.join(outputDir, medidoresFilename);
  const consolidadoCsvPath = path.join(outputDir, consolidadoFilename);
  const outCsvPath = path.join(outputDir, outFilename);

  if (!fs.existsSync(medidoresCsvPath)) {
    console.error(`   ⚠️  No existe ${medidoresFilename}, saltando cálculo de reactiva.`);
    return { facturaCount: 0, multaCount: 0 };
  }

  const medidoresRecords = readCsvAsObjects(medidoresCsvPath);
  const consolidadoRecords = fs.existsSync(consolidadoCsvPath) ? readCsvAsObjects(consolidadoCsvPath) : [];
  
  const consolidadoMap = new Map<string, Record<string, string>>();
  for (const rec of consolidadoRecords) {
    consolidadoMap.set(rec['N° Factura'] || '', rec);
  }

  interface GroupData {
    archivo: string;
    n_factura: string;
    activa: number;
    reactiva: number;
  }

  const facturas: { [key: string]: GroupData } = {};

  for (const row of medidoresRecords) {
    const archivo = row['Archivo Fuente'] || '';
    const n_factura = row['N° Factura'] || '';
    const n_medidor = row['N° Medidor'] || '';
    const consumo = parseFloat(row['Consumo kWh'] || '0');

    if (!n_factura) continue;

    const key = `${archivo}_${n_factura}`;
    if (!facturas[key]) {
      facturas[key] = { archivo, n_factura, activa: 0, reactiva: 0 };
    }

    if (n_medidor.endsWith('R')) {
      facturas[key].reactiva += consumo;
    } else {
      facturas[key].activa += consumo;
    }
  }

  const outputRecords = [];
  let multaCount = 0;

  for (const key in facturas) {
    const f = facturas[key];

    let fp = 1;
    let diferencia_fp = 0;
    let multa_porcentaje = 0;
    let multa_positiva = 'NO';
    let potencia_aparente = f.activa;

    if (f.activa > 0 || f.reactiva > 0) {
      potencia_aparente = Math.sqrt(Math.pow(f.activa, 2) + Math.pow(f.reactiva, 2));
      if (potencia_aparente > 0) {
        fp = f.activa / potencia_aparente;
      }
    }

    const fp_exact = fp;

    const consolidadoRow = consolidadoMap.get(f.n_factura);
    let facturacionEnergia = 0;
    if (consolidadoRow) {
      for (const [colTitle, colValue] of Object.entries(consolidadoRow)) {
        if (colTitle.toLowerCase().includes('electricidad consumida')) {
          facturacionEnergia = parseCLP(colValue);
          break;
        }
      }
      if (facturacionEnergia === 0) {
        facturacionEnergia = parseCLP(consolidadoRow['Factura: Monto Neto'] || '0');
      }
    }

    let multa_pesos_str = "N/A";

    if (fp_exact < FP_THRESHOLD && f.reactiva > 0) {
      multa_positiva = 'SI';
      diferencia_fp = FP_THRESHOLD - fp_exact;
      multa_porcentaje = diferencia_fp * 100;
      multaCount++;

      if (facturacionEnergia > 0) {
        const multaPesos = Math.round(facturacionEnergia * diferencia_fp);
        multa_pesos_str = multaPesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
    }

    let clasificacion_fp = 'Eficiente';
    if (fp_exact < 0.85) clasificacion_fp = 'Crítico';
    else if (fp_exact < FP_THRESHOLD) clasificacion_fp = 'Ineficiente';

    outputRecords.push({
      n_factura: f.n_factura,
      archivo: f.archivo,
      consumo_activa: f.activa.toFixed(2),
      consumo_reactiva: f.reactiva.toFixed(2),
      fp_calculado: fp_exact.toFixed(3),
      clasificacion_fp: clasificacion_fp,
      diferencia_fp: diferencia_fp > 0 ? diferencia_fp.toFixed(3) : "0.000",
      multa_porcentaje: multa_porcentaje > 0 ? multa_porcentaje.toFixed(1) + '%' : '0%',
      facturacion_energia: facturacionEnergia > 0 ? facturacionEnergia.toString() : 'N/A',
      multa_pesos: multa_pesos_str,
      multa_positiva: multa_positiva
    });
  }

  const csvWriter = createObjectCsvWriter({
    path: outCsvPath,
    header: [
      { id: 'n_factura', title: 'N° Factura' },
      { id: 'archivo', title: 'Archivo Fuente' },
      { id: 'consumo_activa', title: 'Consumo Activa (kWh)' },
      { id: 'consumo_reactiva', title: 'Consumo Reactiva (kVARh)' },
      { id: 'fp_calculado', title: 'FP Calculado' },
      { id: 'clasificacion_fp', title: 'Clasificación FP' },
      { id: 'diferencia_fp', title: 'Diferencia FP (0,93 - FP)' },
      { id: 'multa_porcentaje', title: '% Multa' },
      { id: 'facturacion_energia', title: 'Facturación Energía Base ($)' },
      { id: 'multa_pesos', title: 'Multa Estimada (Pesos)' },
      { id: 'multa_positiva', title: 'Multa Positiva?' }
    ]
  });

  await csvWriter.writeRecords(outputRecords);
  console.log(`   ⚡ Reactiva: ${outputRecords.length} facturas analizadas, ${multaCount} con multa`);

  return { facturaCount: outputRecords.length, multaCount };
}
