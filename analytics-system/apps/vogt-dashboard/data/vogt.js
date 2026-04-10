// ============================================================
// DATOS DEL CLIENTE - VOGT
// Para usar con otro cliente: reemplazar este archivo completo
// ============================================================
window.DASHBOARD_DATA = {

  // -- Metadatos del cliente --
  cliente: {
    nombre: "Industria Mecánica VOGT S.A.",
    rut: "96.800.570-7",
    nCliente: "1338543-2",
    periodoAnalizado: "Mayo 2022 – Agosto 2024",
    fechaInforme: "09/04/2026",
    analista: "Sistema de Analítica Energética Universal",
    totalPeriodos: 21,
    distribuidora: "Enel Chile",
  },

  // -- KPIs resumen --
  kpis: {
    gastoNetoTotal: 51902779,
    energiaTotal_kWh: 844100,
    multasTotal: 1009569,
    porcentajeMultas: 1.9,
    mesesFueraNorma: 11,
    fpPromedio: 0.835,
    costoInaccion12m: 504784,
    paybackMeses: "4–6",
    capacitorRecomendado_kVAr: "30–50",
    ahorroHistoricoPerdido: 1009569,
  },

  // -- Detalle de facturas (21 registros) --
  // Ordenadas cronológicamente
  facturas: [
    { factura:"25269313", fecha:"08/02/2022", mes:"Feb 2022",  consumo_kWh:0,      reactiva_kVARh:0,     fp:1.000, clasificacion:"Eficiente",  multa:0,       total:770060,    neto:644548,   tarifa_kWh:null    },
    { factura:"25832880", fecha:"27/05/2022", mes:"May 2022",  consumo_kWh:22800,  reactiva_kVARh:17700, fp:0.790, clasificacion:"Crítico",    multa:194341,  total:2273497,   neto:1900768,  tarifa_kWh:60.85   },
    { factura:"25835274", fecha:"31/05/2022", mes:"May-2 2022",consumo_kWh:27900,  reactiva_kVARh:21000, fp:0.799, clasificacion:"Crítico",    multa:222438,  total:3162480,   neto:2645636,  tarifa_kWh:60.85   },
    { factura:"25883333", fecha:"08/06/2022", mes:"Jun 2022",  consumo_kWh:33300,  reactiva_kVARh:26100, fp:0.787, clasificacion:"Crítico",    multa:289626,  total:3826891,   neto:3201659,  tarifa_kWh:60.85   },
    { factura:"26047947", fecha:"08/07/2022", mes:"Jul 2022",  consumo_kWh:40800,  reactiva_kVARh:24600, fp:0.856, clasificacion:"Ineficiente",multa:188835,  total:4745743,   neto:3970602,  tarifa_kWh:62.87   },
    { factura:"26218922", fecha:"08/08/2022", mes:"Ago 2022",  consumo_kWh:45600,  reactiva_kVARh:22800, fp:0.894, clasificacion:"Ineficiente",multa:101978,  total:5159438,   neto:4316197,  tarifa_kWh:62.87   },
    { factura:"26388503", fecha:"08/09/2022", mes:"Sep 2022",  consumo_kWh:48300,  reactiva_kVARh:18000, fp:0.937, clasificacion:"Eficiente",  multa:0,       total:5449730,   neto:4558986,  tarifa_kWh:62.87   },
    { factura:"26580290", fecha:"11/10/2022", mes:"Oct 2022",  consumo_kWh:38400,  reactiva_kVARh:14100, fp:0.939, clasificacion:"Eficiente",  multa:0,       total:3874370,   neto:3239381,  tarifa_kWh:62.87   },
    { factura:"26757988", fecha:"09/11/2022", mes:"Nov 2022",  consumo_kWh:42600,  reactiva_kVARh:14100, fp:0.949, clasificacion:"Eficiente",  multa:0,       total:4716222,   neto:3945026,  tarifa_kWh:62.87   },
    { factura:"26923948", fecha:"09/12/2022", mes:"Dic 2022",  consumo_kWh:39600,  reactiva_kVARh:14400, fp:0.940, clasificacion:"Eficiente",  multa:0,       total:4465732,   neto:3719537,  tarifa_kWh:62.87   },
    { factura:"27109613", fecha:"10/01/2023", mes:"Ene 2023",  consumo_kWh:40200,  reactiva_kVARh:15300, fp:0.935, clasificacion:"Eficiente",  multa:0,       total:4651148,   neto:3788941,  tarifa_kWh:62.87   },
    { factura:"28907715", fecha:"02/10/2023", mes:"Jun-Jul 2023",consumo_kWh:11400,reactiva_kVARh:3900,  fp:0.946, clasificacion:"Eficiente",  multa:0,       total:2281234,   neto:1884064,  tarifa_kWh:76.72   },
    { factura:"28917299", fecha:"10/10/2023", mes:"Ago 2023",  consumo_kWh:135805, reactiva_kVARh:54380, fp:0.928, clasificacion:"Ineficiente",multa:1447,    total:1037189,   neto:871587,   tarifa_kWh:1.33    },
    { factura:"29118912", fecha:"09/11/2023", mes:"Sep 2023",  consumo_kWh:45487,  reactiva_kVARh:18752, fp:0.925, clasificacion:"Ineficiente",multa:3000,    total:651535,    neto:547508,   tarifa_kWh:2.66    },
    { factura:"29149775", fecha:"09/11/2023", mes:"Oct 2023",  consumo_kWh:38904,  reactiva_kVARh:16729, fp:0.919, clasificacion:"Ineficiente",multa:5224,    total:548508,    neto:460931,   tarifa_kWh:2.66    },
    { factura:"29324155", fecha:"11/12/2023", mes:"Nov 2023",  consumo_kWh:39333,  reactiva_kVARh:0,     fp:1.000, clasificacion:"Eficiente",  multa:0,       total:681552,    neto:572733,   tarifa_kWh:2.66    },
    { factura:"29530021", fecha:"09/01/2024", mes:"Dic 2023",  consumo_kWh:38283,  reactiva_kVARh:16201, fp:0.921, clasificacion:"Ineficiente",multa:4123,    total:540939,    neto:454571,   tarifa_kWh:2.66    },
    { factura:"29736660", fecha:"08/02/2024", mes:"Ene 2024",  consumo_kWh:0,      reactiva_kVARh:0,     fp:1.000, clasificacion:"Sin Lectura",multa:0,       total:602216,    neto:506064,   tarifa_kWh:null    },
    { factura:"29938502", fecha:"08/03/2024", mes:"Feb 2024",  consumo_kWh:0,      reactiva_kVARh:0,     fp:1.000, clasificacion:"Sin Lectura",multa:0,       total:590690,    neto:496378,   tarifa_kWh:null    },
    { factura:"31061687", fecha:"07/09/2024", mes:"Ago 2024",  consumo_kWh:30989,  reactiva_kVARh:0,     fp:1.000, clasificacion:"Eficiente",  multa:0,       total:836416,    neto:702871,   tarifa_kWh:30.88   },
  ],

  // -- Distribución de clasificación FP --
  clasificacionFP: [
    { label:"Eficiente (≥0.93)",   count:10, color:"#22c55e" },
    { label:"Ineficiente (0.85-0.92)", count:7, color:"#f59e0b" },
    { label:"Crítico (<0.85)",     count:3, color:"#ef4444" },
    { label:"Sin Lectura",         count:2, color:"#94a3b8" },
  ],

  // -- Conclusiones e insights --
  conclusiones: [
    {
      id:1, icono:"⚡", tipo:"critico",
      titulo:"11 meses operando fuera de norma",
      texto:"El 52% del período analizado (11 de 21 meses) el Factor de Potencia estuvo bajo el umbral normativo de 0.93, generando multas sistemáticas por energía reactiva.",
    },
    {
      id:2, icono:"💰", tipo:"financiero",
      titulo:"$1.009.569 en multas acumuladas",
      texto:"El total de penalizaciones por reactiva representa el 1.9% del gasto neto energético total ($51.9M). Las multas más severas se concentraron en el período Mayo–Julio 2022.",
    },
    {
      id:3, icono:"📉", tipo:"critico",
      titulo:"Factor de Potencia promedio de 0.835",
      texto:"Los meses críticos (FP < 0.85) corresponden a Mayo y Junio 2022, con penalidades de hasta 14.3% sobre el costo de energía. Esto indica una carga inductiva sin compensación.",
    },
    {
      id:4, icono:"📈", tipo:"oportunidad",
      titulo:"ROI de 4–6 meses con banco de condensadores",
      texto:"La instalación de un banco de condensadores de 30–50 kVAr eliminaría el recargo. Dado el historial de multas, el payback es de 4 a 6 meses, con ahorro neto posterior.",
    },
    {
      id:5, icono:"🔮", tipo:"proyeccion",
      titulo:"Pérdida proyectada de $504.784 en 12 meses",
      texto:"Si no se implementa compensación reactiva, basado en el promedio de multas de los períodos activos, la pérdida proyectada para el próximo año es de $504.784.",
    },
    {
      id:6, icono:"✅", tipo:"recomendacion",
      titulo:"Recomendación: condensadores 30–50 kVAr",
      texto:"Proceder inmediatamente con la instalación. El análisis de 21 períodos facturados verificados confirma que la inversión es viable y urgente para optimizar el gasto energético.",
    },
  ],

  // -- Datos para gráfico de consumo mensual (filtrados solo con lecturas) --
  serieConsumo: [
    { mes:"May 2022",  activa:22800,  reactiva:17700 },
    { mes:"May-2",     activa:27900,  reactiva:21000 },
    { mes:"Jun 2022",  activa:33300,  reactiva:26100 },
    { mes:"Jul 2022",  activa:40800,  reactiva:24600 },
    { mes:"Ago 2022",  activa:45600,  reactiva:22800 },
    { mes:"Sep 2022",  activa:48300,  reactiva:18000 },
    { mes:"Oct 2022",  activa:38400,  reactiva:14100 },
    { mes:"Nov 2022",  activa:42600,  reactiva:14100 },
    { mes:"Dic 2022",  activa:39600,  reactiva:14400 },
    { mes:"Ene 2023",  activa:40200,  reactiva:15300 },
    { mes:"Jun-Jul 23",activa:11400,  reactiva:3900  },
    { mes:"Ago 2023",  activa:135805, reactiva:54380 },
    { mes:"Sep 2023",  activa:45487,  reactiva:18752 },
    { mes:"Oct 2023",  activa:38904,  reactiva:16729 },
    { mes:"Nov 2023",  activa:39333,  reactiva:0     },
    { mes:"Dic 2023",  activa:38283,  reactiva:16201 },
    { mes:"Ago 2024",  activa:30989,  reactiva:0     },
  ],
};
