import * as fs from 'fs';
import * as path from 'path';

const csvPath = '/Users/jpga/Antigravity M2/Scratch-M2/analytics-system/data/VOGT - Resumen_Cliente.csv';
const outputPath = '/Users/jpga/Antigravity M2/Scratch-M2/analytics-system/apps/vogt-dashboard/data/vogt.js';

function parseCSV(content: string) {
    const lines = content.trim().split('\n');
    const headers = splitCSVLine(lines[0]);
    const data = lines.slice(1).map(line => {
        const values = splitCSVLine(line);
        const obj: any = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] || '';
        });
        return obj;
    });
    return data;
}

function splitCSVLine(line: string) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}

function cleanNumber(val: string, isRatio: boolean = false): number {
    if (!val || val === 'N/A' || val === '' || val === undefined) return 0;
    
    let clean = val.replace(/[^0-9.,]/g, '');
    
    if (isRatio) {
        // Para ratios como FP (0.894) o Tarifa (62.87)
        // Si tiene coma y no punto, o un solo punto...
        return parseFloat(clean.replace(',', '.'));
    }

    // Para moneda (5.159.438)
    // Eliminamos todos los puntos, y convertimos la coma en punto decimal si existe
    return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
}

async function main() {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const records = parseCSV(csvContent);

    // Metadata
    const totalPeriodos = records.length;
    
    // KPIs
    let totalMonto = 0;
    let totalKwh = 0;
    let totalMultas = 0;
    let mesesFueraNorma = 0;
    let sumaFP = 0;
    let countFP = 0;

    const facturas = records.map(r => {
        const neto = cleanNumber(r['Monto Neto ($)']);
        const total = cleanNumber(r['Monto Total ($)']);
        const multa = cleanNumber(r['Multa Estimada ($)']);
        const kwh = cleanNumber(r['kWh Facturado (Consumo_P)']);
        const fp = cleanNumber(r['FP Calculado'], true);
        const reacts = r['Multa Reactiva?'] === 'SI';
        
        totalMonto += neto;
        totalKwh += kwh;
        totalMultas += multa;
        if (reacts) mesesFueraNorma++;
        if (fp > 0) {
            sumaFP += fp;
            countFP++;
        }

        const dateParts = r['Fecha Emisión'].split('/');
        const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mesStr = (dateParts.length === 3) ? `${monthsNames[parseInt(dateParts[1])-1]} ${dateParts[2]}` : r['Fecha Emisión'];

        return {
            factura: r['N° Factura'],
            fecha: r['Fecha Emisión'],
            mes: mesStr,
            consumo_kWh: kwh,
            reactiva_kVARh: cleanNumber(r['kVARh Medido (Medidores)']),
            fp: fp,
            clasificacion: r['Clasificación FP'],
            multa: multa,
            total: total,
            neto: neto,
            tarifa_kWh: cleanNumber(r['Tarifa $/kWh (Estimada)'], true)
        };
    });

    // Sort by date (naive string sort for DD/MM/YYYY)
    facturas.sort((a, b) => {
        const da = a.fecha.split('/').reverse().join('');
        const db = b.fecha.split('/').reverse().join('');
        return da.localeCompare(db);
    });

    const fpPromedio = sumaFP / countFP;
    const porcentajeMultas = (totalMultas * 100) / totalMonto;
    const costoInaccion12m = (totalMultas / totalPeriodos) * 12;

    const counts = {
        Eficiente: facturas.filter(f => f.clasificacion === 'Eficiente').length,
        Ineficiente: facturas.filter(f => f.clasificacion === 'Ineficiente').length,
        Critico: facturas.filter(f => f.clasificacion === 'Crítico').length,
        SinLectura: facturas.filter(f => f.consumo_kWh === 0).length
    };

    const jsContent = `// ============================================================
// DATOS DEL CLIENTE - VOGT
// Generado automáticamente por scripts/generate-vogt-js.ts
// ============================================================
window.DASHBOARD_DATA = {

  cliente: {
    nombre: "Industria Mecánica VOGT S.A.",
    rut: "96.800.570-7",
    nCliente: "1338543-2",
    periodoAnalizado: "2022 – 2024",
    fechaInforme: "${new Date().toLocaleDateString('es-CL')}",
    analista: "Sistema de Analítica Energética Universal",
    totalPeriodos: ${totalPeriodos},
    distribuidora: "Enel Chile",
  },

  kpis: {
    gastoNetoTotal: ${Math.round(totalMonto)},
    energiaTotal_kWh: ${Math.round(totalKwh)},
    multasTotal: ${Math.round(totalMultas)},
    porcentajeMultas: ${porcentajeMultas.toFixed(1)},
    mesesFueraNorma: ${mesesFueraNorma},
    fpPromedio: ${fpPromedio.toFixed(3)},
    costoInaccion12m: ${Math.round(costoInaccion12m)},
    paybackMeses: "4–6",
    capacitorRecomendado_kVAr: "30–50",
    ahorroHistoricoPerdido: ${Math.round(totalMultas)},
  },

  facturas: ${JSON.stringify(facturas, null, 2)},

  clasificacionFP: [
    { label:"Eficiente (>=0.93)",   count:${counts.Eficiente}, color:"#22c55e" },
    { label:"Ineficiente (0.85-0.92)", count:${counts.Ineficiente}, color:"#f59e0b" },
    { label:"Crítico (<0.85)",     count:${counts.Critico}, color:"#ef4444" },
    { label:"Sin Lectura / Cero",  count:${counts.SinLectura}, color:"#94a3b8" },
  ],

  conclusiones: [
    {
      id:1, icono:"⚡", tipo:"critico",
      titulo:"${mesesFueraNorma} meses operando fuera de norma",
      texto:"El ${Math.round((mesesFueraNorma/totalPeriodos)*100)}% del período analizado (${mesesFueraNorma} de ${totalPeriodos} meses) el Factor de Potencia estuvo bajo el umbral normativo de 0.93, generando multas sistemáticas por energía reactiva.",
    },
    {
      id:2, icono:"💰", tipo:"financiero",
      titulo:"$${totalMultas.toLocaleString('es-CL')} en multas acumuladas",
      texto:"El total de penalizaciones por reactiva representa el ${porcentajeMultas.toFixed(1)}% del gasto neto energético total ($${Math.round(totalMonto/1000000)}M).",
    },
    {
      id:3, icono:"📉", tipo:"critico",
      titulo:"Factor de Potencia promedio de ${fpPromedio.toFixed(3)}",
      texto:"Los niveles de eficiencia están bajo la meta óptima. Esto indica una carga inductiva significativa que no está siendo compensada adecuadamente.",
    },
    {
      id:4, icono:"📈", tipo:"oportunidad",
      titulo:"ROI de 4–6 meses con banco de condensadores",
      texto:"La instalación de un banco de condensadores de 30–50 kVAr eliminaría el recargo por energía reactiva casi totalmente.",
    },
    {
      id:5, icono:"🔮", tipo:"proyeccion",
      titulo:"Pérdida proyectada de $${Math.round(costoInaccion12m).toLocaleString('es-CL')} en 12 meses",
      texto:"Si no se implementa compensación reactiva, basado en el histórico, esta es la pérdida evitable en el próximo año.",
    },
    {
      id:6, icono:"✅", tipo:"recomendacion",
      titulo:"Recomendación: condensadores 30–50 kVAr",
      texto:"Se recomienda proceder con la instalación técnica. El periodo de retorno de inversión es extremadamente corto frente a la vida útil del equipo.",
    },
  ],

  serieConsumo: ${JSON.stringify(facturas.map(f => ({ mes: f.mes, activa: f.consumo_kWh, reactiva: f.reactiva_kVARh })), null, 2)},
};
`;

    fs.writeFileSync(outputPath, jsContent);
    console.log('Successfully updated vogt.js');
}

main().catch(console.error);
