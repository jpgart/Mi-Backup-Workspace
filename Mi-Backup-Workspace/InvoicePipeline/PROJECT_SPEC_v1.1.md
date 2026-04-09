# Proyecto: InvoicePipeline v1.1 — Especificación Técnica y Lógica de Negocio

Este documento detalla la arquitectura, lógica de extracción y algoritmos de cálculo del sistema **InvoicePipeline**, diseñado para procesar y auditar facturas eléctricas de Enel (Chile). El objetivo es permitir la replicación exacta de las funcionalidades por otro sistema o LLM.

---

## 1. Arquitectura del Sistema
El sistema es una pipeline modular escrita en **TypeScript** que transforma PDFs no estructurados en reportes analíticos estructurados.

### Flujo de Datos:
1.  **Ingesta**: Selección de una carpeta de entrada con PDFs.
2.  **Fase 1 (Parsing)**: Uso de **LiteParse** para extraer solo la **primera página** de cada PDF a un formato JSON enriquecido con coordenadas (OCR).
3.  **Fase 2 (Extracción)**: Procesamiento de JSON para extraer datos maestros, lecturas de medidores y tablas de cobros.
4.  **Fase 3 (Análisis)**: Ejecución de módulos especializados en energía reactiva y auditoría financiera.
5.  **Fase 4 (Consolidación)**: Generación de un reporte maestro con verificaciones cruzadas.

---

## 2. Lógicas de Extracción (Heurísticas)

### A. Identificación de Documento (N° Factura)
Debido a la variabilidad del OCR, se utiliza una cascada de 3 niveles:
1.  **Regex Estricto**: Busca el patrón `2[0-9]{7}` (8 dígitos empezando con 2) cerca de las palabras "FACTURA ELECTRÓNICA".
2.  **Timbre SII**: Extrae el bloque de datos del *Timbre Electrónico S.I.I*. El Número de Factura se encuentra en la posición de caracteres 10 a 18 de la cadena numérica del timbre.
3.  **Fallback**: Busca cualquier número de 8 dígitos en la zona superior derecha del documento.

### B. Lógica de Consenso (Consistencia del Cliente)
Para evitar que errores de OCR generen múltiples nombres para un mismo cliente en un proyecto:
- Se extrae el Nombre y RUT de cada PDF.
- Se aplica un algoritmo de **Moda (Majority Vote)** sobre todo el set de archivos.
- El valor predominante se impone a todos los registros del proyecto.

### C. Extracción de Medidores (Robustez Multi-Línea)
Las facturas de Enel pueden tener varias lecturas para un mismo medidor en una tabla compacta.
- **Regex de ID**: `([0-9A-Z]{6,15})\s+([a-zA-ZñÑ...]+)`
- **Regex de Métricas**: `([\d\.]+,\d{2,3})\s+([\d\.]+,\d{2,3})\s+([\d\.]+,\d{2,3})\s+(\d+)` (Constante, Anterior, Actual, Consumo).
- **Estado**: Si una línea tiene métricas pero no ID, se asigna al último `MedidorID` detectado (Captura de periodos adicionales).

---

## 3. Algoritmos y Cálculos

### D. Energía Reactiva y Factor de Potencia (FP)
El cálculo del FP y la multa estimada se basa en la normativa de distribución eléctrica chilena.

**Fórmulas:**
1.  **FP Calculado**: `cos(atan(Reactiva / Activa))`
    - *Nota*: Si Reactiva es 0, FP = 1.000.
2.  **Factor de Multa (%M)**:
    - Si $FP \geq 0.93 \implies 0$
    - Si $FP < 0.93 \implies (0.93 - FP) \times 100 \times 1$ (Aproximación lineal del recargo).
3.  **Multa Estimada ($)**: `%M \times \text{Monto Neto de Electricidad}`

### E. Auditoría Financiera (Verificaciones)
1.  **Verificación IVA**: `abs((Neto * 0.19) - IVA_Extraido) <= 1`.
2.  **Verificación Total**: `abs((Neto + IVA + Exento) - Total_Extraido) <= 2`.
3.  **Alerta Transporte**: El costo de transporte debe estar entre el **8% y 10%** del Monto Neto. Valores fuera de este rango marcan una alerta para revisión de tarifas contratadas.

### F. Verificación de Energía (Sanity Check)
Cruza dos tablas independientes:
- **Energía Facturada ($E_F$)**: Extraída del paréntesis en el concepto "Electricidad Consumida (XXXXkWh)".
- **Energía Medida ($E_M$)**: Suma de todos los consumos en la tabla de medidores para esa factura.
- **Alerta**: Si `abs(E_F - E_M) > 1`, se marca un error de integridad de datos.

---

## 4. Estructura de Salida (Output)

Los archivos se organizan por proyecto con nomenclatura: `[Cliente] - [Tipo].csv`

| Archivo | Contenido Clave |
|:---|:---|
| **Consolidado** | Datos maestros, Fechas, Totales Financieros. |
| **Medidores** | Lecturas históricas, constantes, números de serie. |
| **Consumo_P** | Desglose de "Electricidad Consumida", "Transporte", "Arriendos", etc. |
| **Calculo_Reactiva** | Detalle de FP, Multas estimadas y calificación de eficiencia (Eficiente, Ineficiente, Crítico). |
| **Resumen_Cliente** | **Master Table**. 31 columnas con todos los KPIs y alertas de auditoría. |

---

## 5. Requerimientos Técnicos
- **Entorno**: Node.js (v18+).
- **Motor**: `tsx` para ejecución directa de TypeScript.
- **Librerías**: `csv-writer`, `path`, `fs`.
- **Estructura de Carpeta**:
  - `data/input_pdfs/`: PDFs fuente.
  - `data/output_json/`: Resultados JSON y CSV.
