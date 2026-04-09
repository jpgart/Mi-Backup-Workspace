/**
 * Analytics Engine - Lógica Universal para Procesamiento de Datos Energéticos
 * Compatible con browser (.js puro, sin TypeScript).
 */

export class AnalyticsEngine {
  static DATE_REGEX = /fecha|emisi[oó]n|date|per[ií]odo|mes/i;
  static NET_MONTO_REGEX = /monto.*neto|neto|subtotal/i;
  static TOTAL_MONTO_REGEX = /monto.*total|total.*monto|total|pago/i;
  static KWH_REGEX = /kwh.*facturado|kwh.*consumo|consumo.*activa|kwh/i;
  static KVARH_REGEX = /kvarh|consumo.*reactiva|reacti.*consumo|energ[ií]a.*reactiva/i;
  static FP_REGEX = /fp.*calculado|factor.*potencia|cos.*phi/i;
  static PENALTY_REGEX = /multa.*cobrada|multa.*reactiva.*cobrada|recargo.*reactiva/i;
  static INVOICE_REGEX = /n[°º].*factura|factura|invoice/i;
  static CLASIF_REGEX = /clasificaci[oó]n.*fp|estado.*fp/i;

  /**
   * Normaliza una fila del CSV a estructura estándar
   * @param {Object} raw - Fila cruda del CSV
   * @returns {Object|null}
   */
  static normalize(raw) {
    const keys = Object.keys(raw);
    const findKey = (regex) => keys.find((k) => regex.test(k));

    const dateKey    = findKey(this.DATE_REGEX);
    const netKey     = findKey(this.NET_MONTO_REGEX);
    const totalKey   = findKey(this.TOTAL_MONTO_REGEX);
    const kwhKey     = findKey(this.KWH_REGEX);
    const kvarhKey   = findKey(this.KVARH_REGEX);
    const fpKey      = findKey(this.FP_REGEX);
    const penaltyKey = findKey(this.PENALTY_REGEX);
    const invoiceKey = findKey(this.INVOICE_REGEX);
    const clasifKey  = findKey(this.CLASIF_REGEX);

    if (!dateKey) return null;

    const parseNum = (val) => {
      if (typeof val === 'number') return val;
      if (!val || String(val).trim() === '' || String(val) === 'N/A') return 0;
      // Formato chileno: puntos = miles, coma = decimal
      const cleaned = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const fpRaw  = fpKey  ? parseNum(raw[fpKey])  : 0;
    const kwh    = kwhKey ? parseNum(raw[kwhKey]) : 0;
    const kvarh  = kvarhKey ? parseNum(raw[kvarhKey]) : 0;

    let fp = fpRaw;
    if ((!fp || fp === 0) && kwh > 0) {
      fp = kwh / Math.sqrt(Math.pow(kwh, 2) + Math.pow(kvarh, 2));
    }
    if (!fp || fp === 0) fp = 1.0;

    const totalMonto = totalKey ? parseNum(raw[totalKey]) : 0;
    const netMonto   = netKey   ? parseNum(raw[netKey])   : 0;

    return {
      invoiceNum:    invoiceKey ? raw[invoiceKey] : '—',
      date:          this.parseDate(raw[dateKey]),
      netMonto,
      totalMonto,
      energyKwh:     kwh,
      reactiveKvarh: kvarh,
      fp,
      clasif:        clasifKey ? raw[clasifKey] : (fp >= 0.93 ? 'Eficiente' : 'Ineficiente'),
      penaltyMonto:  penaltyKey ? parseNum(raw[penaltyKey]) : 0,
      sourceFile:    raw['Archivo Fuente'] || raw['source'] || 'Desconocido',
      raw,           // keep original for additional columns
    };
  }

  /**
   * Parsea fechas en formatos DD/MM/YYYY, YYYY/MM/DD, o varios separadores
   */
  static parseDate(val) {
    if (val instanceof Date) return val;
    const s = String(val).trim();
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) { // DD/MM/YYYY
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      if (parts[0].length === 4) { // YYYY/MM/DD
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    const d = new Date(val);
    return isNaN(d) ? new Date() : d;
  }

  /**
   * Calcula propuesta de banco de condensadores
   */
  static calculateCapacitor(data, targetFp = 0.98) {
    const { energyKwh, reactiveKvarh, fp, netMonto } = data;

    if (fp >= 0.93) {
      return { targetFp, requiredKvar: 0, estimatedSavingMonthly: 0, status: 'Eficiente' };
    }

    const phi_actual  = Math.acos(Math.min(fp, 1.0));
    const phi_obj     = Math.acos(targetFp);
    const kvarh_need  = energyKwh * (Math.tan(phi_actual) - Math.tan(phi_obj));
    const avg_hours   = 300;
    const requiredKvar = kvarh_need / avg_hours;

    const cents_below  = Math.max(0, (0.93 - fp) * 100);
    const saving       = (netMonto * cents_below) / 100;

    return {
      targetFp,
      requiredKvar:          Math.round(requiredKvar * 10) / 10,
      estimatedSavingMonthly: Math.round(saving),
      status: fp < 0.85 ? 'Crítico' : 'Recomendado',
    };
  }

  /**
   * Agrupa datos por año con resumen ejecutivo
   */
  static groupByYear(dataList) {
    const years = {};
    dataList.forEach((d) => {
      const year = d.date.getFullYear();
      if (!years[year]) years[year] = { energyMwh: 0, totalMonto: 0, penaltyTotal: 0, count: 0 };
      years[year].energyMwh   += d.energyKwh / 1000;
      years[year].totalMonto  += d.totalMonto;
      years[year].penaltyTotal += d.penaltyMonto;
      years[year].count++;
    });
    return years;
  }

  /**
   * Genera insights automáticos del dataset
   */
  static getInsights(dataList) {
    if (dataList.length < 2) return [];

    const insights = [];
    const sorted   = [...dataList].sort((a, b) => a.date - b.date);

    // Variación Month-over-Month del último mes
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (prev.totalMonto > 0) {
      const pct = ((last.totalMonto - prev.totalMonto) / prev.totalMonto) * 100;
      if (Math.abs(pct) > 10) {
        const dir = pct > 0 ? '📈 Aumento' : '📉 Reducción';
        insights.push(`${dir} del ${Math.abs(pct).toFixed(1)}% en gasto vs. mes anterior.`);
      }
    }

    // Multas acumuladas
    const totalPenalty = sorted.reduce((s, d) => s + d.penaltyMonto, 0);
    if (totalPenalty > 0) {
      insights.push(`⚠️ $${totalPenalty.toLocaleString('es-CL')} pagados en multas reactiva en el período.`);
    }

    // Mejor y peor FP
    const byFp = [...sorted].sort((a, b) => a.fp - b.fp);
    insights.push(`🔻 FP mínimo: ${byFp[0].fp.toFixed(3)} (${byFp[0].date.toLocaleDateString('es-CL', {month:'short', year:'numeric'})}).`);
    insights.push(`✅ FP máximo: ${byFp[byFp.length-1].fp.toFixed(3)} (${byFp[byFp.length-1].date.toLocaleDateString('es-CL', {month:'short', year:'numeric'})}).`);

    // Consumo promedio mensual
    const avgKwh = sorted.reduce((s, d) => s + d.energyKwh, 0) / sorted.length;
    insights.push(`⚡ Consumo promedio mensual: ${Math.round(avgKwh).toLocaleString('es-CL')} kWh.`);

    return insights;
  }

  /**
   * Calcula estadísticas básicas de una serie numérica
   */
  static stats(arr) {
    if (!arr.length) return { min: 0, max: 0, avg: 0, sum: 0 };
    const sum = arr.reduce((s, v) => s + v, 0);
    return {
      min: Math.min(...arr),
      max: Math.max(...arr),
      avg: sum / arr.length,
      sum,
    };
  }
}
