# ⚡ VOGT Energy Analytics Dashboard — Walkthrough

## Qué se construyó

Una nueva app de analytics estática (sin build, sin servidor) lista para **GitHub Pages**, que reemplaza y supera al dashboard-react anterior.

---

## Estructura de archivos

```
analytics-system/apps/vogt-dashboard/
├── index.html          ← App completa (una sola página, ~58KB)
├── data/
│   └── vogt.js         ← Todos los datos embebidos (reemplazar para nuevo cliente)
└── README.md
```

> [!IMPORTANT]
> Para **replicar con otro cliente**, solo duplica la carpeta y reemplaza `data/vogt.js` con los datos del nuevo cliente. No se necesita recompilar nada.

---

## Páginas del Dashboard

| Sección | Contenido |
|---------|-----------|
| **Dashboard** | KPIs, alerta de norma, gráficos de consumo, FP y gasto |
| **Facturas** | Tabla completa de 21 facturas + tab filtrado con multas |
| **Factor de Potencia** | Gráfico FP vs norma, índice reactiva/activa, tabla detallada |
| **Consumo Energético** | Serie temporal activa/reactiva, tarifa $/kWh, mix %, tabla medidores |
| **Conclusiones** | 6 cards de insights + tabla resumen ejecutivo de 8 puntos |
| **ROI & Proyección** | Panel ROI, multas acumuladas, proyección 12m, desglose gasto |

---

## Capturas de pantalla

![Dashboard principal](/Users/jpga/.gemini/antigravity/brain/a4919c66-c08e-4991-959a-603ddea4db93/.system_generated/click_feedback/click_feedback_1775826817493.png)
*Dashboard con KPIs, alerta normativa y visualizaciones clave*

![Factor de Potencia](/Users/jpga/.gemini/antigravity/brain/a4919c66-c08e-4991-959a-603ddea4db93/.system_generated/click_feedback/click_feedback_1775826924825.png)
*Análisis FP vs norma 0.93 e índice de reactiva*

![Conclusiones](/Users/jpga/.gemini/antigravity/brain/a4919c66-c08e-4991-959a-603ddea4db93/.system_generated/click_feedback/click_feedback_1775827016379.png)
*Cards de insights y tabla resumen ejecutivo*

---

## Stack tecnológico

- **HTML + Vanilla CSS + JS puro** — sin frameworks, sin build
- **Chart.js 4.4** via CDN — 6 tipos de gráficos
- **Google Fonts** (Space Grotesk + JetBrains Mono)
- **100% estático** — funciona abriendo `index.html` directamente

---

## Deploy a GitHub Pages

1. Subir la carpeta `vogt-dashboard/` al repositorio
2. Settings → Pages → Branch: main, Folder: `/analytics-system/apps/vogt-dashboard`
3. La app queda disponible en `https://usuario.github.io/repo/analytics-system/apps/vogt-dashboard/`

---

## Para replicar con otro cliente

1. Copiar `vogt-dashboard/` → `nuevo-cliente-dashboard/`
2. Editar `data/vogt.js`:
   - Cambiar `window.DASHBOARD_DATA.cliente` con los datos del cliente
   - Reemplazar `facturas[]`, `serieConsumo[]`, `conclusiones[]`, `kpis{}`
3. Listo — la app se adapta automáticamente a los nuevos datos

---

## Datos embebidos en `vogt.js`

| Dataset | Registros | Descripción |
|---------|-----------|-------------|
| `facturas` | 20 | Todas las facturas con FP, multas y totales |
| `serieConsumo` | 17 | kWh activo y kVARh reactivo por período |
| `clasificacionFP` | 4 | Distribución Eficiente/Ineficiente/Crítico/Sin lectura |
| `conclusiones` | 6 | Hallazgos con tipo, ícono, título y texto |
| `kpis` | — | Objeto con todos los KPIs del período |
| `cliente` | — | Metadata del cliente (nombre, RUT, período) |
