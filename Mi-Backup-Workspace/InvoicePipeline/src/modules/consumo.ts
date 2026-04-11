import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { extractFullText, getCleanLines, extractFacturaNumber } from '../utils/textExtractor';
import { formatCLP } from '../utils/formatters';
import { OUTPUT_FILES } from '../config';

/**
 * Módulo de extracción de consumo detallado.
 * Genera Consumo_P.csv con desglose de cada concepto de cobro.
 *
 * MEJORAS v1.3:
 * - Captura TODAS las líneas dentro de la zona de ítems, incluyendo no reconocidas.
 * - Líneas no reconocidas → marcadas como "⚠️ LÍNEA NO RECONOCIDA" + alerta.
 * - Extracción robusta de "Saldo Anterior" (deuda período anterior) distinguiéndolo
 *   del "Total a Pagar" (suma acumulada a pagar).
 * - Soporte para AMBOS formatos de factura Enel:
 *     Formato 2022: "Saldo anterior  MONTO  FECHA" (segunda ocurrencia = saldo parcial)
 *                   "FECHA   MONTO_TOTAL" (mayor monto = Total a Pagar definitivo)
 *     Formato 2023+: "Páguese hasta el FECHA  Total a pagar  MONTO"
 *                    "Total a pagar" explícito en línea separada
 * - Alerta de energía cero cuando no se detecta "Electricidad Consumida".
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
  alerts: string[];
}

const ZONE_MARKERS = [
  /^INDEFINIDO$/i,
  /^\d{2}\/\d{2}\/\d{4}$/,
];

const EXCLUDE_PATTERNS = [
  'OJOS', 'SANTIAGO', 'FACTURA', 'COMERCIAL', 'Timbre', 'Señor', 'R.U.T',
  'enel.cl', 'Aplicación', 'Enel', 'EMPRESA', 'Decreto', 'Ministerio',
  'DISPOSICIÓN', 'Tarifas fijadas', 'Fono', 'CALLE', 'Página', 'ATU',
];

function isZoneMarker(line: string): boolean {
  return ZONE_MARKERS.some(r => r.test(line.trim()));
}

function shouldExclude(desc: string): boolean {
  return EXCLUDE_PATTERNS.some(ex => desc.toLowerCase().includes(ex.toLowerCase()));
}

/**
 * Extrae el "Saldo Anterior" REAL (deuda del período previo) del texto completo.
 *
 * En facturas Enel hay DOS ocurrencias de "Saldo [Aa]nterior":
 *   1a) "Saldo Anterior   7.264.232   " → deuda del período anterior (exacto)
 *   2a) "Saldo anterior   8.639.542   24/06/2022" → primer subtotal a pagar
 *
 * La 1a tiene el mayor sangrado/espaciado y viene ANTES de "Total Monto Neto".
 * La 2a viene DESPUÉS de "Monto Total" y va acompañada de una fecha.
 *
 * Estrategia: tomamos la PRIMERA ocurrencia (antes de "Monto Total").
 */
function extractSaldoAnterior(lines: string[]): string | null {
  let pastMontoTotal = false;
  for (const line of lines) {
    if (/Monto Total/i.test(line)) { pastMontoTotal = true; }
    if (pastMontoTotal) continue; // ya pasamos la zona de ítems

    const m = line.match(/Saldo\s+[Aa]nterior[^\d\n]{0,30}(\d{1,3}(?:\.\d{3})*)/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Extrae el "Total a Pagar" definitivo del texto completo.
 *
 * Formato 2023+: línea "Páguese hasta el DD/MM/YYYY  Total a pagar  MONTO"
 *                o línea "Total a pagar  MONTO" justo antes del número.
 *
 * Formato 2022: línea "DD/MM/YYYY   MONTO_GRANDE" donde MONTO_GRANDE es el
 *               mayor valor numérico que aparece junto a una fecha de vencimiento
 *               DESPUÉS de "Monto Total".
 *
 * Devuelve el Total a Pagar como string con puntos (estilo CLP), o null.
 */
function extractTotalAPagar(lines: string[], fullText: string): string | null {
  // Formato moderno 2023+: "Páguese hasta el … Total a pagar  MONTO"
  const modMatch = fullText.match(/[Pp]águese[^\n]{0,60}[Tt]otal\s+a\s+[Pp]agar\s+([\d\.]+)/);
  if (modMatch) return modMatch[1];

  // Formato alternativo: "Total a pagar" en línea propia
  const tapMatch = fullText.match(/[Tt]otal\s+a\s+[Pp]agar[^\d\n]{0,20}(\d{1,3}(?:\.\d{3})*)/);
  if (tapMatch) return tapMatch[1];

  // Formato 2022: buscar línea "DD/MM/YYYY   MONTO" que aparece DESPUÉS de "Monto Total"
  // El monto en esa línea es el Total a Pagar definitivo de la factura completa
  let pastMontoTotal = false;
  for (const line of lines) {
    if (/Monto Total/i.test(line)) { pastMontoTotal = true; continue; }
    if (!pastMontoTotal) continue;

    // Patrón: línea que empieza con una fecha y termina con un número CLP grande
    const dateMontoMatch = line.match(/^\s*\d{2}\/\d{2}\/\d{4}\s+([\d\.]+)\s*$/);
    if (dateMontoMatch) return dateMontoMatch[1];

    // Patrón alternativo: fecha al final del bloque con monto al lado
    const altMatch = line.match(/(\d{1,3}(?:\.\d{3})*)\s+\d{2}\/\d{2}\/\d{4}\s*$/);
    if (altMatch) return altMatch[1];
  }

  // Último recurso: buscar el número más grande en líneas tipo "FECHA  MONTO" después de Monto Total
  const afterMontoTotalMatch = fullText.match(
    /Monto Total[^\n]*\n(?:.*\n){0,10}?\s*(\d{2}\/\d{2}\/\d{4})\s+([\d\.]{7,})/
  );
  if (afterMontoTotalMatch) return afterMontoTotalMatch[2];

  return null;
}

/**
 * Procesa los consumos detallados de todos los JSON en una carpeta.
 *
 * @param jsonDir - Carpeta con los archivos JSON
 * @param outputDir - Carpeta donde guardar el CSV (usualmente la subcarpeta csv/)
 * @param clientProjectName - Nombre del cliente para la nomenclatura
 */
export async function procesarConsumo(
  jsonDir: string,
  outputDir: string,
  clientProjectName: string
): Promise<ConsumoResult> {
  const files = fs.readdirSync(jsonDir).filter((f: string) => f.endsWith('.json'));
  const parsedConsumos: ConsumoPData[] = [];
  const alerts: string[] = [];

  for (const file of files) {
    const dataPath = path.join(jsonDir, file);
    const jsonContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const fullText = extractFullText(jsonContent);
    let n_factura = extractFacturaNumber(fullText);
    if (!n_factura) n_factura = 'ERROR: NO ENCONTRADA';

    const lines = getCleanLines(fullText);
    // También necesitamos las líneas SIN limpiar para la extracción por posición
    const rawLines = fullText.split('\n');

    let inItemZone = false;
    let hasElectricidadConsumo = false;
    let saldoAnteriorCaptured = false; // flag para capturar solo la PRIMERA ocurrencia

    // ─── FASE 1: Captura de ítems de cobro ──────────────────────────────────
    for (const line of lines) {
      if (!inItemZone && isZoneMarker(line)) {
        inItemZone = true;
        continue;
      }
      if (!inItemZone) continue;

      // Capturar "Total Monto Neto" como ítem (sin detenernos aquí)
      if (line.match(/Total Monto Neto/i)) {
        const montoMatch = line.match(/Total Monto Neto[^\d]{0,10}(\d{1,3}(?:\.\d{3})*)/);
        if (montoMatch) {
          parsedConsumos.push({
            archivo: file, n_factura,
            concepto: 'Total Monto Neto',
            medida_parentesis: '', gasto_clp: montoMatch[1]
          });
        }
        continue;
      }

      // Omitir la SEGUNDA (y siguientes) aparición de "Saldo anterior".
      // En facturas Enel la segunda ocurrencia es el subtotal de vencimiento (no la deuda anterior real).
      // La primera ocurrencia la etiquetamos como "Saldo Anterior" en la sección Fase 2.
      if (/Saldo\s+[Aa]nterior/i.test(line)) {
        if (saldoAnteriorCaptured) {
          // Segunda ocurrencia dentro de ítems → omitir (se manejará como Total a Pagar en Fase 2)
          continue;
        }
        // Primera ocurrencia → marcamos el flag y dejamos que sea capturada normalmente
        saldoAnteriorCaptured = true;
      }

      // Regex principal: Concepto seguido de monto CLP
      const itemRegex = /^([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\.\,\-\(\)\s\d\+\%]+?)\s+(\d{1,3}(?:\.\d{3})*)(?:\s|$)/;
      const match = line.match(itemRegex);

      if (match) {
        let descFull = match[1].trim();
        const gasto = match[2];

        if (shouldExclude(descFull) || descFull.length <= 5) continue;

        let medida = '';
        let concepto = descFull;

        const parentesisMatch = descFull.match(/\(([^)]+)\)/);
        if (parentesisMatch) {
          medida = parentesisMatch[1];
          concepto = descFull.replace(/\([^)]+\)/g, '').trim();
        }

        if (concepto.toLowerCase().includes('electricidad consumida')) {
          hasElectricidadConsumo = true;
        }

        parsedConsumos.push({
          archivo: file, n_factura, concepto, medida_parentesis: medida, gasto_clp: gasto
        });

      } else {
        // Línea NO reconocida dentro de la zona de ítems
        const trimmed = line.trim();
        if (
          trimmed.length > 8 &&
          !isZoneMarker(line) &&
          !shouldExclude(trimmed) &&
          !/^\d+$/.test(trimmed) &&
          !/^\d{2}\/\d{2}\/\d{4}/.test(trimmed) &&
          !/^[a-z]/.test(trimmed)
        ) {
          const alertMsg = `⚠️ [${file}] Línea no reconocida en factura ${n_factura}: "${trimmed.substring(0, 80)}"`;
          alerts.push(alertMsg);
          console.warn(`   ${alertMsg}`);

          parsedConsumos.push({
            archivo: file, n_factura,
            concepto: `⚠️ LÍNEA NO RECONOCIDA: ${trimmed.substring(0, 60)}`,
            medida_parentesis: '', gasto_clp: ''
          });
        }
      }
    }

    // ─── FASE 2: Extracción de Saldo Anterior y Total a Pagar ───────────────
    // Usamos las líneas SIN limpiar para preservar contexto posicional
    const saldoAnteriorStr = extractSaldoAnterior(rawLines);
    const totalAPagarStr   = extractTotalAPagar(rawLines, fullText);

    // Verificar si ya fueron capturados con el nombre correcto en ítems
    const yaCapturaSaldo = parsedConsumos.some(
      c => c.archivo === file && /saldo anterior/i.test(c.concepto) && !c.concepto.includes('⚠️')
    );

    if (saldoAnteriorStr && !yaCapturaSaldo) {
      parsedConsumos.push({
        archivo: file, n_factura,
        concepto: 'Saldo Anterior',
        medida_parentesis: '', gasto_clp: saldoAnteriorStr
      });
    }

    if (totalAPagarStr) {
      parsedConsumos.push({
        archivo: file, n_factura,
        concepto: 'Total a Pagar',
        medida_parentesis: '', gasto_clp: totalAPagarStr
      });
    } else {
      // Si no se encontró, alertar
      const alertMsg = `⚠️ [${file}] No se pudo extraer "Total a Pagar" para factura ${n_factura}`;
      alerts.push(alertMsg);
      console.warn(`   ${alertMsg}`);
    }

    // ─── FASE 3: Alerta de energía cero ────────────────────────────────────
    if (!hasElectricidadConsumo) {
      const alertMsg = `🔴 ALERTA ENERGÍA [${file}] Factura ${n_factura}: No se detectó "Electricidad Consumida" → kWh = 0. Verificar manualmente.`;
      alerts.push(alertMsg);
      console.warn(`   ${alertMsg}`);

      parsedConsumos.push({
        archivo: file, n_factura,
        concepto: '🔴 ALERTA: Sin dato de Electricidad Consumida (kWh=0)',
        medida_parentesis: '', gasto_clp: '0'
      });
    }

    // ─── FASE 4: Filas de control (verificación) ────────────────────────────
    const mtotal = fullText.match(/Monto Total[\s\n]+([\d\.]+)/i);
    const totalRealNum = mtotal ? parseInt(mtotal[1].replace(/\./g, ''), 10) : 0;

    // Sumar solo ítems de cobro reales (excluir totales, saldos, alertas)
    const conceptosExcluidos = [
      'monto neto', 'iva', 'monto total', 'exento',
      'saldo anterior', 'total a pagar', '⚠️', '🔴'
    ];
    const consumosDelArchivo = parsedConsumos.filter(
      c => c.archivo === file && c.n_factura === n_factura
    );
    const sumaGastos = consumosDelArchivo.reduce((acc, c) => {
      if (conceptosExcluidos.some(ex => c.concepto.toLowerCase().includes(ex))) return acc;
      return acc + (parseInt(c.gasto_clp.replace(/\./g, ''), 10) || 0);
    }, 0);

    const controlData = [
      { c: 'Suma Gasto Real (Calculada)', v: sumaGastos },
      { c: 'Dato Real (Extraído de JSON)', v: totalRealNum },
      { c: 'Diferencia Suma vs Real', v: sumaGastos - totalRealNum }
    ];

    for (const ctrl of controlData) {
      parsedConsumos.push({
        archivo: file, n_factura,
        concepto: ctrl.c,
        medida_parentesis: '', gasto_clp: formatCLP(ctrl.v)
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
  console.log(`   📋 Consumo: ${parsedConsumos.length} filas (Saldo Anterior + Total a Pagar incluidos)`);
  if (alerts.length > 0) {
    console.log(`   ⚠️  ${alerts.length} alertas de consumo detectadas`);
  }

  return { totalRows: parsedConsumos.length, alerts };
}
