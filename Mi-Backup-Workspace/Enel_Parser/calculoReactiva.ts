import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

export async function calcularReactiva() {
    const medidoresCsvPath = path.join(process.cwd(), 'Medidores.csv');
    const outCsvPath = path.join(process.cwd(), 'Calculo_Reactiva.csv');

    if (!fs.existsSync(medidoresCsvPath)) {
        console.error(`No existe el archivo ${medidoresCsvPath}`);
        return;
    }

    const content = fs.readFileSync(medidoresCsvPath, 'utf-8').trim();
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    
    // Asumimos que la primera línea es el header
    const headers = parseLine(lines[0]);
    
    interface GroupData {
        archivo: string;
        n_factura: string;
        activa: number;
        reactiva: number;
    }
    
    const facturas: { [key: string]: GroupData } = {};

    for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        if (row.length < 8) continue;

        const archivo = row[0];
        const n_factura = row[1];
        const n_medidor = row[2];
        const consumo = parseFloat(row[7]);

        const key = `${archivo}_${n_factura}`;
        if (!facturas[key]) {
            facturas[key] = {
                archivo: archivo,
                n_factura: n_factura,
                activa: 0,
                reactiva: 0
            };
        }

        if (n_medidor.endsWith('R')) {
            facturas[key].reactiva += consumo;
        } else {
            facturas[key].activa += consumo;
        }
    }

    const outputRecords = [];

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
        
        // Redondear a 4 decimales durante el cálculo intermedio pero reportar con 3
        const fp_exact = fp;

        if (fp_exact < 0.93 && f.reactiva > 0) {
            multa_positiva = 'SI';
            diferencia_fp = 0.93 - fp_exact;
            multa_porcentaje = diferencia_fp * 100;
        }

        // Dejar el valor de tarifa KWh en "Stand by" por ahora
        const valor_kwh_cobrado = "PENDIENTE"; 
        const multa_pesos = "PENDIENTE"; 

        outputRecords.push({
            archivo: f.archivo,
            n_factura: f.n_factura,
            consumo_activa: f.activa.toFixed(2),
            consumo_reactiva: f.reactiva.toFixed(2),
            fp_calculado: fp_exact.toFixed(3),
            diferencia_fp: diferencia_fp > 0 ? diferencia_fp.toFixed(3) : "0.000",
            valor_kwh_cobrado: valor_kwh_cobrado,
            multa_pesos: multa_pesos,
            multa_positiva: multa_positiva
        });
    }

    const csvWriter = createObjectCsvWriter({
        path: outCsvPath,
        header: [
            { id: 'archivo', title: 'Archivo Fuente' },
            { id: 'n_factura', title: 'N° Factura' },
            { id: 'consumo_activa', title: 'Consumo Activa (kWh)' },
            { id: 'consumo_reactiva', title: 'Consumo Reactiva (kVARh)' },
            { id: 'fp_calculado', title: 'FP Calculado' },
            { id: 'diferencia_fp', title: 'Diferencia FP (0,93 - FP)' },
            { id: 'valor_kwh_cobrado', title: 'Valor kWh Cobrado' },
            { id: 'multa_pesos', title: 'Multa Estimada (Pesos)' },
            { id: 'multa_positiva', title: 'Multa Positiva?' }
        ]
    });

    await csvWriter.writeRecords(outputRecords);
    console.log(`⚡ ¡Cálculo de Reactiva Completado!`);
    console.log(`📂 Procesadas ${outputRecords.length} facturas.`);
    console.log(`💾 Los cálculos de Factor de Potencia se exportaron a: Calculo_Reactiva.csv`);
}

// Permitir ejecución directa como script independiente
if (require.main === module) {
    calcularReactiva().catch(console.error);
}
