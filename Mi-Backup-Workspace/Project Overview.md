Listed directory Mi-Backup-Workspace
Viewed README.md:1-79
Listed directory Enel_Parser
Listed directory InvoicePipeline
Listed directory light-parse-local
Listed directory my-liteparse-project
Viewed README.md:1-68
Listed directory src
Listed directory info

Cada carpeta en tu espacio de trabajo `Mi-Backup-Workspace` cumple un rol específico en el flujo de trabajo de extracción y análisis de facturas de Enel. Aquí te explico para qué sirve cada una:

### 1. `InvoicePipeline` (El Cerebro v1.1) 📊
Es la versión más reciente y moderna de tu pipeline de procesamiento. Está diseñada de forma modular bajo **TypeScript** y es el "orquestador" principal.
*   **Función**: Automatiza todo el flujo, desde el parseo hasta la generación de reportes maestros.
*   **Lo más importante**: Aquí se gestiona la **Integridad Total** (captura de líneas no reconocidas, alertas de consumo cero y verificaciones financieras como "Saldo Anterior" y "Total a Pagar").
*   **Uso**: Se ejecuta mediante `npm start` para procesar clientes y generar el `Resumen_Cliente.csv`.

### 2. `Enel_Parser` (Los Scripts de Extracción) 🛠️
Esta carpeta contiene los scripts originales y la lógica de negocio específica para leer los datos extraídos por el OCR.
*   **Scripts clave**:
    *   `extractor.ts`: El extractor principal de cabeceras y RUTs.
    *   `Consumo_P.ts`: Se encarga de capturar el detalle de cada línea de cobro.
    *   `calculoReactiva.ts`: Aplica la normativa chilena para calcular el Factor de Potencia (FP) y multas por energía reactiva.
*   **`info/`**: Contiene documentos legales (`Law-Invoice Law.md`, `Law-Calculo Reactiva.md`) que sirven de referencia para las reglas de negocio.
*   **Resultados**: Guarda los archivos CSV consolidados (`Consolidado.csv`, `Medidores.csv`, etc.).

### 3. `light-parse-local` (El Motor OCR) ⚙️
Es la instalación local del motor **LiteParse** (basado en llama-parse). 
*   **Función**: Es la herramienta que toma los PDFs "crudos" y los convierte en archivos **JSON** o **Markdown**. 
*   **Por qué es crucial**: Está configurada para mantener el **layout original** y el espaciado de la factura, permitiendo que los scripts de extracción (como los de `Enel_Parser`) puedan encontrar los datos en posiciones específicas.

### 4. `my-liteparse-project` (Puente y Almacén de Datos) 📁
Es el proyecto que utiliza el motor de `light-parse-local` para realizar las conversiones.
*   **`data/`**: Aquí es donde normalmente se guardan los archivos JSON resultantes del parseo masivo de PDFs. Es la fuente de entrada de datos para `InvoicePipeline`.
*   **`traineddata`**: Contiene archivos de soporte para Tesseract OCR (en español e inglés) para asegurar que el motor reconozca correctamente los caracteres de las facturas.

---

### Resumen del Flujo de Trabajo:
1.  **PDFs** se procesan en `my-liteparse-project` usando el motor de `light-parse-local`.
2.  Los **JSONs** resultantes se guardan en `my-liteparse-project/data`.
3.  `InvoicePipeline` (o los scripts individuales en `Enel_Parser`) leen esos JSONs para extraer los datos.
4.  Se generan los **CSV** finales con todo el análisis financiero y energético.

¿Te gustaría que profundice en el funcionamiento de algún script específico dentro de estas carpetas?