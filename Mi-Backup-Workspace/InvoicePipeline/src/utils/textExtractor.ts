/**
 * Módulo de extracción de texto desde JSON parseado por LiteParse.
 * Centraliza la lógica que antes estaba duplicada en extractor.ts y Consumo_P.ts
 */

/**
 * Consolida todo el texto de un JSON parseado por LiteParse en un solo string.
 * Maneja múltiples formatos de salida de LiteParse (pages, text, objects).
 */
export function extractFullText(jsonContent: any): string {
  let fullText = '';

  if (jsonContent.pages) {
    for (const page of jsonContent.pages) {
      if (page.text) {
        fullText += page.text + '\n';
      } else if (page.objects) {
        fullText += page.objects.map((o: any) => o.text || o.str).join(' ');
      }
    }
  } else if (jsonContent.text) {
    fullText = jsonContent.text;
  }

  if (!fullText) {
    fullText = JSON.stringify(jsonContent);
  }

  return fullText;
}

/**
 * Divide el texto completo en líneas limpias (sin espacios al inicio/final, sin líneas vacías).
 */
export function getCleanLines(fullText: string): string[] {
  return fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

/**
 * Extrae el número de factura del texto completo.
 * Intenta varias heurísticas para mayor robustez.
 */
export function extractFacturaNumber(fullText: string): string {
  // Heurística 1: "Factura Electrónica" seguida de número (con palabras intermedias posibles)
  const factMatch = fullText.match(/FACTURA\s+ELECTRÓ?NICA[^\d]{0,50}(\d{7,10})/i);
  if (factMatch) return factMatch[1];

  // Heurística 2: N°, No, No. seguido de número
  const nMatchAlt = fullText.match(/(?:N°|No\.?|Número)[\s:]*(\d{7,10})/i);
  if (nMatchAlt) return nMatchAlt[1];

  // Heurística 3: Buscar un número de 8 dígitos en la parte superior (primeros 500 chars)
  // que no sea el RUT de Enel (93.913.000-4) ni el del cliente.
  // Esto es arriesgado pero útil como último recurso.
  const topText = fullText.substring(0, 1000);
  const candidateMatches = topText.match(/\b\d{7,9}\b/g);
  if (candidateMatches) {
    for (const m of candidateMatches) {
      // Ignorar números que parezcan fechas u otros datos conocidos
      if (m.startsWith('202') && m.length === 8) continue; // Parece año+mes+dia
      if (fullText.includes(`R.U.T.: ${m}`) || fullText.includes(`${m}-`)) continue; // Parece par de RUT
      return m;
    }
  }

  return '';
}

/**
 * Extrae y limpia un RUT del texto.
 */
export function extractRut(text: string): string {
  const rutMatch = text.match(/(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])/);
  if (rutMatch) {
    // Limpiar puntos para consistencia
    return rutMatch[1].replace(/\./g, '');
  }
  return '';
}
