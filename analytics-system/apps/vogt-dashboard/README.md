# VOGT Energy Analytics Dashboard

Dashboard estático de análisis energético para Industria Mecánica VOGT.
Diseñado para deployment en GitHub Pages.

## Estructura

```
vogt-dashboard/
├── index.html          # App principal (single-file, sin build)
├── data/
│   └── vogt.js         # Datos embebidos (reemplazable para otros clientes)
└── README.md
```

## Deploy a GitHub Pages

1. Copiar la carpeta `vogt-dashboard/` al repositorio
2. Habilitar GitHub Pages desde `Settings > Pages`
3. Seleccionar la carpeta raíz o `/docs`

## Para otro cliente

Duplicar la carpeta, reemplazar `data/vogt.js` con los nuevos datos del cliente.
