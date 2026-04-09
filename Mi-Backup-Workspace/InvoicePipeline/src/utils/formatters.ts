/**
 * Utilidades de formateo para montos en CLP (Pesos Chilenos).
 * Los montos en Chile usan puntos como separador de miles (ej: 1.234.567).
 */

/**
 * Convierte un número a formato CLP con puntos como separador de miles.
 * Ejemplo: 1234567 → "1.234.567"
 */
export function formatCLP(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parsea un string en formato CLP a número.
 * Ejemplo: "1.234.567" → 1234567
 */
export function parseCLP(str: string): number {
  if (!str || str.trim() === '') return 0;
  return parseInt(str.replace(/\./g, ''), 10) || 0;
}

/**
 * Redondea un número a N decimales.
 */
export function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}
