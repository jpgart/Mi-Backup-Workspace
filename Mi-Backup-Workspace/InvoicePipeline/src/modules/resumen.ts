import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { readCsvAsObjects } from '../utils/csvHelper';
import { parseCLP, formatCLP, roundTo } from '../utils/formatters';
import { OUTPUT_FILES, IVA_RATE, FP_THRESHOLD, EXPECTED_TRANSPORT_PERCENTAGE_MIN, EXPECTED_TRANSPORT_PERCENTAGE_MAX } from '../config';

/**
 * Módulo de resumen analítico del cliente.
 * Cruza datos de TODOS los CSVs generados para producir un informe consolidado
 * con verificaciones, validaciones y métricas calculadas.
 * 
 * Este módulo es NUEVO y no existe en el Enel_Parser original.
 * Extrae la máxima información posible basada en la documentación en /info/.
 */

export interface ResumenResult {
  facturaCount: number;
  alertCount: number;
}

/**
 * Genera Resumen_Cliente.csv cruzando datos de todos los CSVs anteriores.
 * 
 * @param outputDir - Carpeta con todos los CSVs generados (subcarpeta csv/)
 * @param clientProjectName - Nombre del cliente para la nomenclatura
 */
export async function generarResumen(outputDir: string, clientProjectName: string): Promise<ResumenResult> {
  const consolidadoFilename = `${clientProjectName} - ${OUTPUT_FILES.CONSOLIDADO}`;
  const medidoresFilename = `${clientProjectName} - ${OUTPUT_FILES.MEDIDORES}`;
  const consumoFilename = `${clientProjectName} - ${OUTPUT_FILES.CONSUMO}`;
  const reactivaFilename = `${clientProjectName} - ${OUTPUT_FILES.REACTIVA}`;
  const outFilename = `${clientProjectName} - ${OUTPUT_FILES.RESUMEN}`;

  // Leer todos los CSVs disponibles
  const consolidado = readCsvAsObjects(path.join(outputDir, consolidadoFilename));
  const medidores = readCsvAsObjects(path.join(outputDir, medidoresFilename));
  const consumo = readCsvAsObjects(path.join(outputDir, consumoFilename));
  const reactiva = readCsvAsObjects(path.join(outputDir, reactivaFilename));

  // Indexar reactiva por factura
  const reactivaMap = new Map<string, Record<string, string>>();
  for (const rec of reactiva) {
    reactivaMap.set(rec['N° Factura'] || '', rec);
  }

  // Indexar consumo por factura
  const consumoByFactura = new Map<string, Record<string, string>[]>();
  for (const rec of consumo) {
    const nFactura = rec['N° Factura'] || '';
    if (!consumoByFactura.has(nFactura)) consumoByFactura.set(nFactura, []);
    consumoByFactura.get(nFactura)!.push(rec);
  }

  // Indexar medidores agrupados por factura
  const medidoresByFactura = new Map<string, { activa: number; reactiva: number }>();
  for (const rec of medidores) {
    const nFactura = rec['N° Factura'] || '';
    const n_medidor = rec['N° Medidor'] || '';
    const consumoKwh = parseFloat(rec['Consumo kWh'] || '0');

    if (!medidoresByFactura.has(nFactura)) {
      medidoresByFactura.set(nFactura, { activa: 0, reactiva: 0 });
    }

    const group = medidoresByFactura.get(nFactura)!;
    if (n_medidor.endsWith('R')) {
      group.reactiva += consumoKwh;
    } else {
      group.activa += consumoKwh;
    }
  }

  const resumenRecords: Record<string, string>[] = [];
  let alertCount = 0;

  for (const inv of consolidado) {
    const n_factura = inv['N° Factura'] || '';
    const archivo = inv['Archivo Fuente'] || '';
    const fechaEmision = inv['Fecha Emisión'] || '';
    const cliente = inv['Nombre Cliente'] || '';
    const rut = inv['R.U.T Cliente'] || '';
    const nCliente = inv['N° Cliente (Enel)'] || '';

    const montoNeto = parseCLP(inv['Factura: Monto Neto'] || '0');
    const iva = parseCLP(inv['Factura: I.V.A.'] || '0');
    const montoExento = parseCLP(inv['Factura: Monto Exento'] || '0');
    const montoTotal = parseCLP(inv['Factura: Monto Total'] || '0');

    // Datos de medidores
    const med = medidoresByFactura.get(n_factura);
    const kwhActiva = med ? med.activa : 0;
    const kvarhReactiva = med ? med.reactiva : 0;

    // Datos de reactiva
    const reactivaRow = reactivaMap.get(n_factura);
    const fpCalculado = reactivaRow ? parseFloat(reactivaRow['FP Calculado'] || '1') : 1;
    const clasificacionFP = reactivaRow ? (reactivaRow['Clasificación FP'] || '') : '';
    const multaPositiva = reactivaRow ? (reactivaRow['Multa Positiva?'] || 'NO') : 'NO';
    const multaPorcentaje = reactivaRow ? (reactivaRow['% Multa'] || '0%') : '0%';
    const multaPesos = reactivaRow ? (reactivaRow['Multa Estimada (Pesos)'] || 'N/A') : 'N/A';

    // Buscar conceptos específicos en consumo
    const consumos = consumoByFactura.get(n_factura) || [];
    let costoElectricidad = 0;
    let costoTransporte = 0;
    let costoDemMax = 0;
    let costoDemHPunta = 0;
    let costoMultaReactiva = 0;
    let costoCargoFijo = 0;
    let costoArriendo = 0;
    let costoServPublico = 0;
    let kwhFacturado = 0;

    for (const c of consumos) {
      const concepto = (c['Concepto'] || '').toLowerCase();
      const gasto = parseCLP(c['Gasto Real (CLP)'] || '0');

      if (concepto.includes('electricidad consumida')) {
        costoElectricidad = gasto;
        const datoMedida = (c['Dato Medida (Paréntesis)'] || '').toLowerCase();
        const numMatch = datoMedida.match(/(\d+(?:\.\d+)*)/);
        if (numMatch) kwhFacturado = parseFloat(numMatch[1].replace(/\./g, ''));
      }
      else if (concepto.includes('transporte de electricidad')) costoTransporte = gasto;
      else if (concepto.includes('dem max') || concepto.includes('demanda max')) costoDemMax = gasto;
      else if (concepto.includes('dem') && concepto.includes('horas punta')) costoDemHPunta = gasto;
      else if (concepto.includes('multa') && concepto.includes('reactiv')) costoMultaReactiva = gasto;
      else if (concepto.includes('administración') || concepto.includes('cargo fijo')) costoCargoFijo = gasto;
      else if (concepto.includes('arriendo')) costoArriendo = gasto;
      else if (concepto.includes('servicio público') || concepto.includes('servicio publico')) costoServPublico = gasto;
    }

    // Verificación de Energía: Consumo_P vs Medidores
    let verificacionEnergia = 'OK ✓';
    const diffEnergia = Math.abs(kwhFacturado - kwhActiva);
    if (kwhFacturado > 0 && diffEnergia > 1) {
      verificacionEnergia = `ERROR (Facturado: ${kwhFacturado}, Medido: ${kwhActiva})`;
      alertCount++;
    } else if (kwhFacturado > 0 && kwhActiva === 0) {
      verificacionEnergia = `ERROR (Faltan Medidores para ${kwhFacturado} kWh)`;
      alertCount++;
    }

    // Tarifa estimada por kWh
    let tarifaKwh = '';
    if (kwhActiva > 0 && costoElectricidad > 0) {
      const tarifa = roundTo(costoElectricidad / kwhActiva, 2);
      tarifaKwh = `$${tarifa.toFixed(2)}`;
    }

    // % Transporte sobre Neto
    let pctTransporte = '';
    let alertTransporte = '';
    if (montoNeto > 0 && costoTransporte > 0) {
      const pct = roundTo(costoTransporte / montoNeto, 4);
      pctTransporte = (pct * 100).toFixed(1) + '%';
      if (pct < EXPECTED_TRANSPORT_PERCENTAGE_MIN || pct > EXPECTED_TRANSPORT_PERCENTAGE_MAX) {
        alertTransporte = `ATENCIÓN: ${pctTransporte} fuera del rango esperado (8-10%)`;
        alertCount++;
      }
    }

    // Verificaciones
    const ivaEsperado = Math.round(montoNeto * IVA_RATE);
    const verificacionIVA = Math.abs(ivaEsperado - iva) <= 1 ? 'OK ✓' : `ERR(${formatCLP(ivaEsperado)})`;
    if (!verificacionIVA.startsWith('OK')) alertCount++;

    const totalEsperado = montoNeto + iva + montoExento;
    const verificacionTotal = Math.abs(totalEsperado - montoTotal) <= 2 ? 'OK ✓' : `ERR(${formatCLP(totalEsperado)})`;
    if (!verificacionTotal.startsWith('OK')) alertCount++;

    let ahorroPotencial = (multaPositiva === 'SI' && multaPesos !== 'N/A') ? `$${multaPesos} /mes (aprox)` : '0';

    resumenRecords.push({
      n_factura: n_factura,
      fecha_emision: fechaEmision,
      cliente: cliente,
      rut: rut,
      n_cliente: nCliente,
      monto_neto: montoNeto > 0 ? formatCLP(montoNeto) : '',
      iva: iva > 0 ? formatCLP(iva) : '',
      monto_exento: montoExento > 0 ? formatCLP(montoExento) : '',
      monto_total: montoTotal > 0 ? formatCLP(montoTotal) : '',
      kwh_facturado: kwhFacturado.toString(),
      kwh_activa: kwhActiva.toString(),
      kvarh_reactiva: kvarhReactiva.toString(),
      verificacion_energia: verificacionEnergia,
      fp_calculado: fpCalculado < 1 ? fpCalculado.toFixed(3) : '1.000',
      clasificacion_fp: clasificacionFP,
      multa_reactiva: multaPositiva,
      multa_porcentaje: multaPorcentaje,
      multa_pesos: multaPesos,
      tarifa_kwh: tarifaKwh,
      costo_electricidad: costoElectricidad > 0 ? formatCLP(costoElectricidad) : '',
      costo_transporte: costoTransporte > 0 ? formatCLP(costoTransporte) : '',
      pct_transporte: pctTransporte,
      costo_dem_max: costoDemMax > 0 ? formatCLP(costoDemMax) : '',
      costo_dem_hpunta: costoDemHPunta > 0 ? formatCLP(costoDemHPunta) : '',
      costo_cargo_fijo: costoCargoFijo > 0 ? formatCLP(costoCargoFijo) : '',
      costo_arriendo: costoArriendo > 0 ? formatCLP(costoArriendo) : '',
      costo_serv_publico: costoServPublico > 0 ? formatCLP(costoServPublico) : '',
      costo_multa_reactiva: costoMultaReactiva > 0 ? formatCLP(costoMultaReactiva) : '',
      verificacion_iva: verificacionIVA,
      verificacion_total: verificacionTotal,
      ahorro_potencial: ahorroPotencial,
      alerta_transporte: alertTransporte,
      archivo: archivo
    });
  }

  const outCsvPath = path.join(outputDir, outFilename);
  const csvWriter = createObjectCsvWriter({
    path: outCsvPath,
    header: [
      { id: 'n_factura', title: 'N° Factura' },
      { id: 'fecha_emision', title: 'Fecha Emisión' },
      { id: 'cliente', title: 'Cliente' },
      { id: 'rut', title: 'RUT' },
      { id: 'n_cliente', title: 'N° Cliente' },
      { id: 'monto_neto', title: 'Monto Neto ($)' },
      { id: 'iva', title: 'IVA ($)' },
      { id: 'monto_exento', title: 'Monto Exento ($)' },
      { id: 'monto_total', title: 'Monto Total ($)' },
      { id: 'kwh_facturado', title: 'kWh Facturado (Consumo_P)' },
      { id: 'kwh_activa', title: 'kWh Medido (Medidores)' },
      { id: 'kvarh_reactiva', title: 'kVARh Medido (Medidores)' },
      { id: 'verificacion_energia', title: 'Verificación Energía' },
      { id: 'fp_calculado', title: 'FP Calculado' },
      { id: 'clasificacion_fp', title: 'Clasificación FP' },
      { id: 'multa_reactiva', title: 'Multa Reactiva?' },
      { id: 'multa_porcentaje', title: '% Multa' },
      { id: 'multa_pesos', title: 'Multa Estimada ($)' },
      { id: 'tarifa_kwh', title: 'Tarifa $/kWh (Estimada)' },
      { id: 'costo_electricidad', title: 'Costo Electricidad ($)' },
      { id: 'costo_transporte', title: 'Costo Transporte ($)' },
      { id: 'pct_transporte', title: '% Transporte/Neto' },
      { id: 'costo_dem_max', title: 'Demanda Máxima ($)' },
      { id: 'costo_dem_hpunta', title: 'Demanda H. Punta ($)' },
      { id: 'costo_cargo_fijo', title: 'Cargo Fijo ($)' },
      { id: 'costo_arriendo', title: 'Arriendo Medidor ($)' },
      { id: 'costo_serv_publico', title: 'Servicio Público ($)' },
      { id: 'costo_multa_reactiva', title: 'Multa Reactiva Cobrada ($)' },
      { id: 'verificacion_iva', title: 'Verificación IVA' },
      { id: 'verificacion_total', title: 'Verificación Total' },
      { id: 'ahorro_potencial', title: 'Ahorro Potencial (FP)' },
      { id: 'alerta_transporte', title: 'Alerta Transporte' },
      { id: 'archivo', title: 'Archivo Fuente' }
    ]
  });

  await csvWriter.writeRecords(resumenRecords);
  console.log(`   📈 Resumen: ${resumenRecords.length} facturas con 31 columnas analíticas`);
  if (alertCount > 0) console.log(`   ⚠️  ${alertCount} alertas detectadas (ver columnas de verificación)`);

  return { facturaCount: resumenRecords.length, alertCount };
}
