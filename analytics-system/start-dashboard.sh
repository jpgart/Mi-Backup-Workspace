#!/bin/zsh

# Script para iniciar el Dashboard de Analítica Energética en local
# Esto evita errores de CORS al navegar los archivos CSV.

PORT=8000

echo "⚡ Iniciando servidor local en el root del proyecto..."
echo "🌐 Dashboard: http://localhost:$PORT/analytics-system/apps/dashboard/"
echo "📄 Reporte: http://localhost:$PORT/analytics-system/reports/output/INFORME_EJECUTIVO_VOGT.html"
echo ""
echo "Presiona Ctrl+C para detener el servidor."

# Servimos desde el root para permitir acceso a la carpeta /data
python3 -m http.server $PORT
