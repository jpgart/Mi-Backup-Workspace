import { InvoiceData, CapacitorProposal } from '../types';

/**
 * Analytics Engine - Lógica Universal para Procesamiento de Datos Energéticos
 * Modernizado con TypeScript para el Dashboard React.
 */

export class AnalyticsEngine {
  static readonly DATE_REGEX = /fecha|emisi[oó]n|date|per[ií]odo|mes/i;
  static readonly NET_MONTO_REGEX = /monto.*neto|neto|subtotal/i;
  static readonly TOTAL_MONTO_REGEX = /monto.*total|total.*monto|total|pago/i;
  static readonly KWH_REGEX = /kwh.*facturado|kwh.*consumo|consumo.*activa|kwh/i;
  static readonly KVARH_REGEX = /kvarh|consumo.*reactiva|reacti.*consumo|energ[ií]a.*reactiva/i;
  static readonly FP_REGEX = /fp.*calculado|factor.*potencia|cos.*phi/i;
  static readonly PENALTY_REGEX = /multa.*cobrada|multa.*reactiva.*cobrada|recargo.*reactiva/i;
  static readonly INVOICE_REGEX = /n[°º].*factura|factura|invoice/i;
  static readonly CLASIF_REGEX = /clasificaci[oó]n.*fp|estado.*fp/i;

  /**
   * Normaliza una fila del CSV a estructura estándar
   */
  static normalize(raw: any): InvoiceData | null {
    const keys = Object.keys(raw);
    const findKey = (regex: RegExp) => keys.find((k) => regex.test(k));

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

    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val || String(val).trim() === '' || String(val) === 'N/A') return 0;
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
    const penaltyMonto = penaltyKey ? parseNum(raw[penaltyKey]) : 0;

    const isEficiente = fp >= 0.93 && penaltyMonto === 0;

    return {
      invoiceNum:    invoiceKey ? raw[invoiceKey] : '—',
      date:          this.parseDate(raw[dateKey]),
      netMonto,
      totalMonto,
      energyKwh:     kwh,
      reactiveKvarh: kvarh,
      fp,
      clasif:        clasifKey ? raw[clasifKey] : (isEficiente ? 'Eficiente' : 'Ineficiente'),
      penaltyMonto,
      sourceFile:    raw['Archivo Fuente'] || raw['source'] || 'Desconocido',
      raw,           
    };
  }

  static parseDate(val: any): Date {
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
    return isNaN(d.getTime()) ? new Date() : d;
  }

  static calculateCapacitor(data: InvoiceData, targetFp: number = 0.98): CapacitorProposal {
    const { energyKwh, fp, netMonto } = data;

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

  static getInsights(dataList: InvoiceData[]): string[] {
    if (dataList.length < 2) return [];

    const insights: string[] = [];
    const sorted   = [...dataList].sort((a, b) => a.date.getTime() - b.date.getTime());

    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (prev.totalMonto > 0) {
      const pct = ((last.totalMonto - prev.totalMonto) / prev.totalMonto) * 100;
      if (Math.abs(pct) > 10) {
        const dir = pct > 0 ? '📈 Aumento' : '📉 Reducción';
        insights.push(`${dir} del ${Math.abs(pct).toFixed(1)}% en gasto vs. mes anterior.`);
      }
    }

    const totalPenalty = sorted.reduce((s, d) => s + d.penaltyMonto, 0);
    if (totalPenalty > 0) {
      insights.push(`⚠️ $${totalPenalty.toLocaleString('es-CL')} pagados en multas reactiva en el período.`);
    }

    const byFp = [...sorted].sort((a, b) => a.fp - b.fp);
    insights.push(`🔻 FP mínimo: ${byFp[0].fp.toFixed(3)} (${byFp[0].date.toLocaleDateString('es-CL', {month:'short', year:'numeric'})}).`);
    insights.push(`✅ FP máximo: ${byFp[byFp.length-1].fp.toFixed(3)} (${byFp[byFp.length-1].date.toLocaleDateString('es-CL', {month:'short', year:'numeric'})}).`);

    const avgKwh = sorted.reduce((s, d) => s + d.energyKwh, 0) / sorted.length;
    insights.push(`⚡ Consumo promedio mensual: ${Math.round(avgKwh).toLocaleString('es-CL')} kWh.`);

    return insights;
  }
}
