# InvoicePipeline 📊

Pipeline automatizado para el procesamiento de facturas eléctricas (Enel - Chile).

## ¿Qué hace?

1. **Parsea PDFs** → Convierte facturas PDF a JSON (solo primera página)
2. **Extrae datos** → Genera `Consolidado.csv` con datos maestros y `Medidores.csv` con lecturas
3. **Analiza consumo** → Genera `Consumo_P.csv` con desglose detallado de cobros
4. **Calcula reactiva** → Genera `Calculo_Reactiva.csv` con Factor de Potencia y multas estimadas
5. **Resumen analítico** → Genera `Resumen_Cliente.csv` con datos cruzados y verificaciones

## Uso

```bash
# Instalar dependencias
npm install

# Ejecutar pipeline completo
npm start

# Solo parsear PDFs (sin análisis)
npm run parse

# Solo analizar JSONs existentes (sin re-parsear)
npm run analyze
```

## Estructura de Datos

```
my-liteparse-project/data/
├── input_pdfs/
│   ├── ENEL -VOGT 2022 - 2024/   ← PDFs de cada cliente
│   └── ...
└── output_json/
    ├── ENEL -VOGT 2022 - 2024/    ← JSONs + CSVs del cliente
    │   ├── *.json
    │   ├── Consolidado.csv
    │   ├── Medidores.csv
    │   ├── Consumo_P.csv
    │   ├── Calculo_Reactiva.csv
    │   └── Resumen_Cliente.csv
    └── ...
```

## Datos Analíticos Extraídos

El `Resumen_Cliente.csv` incluye:

- **Tarifa estimada por kWh** (Costo Electricidad / kWh consumidos)
- **% Transporte sobre Neto** (esperado: 8-10%)
- **Factor de Potencia calculado** con clasificación (Eficiente/Ineficiente/Crítico)
- **Multa reactiva en pesos** (ya no "PENDIENTE")
- **Verificación IVA** (Neto × 19% = IVA declarado)
- **Verificación Total** (Neto + IVA ≈ Total)
- **Ahorro potencial** por corrección de FP

## Basado en

Scripts originales del proyecto `Enel_Parser`, mejorados con:
- Arquitectura modular
- Selección interactiva de carpetas
- Solo primera página de PDF
- Output organizado por cliente
- Resumen analítico con verificaciones
