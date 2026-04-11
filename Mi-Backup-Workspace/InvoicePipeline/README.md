# InvoicePipeline 📊

Pipeline automatizado de alto rendimiento para el procesamiento, extracción y análisis de facturas eléctricas (Enel - Chile).

## ¿Qué hace?

1.  **Parsea PDFs** → Convierte facturas PDF a JSON (solo primera página para velocidad).
2.  **Extracción de Datos Maestros** → Genera `Consolidado.csv` (encabezados, RUT, fechas) y `Medidores.csv` (lecturas de activa y reactiva).
3.  **Análisis de Consumo Detallado** → Genera `Consumo_P.csv` con integridad total de datos (captura todas las líneas de cobro).
4.  **Cálculo de Energía Reactiva** → Genera `Calculo_Reactiva.csv` con Factor de Potencia (FP) y multas estimadas según la normativa chilena.
5.  **Resumen Analítico (Master Report)** → Genera `Resumen_Cliente.csv` con 33 columnas de datos cruzados, KPI financieros y verificaciones automáticas.

## Novedades v1.1 — Integridad y Control

Hemos implementado un sistema de **Integridad Total** para garantizar que no se pierda información crítica durante el OCR:

*   **Captura de Líneas No Reconocidas**: Cualquier línea de texto que no encaje en los patrones conocidos se captura y se marca explícitamente como `⚠️ LÍNEA NO RECONOCIDA` para revisión manual.
*   **Alerta de Consumo Cero**: Si una factura no contiene datos de consumo eléctrico (kWh=0), el sistema levanta una `🔴 ALERTA` visual tanto en el CSV de consumo como en el resumen macro.
*   **Extracción Financiera Robusta**:
    *   **Saldo Anterior**: Identifica la deuda real acumulada de períodos previos.
    *   **Total a Pagar**: Rescata el monto definitivo a cancelar, incluso en formatos heredados (2022) o modernos (2024).
*   **Verificación de Energía**: Cruce automático entre la energía facturada y la medida por el contador.

## Uso

```bash
# Instalar dependencias
npm install

# Ejecutar pipeline interactivo (Selección de cliente y análisis)
npm start

# Ejecutar solo análisis de JSONs existentes
npm run analyze
```

## Estructura de Salida

Los resultados se organizan por cliente en la carpeta del proyecto `my-liteparse-project`:

```
data/output_json/[CLIENTE]/csv/
├── [CLIENTE] - Consolidado.csv
├── [CLIENTE] - Medidores.csv
├── [CLIENTE] - Consumo_P.csv       ← Detalle con alertas de integridad
├── [CLIENTE] - Calculo_Reactiva.csv
└── [CLIENTE] - Resumen_Cliente.csv ← Reporte maestro con 33 columnas
```

## KPI y Verificaciones en el Reporte Maestro

El `Resumen_Cliente.csv` permite una auditoría rápida mediante las siguientes verificaciones:

*   **Verificación Energía**: Detecta discrepancias entre facturación y medición (o alertas de consumo cero).
*   **Total a Pagar ($)**: Columna dedicada para control de flujo de caja.
*   **Tarifa$/kWh**: Costo unitario real estimado para el período.
*   **Factor de Potencia (FP)**: Clasificación (Eficiente/Ineficiente/Crítico) y multa estimada.
*   **Ahorro Potencial**: Cuantificación monetaria del beneficio al corregir el FP.
*   **Verificación IVA/Total**: Comprobación matemática de la consistencia contable del documento.
*   **Alerta Transporte**: Detecta si el % de transporte sobre el neto sale del rango esperado (8-10%).

## Arquitectura

*   **TypeScript**: Código robusto y tipado.
*   **Modular**: Lógica separada por responsabilidades (Extractor, Consumo, Reactiva, Resumen).
*   **Agnóstico**: Diseñado para soportar múltiples clientes compartiendo la misma lógica de negocio.
*   **Resiliente**: Capaz de procesar facturas Enel legacy (2022) y actuales (2024) sin cambios manuales.
