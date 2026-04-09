import * as path from 'path';

/**
 * Configuración centralizada de rutas y constantes del pipeline.
 */

// Raíz del directorio de datos (my-liteparse-project/data)
export const DATA_ROOT = path.resolve(__dirname, '../../my-liteparse-project/data');

// Directorio donde están las subcarpetas con PDFs
export const INPUT_PDFS_DIR = path.join(DATA_ROOT, 'input_pdfs');

// Directorio donde se crearán las subcarpetas de output
export const OUTPUT_ROOT_DIR = path.join(DATA_ROOT, 'output_json');

// Subcarpetas internas por cliente
export const OUTPUT_SUBFOLDERS = {
  JSON: 'json',
  CSV: 'csv',
} as const;

// Constantes de negocio (regulación chilena)
export const IVA_RATE = 0.19;
export const FP_THRESHOLD = 0.93;
export const MPC_KWH_THRESHOLD = 350;
export const MPC_CHARGE_PER_KWH = 22; // Pesos por kWh (2024-2027)
export const EXPECTED_TRANSPORT_PERCENTAGE_MIN = 0.08;
export const EXPECTED_TRANSPORT_PERCENTAGE_MAX = 0.10;

// Nombres base de archivos de output
export const OUTPUT_FILES = {
  CONSOLIDADO: 'Consolidado.csv',
  MEDIDORES: 'Medidores.csv',
  CONSUMO: 'Consumo_P.csv',
  REACTIVA: 'Calculo_Reactiva.csv',
  RESUMEN: 'Resumen_Cliente.csv',
} as const;
