# Sistema de Analítica Energética Universal ⚡

Este sistema transforma los archivos CSV generados por el pipeline de facturas en un Dashboard interactivo y reportes de insights automáticos.

## 🚀 Cómo empezar

### 1. Actualizar Datos y Generar Reporte
Cada vez que proceses nuevas facturas, ejecuta el script de actualización:

```bash
zsh analytics-system/scripts/update-system.sh
```

Este script:
- Sincroniza los CSVs desde la carpeta de salida.
- Genera el archivo `INSIGHTS.md` con hallazgos clave.
- Prepara el dashboard para su publicación.

### 2. Ver en local
Simplemente abre el archivo `analytics-system/apps/dashboard/index.html` en tu navegador.

### 3. Publicar en GitHub Pages
Para que el dashboard sea accesible vía web:
1. Asegúrate de que el código esté en un repositorio de GitHub.
2. Ve a **Settings > Pages**.
3. En **Build and deployment**, selecciona **GitHub Actions**.
4. Haz un `git push` de tus cambios. El sistema se desplegará automáticamente.

## 📊 Capacidades del Sistema

- **Inferencia de Columnas**: Detecta automáticamente columnas de fecha, montos y consumos sin importar el nombre exacto.
- **Multas por Reactiva**: Calcula penalizaciones basadas en la normativa chilena (FP < 0.93).
- **Propuesta de Condensadores**: Calcula el tamaño del banco (kVAr) necesario para alcanzar un FP de 0.98 y el ahorro mensual estimado.
- **Gráficos Dinámicos**: Comparación de gasto total vs consumo energético.

## 📁 Estructura del Proyecto

- `/apps/dashboard`: Dashboard interactivo (HTML/JS/CSS).
- `/lib`: Motor de analítica y sistema de diseño.
- `/scripts`: Scripts de automatización.
- `INSIGHTS.md`: Hallazgos automáticos detectados.
