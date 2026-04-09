# **Manual técnico de facturación eléctrica para el sector empresarial en Chile: Guía exhaustiva para el entrenamiento de modelos de lenguaje y procesamiento documental**

La industria eléctrica en Chile se rige por un marco regulatorio sofisticado que divide el suministro en tres segmentos fundamentales: generación, transmisión y distribución. Para un modelo de lenguaje de gran escala (LLM) encargado de procesar facturas en formato PDF, la comprensión de esta estructura no es simplemente una tarea de reconocimiento de caracteres, sino un ejercicio de interpretación normativa y técnica. Las empresas en Chile, dependiendo de su tamaño y consumo, interactúan con estos segmentos de formas diversas, lo que se traduce en una variedad de cargos, glosas y parámetros que deben ser extraídos y validados con precisión quirúrgica. El presente informe detalla la lógica subyacente de cada concepto facturado, estableciendo los rangos técnicos, las fórmulas matemáticas y los identificadores necesarios para una automatización exitosa del procesamiento de estas cuentas.

## **El marco regulatorio y la segmentación de clientes**

El sistema eléctrico chileno se fundamenta en la Ley General de Servicios Eléctricos (LGSE), la cual establece dos categorías principales de clientes basándose en su capacidad de demanda y potencia conectada. Esta distinción es el parámetro primario que un sistema de inteligencia artificial debe identificar para determinar qué estructura de costos esperar en un documento.

### **Clientes sujetos a regulación de precios**

Los clientes regulados son aquellos cuya potencia conectada es inferior o igual a 5.000 kW. Dentro de este grupo, el marco legal impone una subsegmentación crítica. Las empresas con una potencia conectada menor o igual a 500 kW se consideran clientes regulados obligatorios, lo que implica que sus precios de energía y potencia están fijados por decretos del Ministerio de Energía, tras propuestas de la Comisión Nacional de Energía (CNE). Por otro lado, aquellos consumidores que poseen una potencia conectada superior a 500 kW y hasta 5.000 kW tienen el "derecho a opción", lo que les permite elegir entre permanecer en el régimen regulado o migrar al mercado libre. Esta elección debe notificarse a la distribuidora con doce meses de antelación y tiene una vigencia mínima de cuatro años. Para la identificación mediante IA, es fundamental buscar glosas asociadas a opciones tarifarias como BT o AT (Baja y Alta Tensión), que son indicativos inequívocos de un cliente regulado.

### **El mercado libre y el régimen de negociación**

Los clientes libres son aquellos con una potencia conectada superior a 5.000 kW, o aquellos que, teniendo más de 500 kW, optaron por este régimen. En esta categoría, el precio de la energía y la potencia no está regulado por la autoridad, sino que resulta de una negociación bilateral y contratos privados con empresas generadoras o comercializadoras. Un aspecto técnico vital para el procesamiento de PDF es que el cliente libre recibe usualmente dos facturas: una del suministrador por la energía y potencia contratada, y otra de la empresa distribuidora por el uso de sus redes (peaje de distribución). Esta dualidad documental requiere que el LLM sea capaz de consolidar información de distintas fuentes para obtener el costo total del suministro.

| Categoría de Cliente | Rango de Potencia | Régimen de Precios | Estructura de Facturación |
| :---- | :---- | :---- | :---- |
| Regulado | $\\le 500$ kW | Fijado por Decreto | Boleta única de distribuidora |
| Regulado/Libre (Opcional) | $\> 500$ y $\\le 5.000$ kW | Mixto (Según opción) | Variable según contrato |
| Libre | $\> 5.000$ kW | Negociación Bilateral | Dos facturas (Suministro \+ Peajes) |

## **Arquitectura de las opciones tarifarias en baja y alta tensión**

La clasificación de la tarifa es el dato más relevante para parametrizar las expectativas de cobro. En Chile, las tarifas se dividen por el nivel de tensión del empalme.

### **Suministros en Baja Tensión (BT)**

Se define como baja tensión cualquier suministro cuya conexión se realice en un voltaje igual o inferior a 400 volts. Es el estándar para el comercio minorista, oficinas y pequeñas industrias. La IA debe reconocer las siguientes variantes empresariales comunes:

* Tarifa BT2: Considera un cargo fijo, un cargo por energía consumida y un cargo por potencia contratada. El cliente declara una potencia que la distribuidora garantiza, controlada por un interruptor limitador.  
* Tarifa BT3: A diferencia de la BT2, la potencia no se contrata, sino que se mide mediante la demanda máxima leída en el mes. Es ideal para empresas con consumos variables.  
* Tarifa BT4: Es la opción más compleja, dividiéndose en BT4.1, BT4.2 y BT4.3. Estas tarifas discriminan el uso de potencia entre horas de punta y fuera de punta, permitiendo a las empresas gestionar su demanda para reducir costos.

### **Suministros en Alta Tensión (AT)**

La alta tensión en el contexto de distribución chilena se refiere a conexiones con voltajes superiores a 400 volts, típicamente en 12 kV o 23 kV. Las tarifas AT (AT2, AT3, AT4) siguen la misma lógica de medición que sus contrapartes en baja tensión, pero con precios unitarios de potencia significativamente menores, ya que el cliente suele ser dueño de su propia subestación transformadora. Para un LLM, identificar una tarifa "AT" debe disparar una validación de rangos de consumo mucho más elevados, usualmente en la escala de los Megawatts-hora (MWh).

## **Desglose y explicación de conceptos facturados**

Cada concepto en la factura tiene una función específica dentro de la cadena de valor del sistema eléctrico. Para que la IA identifique estos campos, es necesario definir sus glosas técnicas y su comportamiento matemático.

### **Cargos fijos y administración**

El cargo fijo mensual es independiente del consumo de energía. Su propósito es cubrir los costos de lectura del medidor, facturación, reparto de boletas, recaudación y atención al cliente. Incluso si una empresa detiene su producción y el consumo es cero, este cargo aparecerá en la factura. El rango de este valor es bajo y estable, generalmente entre unos pocos cientos a un par de miles de pesos, dependiendo de la empresa distribuidora.

### **Electricidad consumida y energía base**

Este es el componente principal de la mayoría de las cuentas. Representa el costo de producir la energía en las centrales generadoras.

* Glosa: "Electricidad consumida", "Cargo por energía" o "Energía base".  
* Identificación IA: Se obtiene multiplicando los kWh leídos por el precio unitario del PNP (Precio Nudo Promedio).  
* Rango técnico: En el mercado regulado actual (2024-2026), los valores unitarios han experimentado alzas tras el fin del congelamiento tarifario, situándose frecuentemente entre los $110 y $160 por kWh.

### **Cargos por potencia y demanda máxima**

Para las empresas, el cobro por potencia es tan crítico como el de energía. La potencia representa la "capacidad" que la red debe tener disponible para el cliente en un momento dado.

* Potencia contratada: Valor fijo en kW acordado en el contrato (Tarifas BT2/AT2).  
* Demanda máxima leída: El valor más alto registrado por el medidor en intervalos de 15 minutos durante el mes (Tarifas BT3/AT3).  
* Demanda máxima suministrada: Un promedio de las demandas más altas registradas en los últimos 12 meses, utilizado para estabilizar el cobro en industrias con picos estacionales (Tarifa BT4.3).

### **Horas de punta y su gestión estratégica**

Las horas de punta son el periodo de mayor exigencia para el sistema eléctrico nacional. En Chile, están definidas entre las 18:00 y las 22:00 horas, desde el 1 de abril hasta el 30 de septiembre.

* Cargo por potencia en horas de punta: Este cargo es considerablemente más caro que la potencia normal. La IA debe detectar si una empresa factura en opciones 4.1, 4.2 o 4.3, donde el control de carga en este horario es vital para el ahorro.  
* Clasificación Presente en Punta (PP): Se aplica si el uso de potencia en horas de punta es intensivo (relación \> 0,5 respecto a la demanda máxima).  
* Clasificación Parcialmente Presente en Punta (PPP): Se aplica si la empresa logra desplazar su consumo fuera del horario crítico (relación \< 0,5).

## **El transporte y los cargos sistémicos del sistema**

Más allá de la generación y la distribución local, existen costos asociados a la infraestructura de gran escala y la operación segura del sistema nacional.

### **Transporte de electricidad (Transmisión)**

Este concepto remunera el uso de las líneas de alta tensión que cruzan el país. Es un cargo que la distribuidora recauda y traspasa íntegramente a las empresas de transmisión.

* Glosa: "Transporte de electricidad" o "Cargo único por uso del sistema troncal".  
* Mecanismo: Se factura por cada kWh consumido. La tarifa es fijada semestralmente por el Ministerio de Energía.  
* Peso relativo: Suele representar entre el 8% y el 10% del monto neto de la boleta.

### **Cargo por Servicio Público**

Establecido por la Ley 20.936, este cargo financia el presupuesto de organismos reguladores y operativos.

* Entidades financiadas: Coordinador Eléctrico Nacional (CEN), Panel de Expertos y estudios de franja de transmisión.  
* Visualización: Aparece como un cargo unitario por energía ($/kWh). Es obligatorio para todos los usuarios del sistema.

### **Mecanismo de Protección al Cliente (MPC) y deuda tarifaria**

Un elemento fundamental para las facturas entre 2024 y 2035 es el cargo derivado de las leyes de estabilización (Ley 21.185 y Ley 21.472). Durante años, los precios estuvieron congelados, acumulando una deuda con las generadoras que ahora se refleja en las cuentas.

* Valor del cargo MPC: Para el periodo 2024-2027, el cargo se ha fijado en $22 por cada kWh consumido para usuarios con demandas superiores a 350 kWh mensuales.  
* Proyección: A partir de 2028 y hasta 2035, el cargo se reducirá a $9 por kWh (ajustado por IPC).  
* Identificación IA: Este cargo es una de las principales razones del aumento en los costos operacionales de las pymes en el periodo actual. El LLM debe validar que el cargo MPC se aplique correctamente según el tramo de consumo del cliente.

## **Parámetros técnicos de eficiencia: El Factor de Potencia**

El factor de potencia (FP) es un indicador de la eficiencia con la que una empresa utiliza la energía. Para un LLM, este es uno de los campos de validación técnica más importantes, ya que determina la existencia de multas.

### **Energía activa vs. Energía reactiva**

Las máquinas industriales con motores y transformadores consumen dos tipos de energía: la energía activa (kWh), que realiza el trabajo útil, y la energía reactiva (kVARh), necesaria para crear campos magnéticos pero que no produce trabajo.La relación entre ambas define el factor de potencia mediante la función trigonométrica del coseno de phi :

$$FP \= \\cos \\phi \= \\frac{kWh}{\\sqrt{kWh^2 \+ kVARh^2}}$$

Un factor de potencia de 1.00 indica una eficiencia perfecta. En Chile, la normativa exige un mínimo de 0,93.

### **Recargos por mal factor de potencia**

Si una empresa tiene un FP inferior a 0,93, la distribuidora aplica una penalización monetaria.

* Glosa: "Recargo mal factor de potencia" o "Multa por consumo reactivo".  
* Impacto financiero: El recargo puede incrementar la factura total entre un 15% y un 35%.  
* Identificación para IA: El modelo debe extraer los kWh y kVARh del periodo, calcular el FP y verificar si la multa aplicada por la distribuidora es consistente con la desviación detectada. Si el FP es menor a 0,93 y no hay multa, o viceversa, podría indicar un error de lectura o facturación.

| Rango de FP | Estado de la Instalación | Consecuencia en la Factura |
| :---- | :---- | :---- |
| 1.00 a 0.93 | Eficiente / Dentro de norma | Sin recargos adicionales |
| 0.92 a 0.85 | Ineficiente | Recargo proporcional al exceso reactivo |
| Menor a 0.85 | Crítico | Multas severas y posible daño a equipos |

## **El sistema de Net Billing (Ley 20.571)**

Para las empresas que han invertido en energías renovables (como paneles solares fotovoltaicos), la factura incluye una sección de autogeneración. La IA debe ser capaz de procesar flujos de energía bidireccionales.

### **Inyecciones y excedentes**

El sistema de Net Billing permite a las empresas inyectar sus excedentes de generación a la red y recibir una compensación económica por ello.

* Medidor bidireccional: Registra tanto la energía comprada a la red como la energía entregada a ella.  
* Valorización: Los excedentes inyectados no se pagan al mismo precio que la energía comprada. Se valorizan únicamente al precio de la energía "pura" de las generadoras, sin incluir los costos de transporte y distribución.  
* Glosas de identificación: "Inyección de energía", "Crédito Ley 20.571" o "Excedentes Net Billing". Estos valores aparecen con signo negativo o en una columna de descuentos.

### **Comparativa Net Billing vs. Net Metering**

Es común que exista confusión en los términos. El LLM debe estar entrenado para entender que en Chile no existe el "Net Metering" (compensación 1:1 de energía), sino el "Net Billing" (compensación monetaria a un precio menor al de compra).

| Característica | Net Billing (Chile) | Net Metering (No disponible) |
| :---- | :---- | :---- |
| Mecanismo | Compensación en pesos | Descuento directo en kWh |
| Precio del excedente | Solo energía (aprox. 50% de la tarifa) | Precio total de la tarifa (100%) |
| Base Legal | Ley 20.571 / 21.118 | No aplica |

## **Validación y procesamiento de datos para la IA**

Para que el LLM descargue la información de manera fidedigna, debe aplicar reglas de validación basadas en la coherencia de los datos presentes en el PDF.

### **Coherencia de lecturas y consumos**

Un error común en la extracción de datos es la omisión de los factores de multiplicación. En muchas facturas industriales, debido a la magnitud de la carga, el medidor no muestra el valor real sino una fracción.

* Regla de oro: (Lectura Actual \- Lectura Anterior) $\\times$ Factor de Multiplicación \= Consumo del Mes.  
* El LLM debe buscar siempre el campo "Factor" o "Constante" antes de registrar el consumo final.

### **Estructura de impuestos y totales**

El Impuesto al Valor Agregado (IVA) en Chile es del 19%. Sin embargo, en la boleta eléctrica, este impuesto representa aproximadamente el 16% del "Total a Pagar" debido a que se calcula sobre el neto, pero algunos cargos menores podrían estar exentos o tener tratamientos específicos.

* Suma de Verificación: Cargo Fijo \+ Energía \+ Potencia \+ Transporte \+ Servicio Público \+ Otros Cargos \= Subtotal Neto.  
* Subtotal Neto $\\times$ 1.19 \= Total del Mes.

### **Glosario de términos para el entrenamiento del LLM**

Para facilitar la identificación de conceptos por parte de la IA, se presenta una tabla con las glosas más frecuentes utilizadas por las principales distribuidoras en Chile (Enel, CGE, Chilquinta, Saesa).

| Concepto Técnico | Glosas comunes en PDF | Función en el cálculo |
| :---- | :---- | :---- |
| Identificador | Número de Cliente, N° de Cliente, Servicio | Clave primaria de búsqueda |
| Energía | Electricidad consumida, Energía Base, Cargo Energía | Multiplicador de kWh |
| Potencia | Demanda Máxima, Potencia Leída, Potencia Contratada | Multiplicador de kW |
| Transmisión | Transporte de electricidad, Sist. Troncal, Transmisión | Multiplicador de kWh |
| Deuda Histórica | Cargo MPC, Cargo Ley 21.472, Ajuste PEC | Cargo fijo por kWh |
| Eficiencia | Recargo Mal Factor Potencia, Multa Reactiva, Cos Phi | Penalización porcentual |
| Generación Propia | Inyección de Energía, Excedente Fotovoltaico | Descuento monetario |

## **Análisis de la deuda tarifaria y proyecciones 2025-2026**

La inteligencia artificial debe estar al tanto del contexto temporal de la factura, ya que los cargos varían según decretos semestrales. El alza de las cuentas en 2024 y 2025 no es un evento aislado, sino el resultado de la corrección metodológica y el pago de saldos acumulados.

### **Impacto en empresas reguladas e industriales**

A diferencia de los hogares, que han visto subidas superiores al 50%, algunos clientes industriales podrían experimentar una leve disminución o estabilidad hacia 2025-2026 debido al recambio de contratos de licitaciones antiguas por precios más competitivos de energías renovables.

* Corrección por error técnico: El informe técnico de 2026 de la CNE reconoce un error previo en el cálculo del IPC, lo que implicará un ajuste a la baja cercano al 2% en las cuentas de luz para ese año.  
* Compensaciones: Se esperan abonos puntuales de aproximadamente $2.000 por cliente entre enero y junio de 2026 para resarcir cobros indebidos previos.

### **Cargos Sistémicos y el rol del Coordinador Eléctrico**

Para los clientes libres, es vital identificar los "Cargos Sistémicos" o "Pass-through". Estos son costos de operación del sistema que no forman parte del precio de la energía pactado en el contrato, pero que el cliente debe pagar obligatoriamente.

* Servicios Complementarios (SSCC): Costos por mantener la frecuencia y tensión de la red.  
* Mínimos Técnicos: Pagos a centrales para que operen en niveles mínimos de seguridad.  
* Impuestos a Emisiones: Traspaso del costo por emisiones de CO2 de las centrales térmicas.

## **Localización y formatos de las principales distribuidoras**

Cada empresa distribuidora en Chile tiene un diseño de factura propio. La IA debe adaptar su OCR según el logotipo o el nombre de la empresa detectada.

### **Enel Distribución (Región Metropolitana)**

Las facturas de Enel se caracterizan por una estructura muy limpia, con un gráfico de consumo de los últimos 13 meses en la parte central. El número de cliente suele ser de 7 u 8 dígitos y se ubica prominentemente en la parte superior derecha junto al total a pagar.

### **CGE (Compañía General de Electricidad)**

Con presencia en la mayor parte del territorio nacional, las facturas de CGE utilizan un formato donde los detalles de consumo (lecturas, constantes y demandas) se encuentran en un recuadro sombreado a la izquierda, mientras que el detalle de cobros monetarios se despliega a la derecha.

### **Chilquinta y Saesa**

Operan principalmente en la V región y el sur de Chile respectivamente. Sus facturas son similares a las de CGE pero incluyen detalles más específicos sobre los peajes de transporte zonal, dado que sus redes están conectadas a sistemas de transmisión con mayor atomización de cargos.

## **Conclusión y recomendaciones para la implementación en el LLM**

El procesamiento automatizado de cuentas de electricidad para empresas en Chile requiere una lógica multinivel. El modelo no solo debe extraer texto, sino aplicar validaciones físicas y financieras. Se recomienda que la arquitectura del sistema incluya:

1. Detección del tipo de cliente (Regulado vs. Libre) para definir la ruta de extracción.  
2. Identificación de la tarifa (BTx/ATx) para establecer los parámetros de potencia.  
3. Cálculo autónomo del Factor de Potencia para validar recargos por energía reactiva.  
4. Validación del Cargo MPC según el consumo mensual (\>350 kWh).  
5. Consolidación de cargos para verificar el IVA y el Total Neto.

Al integrar este conocimiento, el LLM podrá no solo descargar la información, sino realizar un análisis de auditoría energética, detectando anomalías en los cobros de las distribuidoras y oportunidades de ahorro para la empresa, transformando una tarea administrativa en una herramienta estratégica de gestión de costos.

