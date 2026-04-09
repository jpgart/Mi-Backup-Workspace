# Antigravity Workspace Backup

Este repositorio contiene todo el código y archivos para procesar y extraer datos de las facturas PDF de Enel, incluyendo la configuración local de `llama-parse`.

## Requisitos Previos para el Nuevo Mac

Para que el proyecto funcione idénticamente en tu nueva máquina, necesitas configurar el entorno de Node.js e instalar las siguientes dependencias de sistema.

### 1. Entorno de Node.js
Se recomienda usar la versión 22 o superior de Node.js.
```bash
# Instalar Node.js y npm si no están presentes
brew install node
```

### 2. Instalar Homebrew (si no lo tienes)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 3. Instalar Dependencias del Sistema
Este proyecto requiere varias herramientas para el manejo de imágenes, OCR y procesamiento de documentos:
```bash
brew install tesseract
brew install tesseract-lang
brew install imagemagick
brew install ghostscript
brew install --cask libreoffice
```

*(Es posible que necesites descargar idiomas adicionales para Tesseract si no están incluidos en `tesseract-lang`, específicamente el español `spa.traineddata` y el inglés `eng.traineddata`. Los hemos incluido en el repositorio en `my-liteparse-project` o puedes copiarlos a `$(brew --prefix tesseract)/share/tessdata/`)*.

### 4. Configuración de Liteparse (Llama Parse Local)
Para mantener la estructura y el espaciado original de los documentos, es fundamental la configuración de los parámetros de parseo.

**Instalación con soporte `tsx`:**
```bash
cd light-parse-local
npm install
npm install -g tsx # Para soporte global de ejecución
npm run build
cd ..
```

## Preferencias del Proyecto Enel
Para garantizar que el parseo mantenga el **layout original, estructura y espaciado**, se utilizan los siguientes parámetros en el motor de OCR:

*   **ocrLanguage**: `español` (Priorizar sobre inglés)
*   **ocrEnable**: `yes`
*   **numWorkers**: `2`
*   **maxPages**: `default`
*   **targetPages**: `all`
*   **dpi**: `300` (Densidad recomendada para precisión)
*   **outputFormat**: `"json"` (Obligatorio para mantener metadatos de posición)
*   **preserveVerySmallText**: `true`
*   **preserveLayoutAlignmentAcrossPages**: `true`

### 5. Instalar dependencias de los módulos
**Carpeta de tu código (`my-liteparse-project`):**
```bash
cd my-liteparse-project
npm install
cd ..
```

**Carpeta de Extracción de Enel (`Enel_Parser`):**
```bash
cd Enel_Parser
npm install
cd ..
```

## Ejecutar el Proyecto
Para ejecutar el extractor de Enel usando `tsx`:
```bash
cd Enel_Parser
npx tsx extractor.ts
```
