# **Guía de Procesamiento: Energía Activa, Reactiva y Algoritmos de Penalización en Chile**

Para que un modelo de lenguaje procese correctamente una factura eléctrica industrial, debe distinguir entre el trabajo útil realizado (**Energía Activa**) y la energía necesaria para magnetizar equipos (**Energía Reactiva**). Esta última, si es excesiva, genera un recargo monetario directo sobre la facturación de energía. 

## **1\. Identificación de Magnitudes: "Real" vs. "Residual"**

En términos técnicos para la IA, el consumo "real" se identifica como Energía Activa y el "residual" como Energía Reactiva.

### **Energía Activa (Real)**

* **Unidad:** Kilowatt-hora (kWh).  
* **Identificación:** En el archivo Mediciones, por cada archivo, hay dos medidores. El identificador es el que tiene un identificador que no termina en “R”  
* **Cálculo de Consumo Real:**  
  $$\\text{Consumo Real (kWh)} \= (\\text{Lectura Actual} \- \\text{Lectura Anterior}) \\times \\text{Constante de Medida}$$  
  *Nota: La IA debe localizar siempre la **Constante** o **Factor de Multiplicación**, de lo contrario el valor extraído será erróneo para clientes industriales.*

### **Energía Reactiva (Residual)**

* **Unidad:** Kilovar-hora (kVARh).  
* **Identificación:** En el archivo Mediciones, por cada archivo, hay dos medidores. El identificador es el que tiene un identificador que si termina en “R”   
* **Función:** No produce trabajo útil, pero ocupa capacidad en la red y genera calor en los conductores. 

## **2\. Indicador Clave: El Factor de Potencia (FP)**

El Factor de Potencia es el indicador que la IA debe calcular u observar para determinar la eficiencia. Se define como el coseno del ángulo de desfase ($\\cos \\phi$) entre la potencia activa y la aparente.

### **Fórmula de cálculo para la IA**

Si el PDF no entrega el FP directamente, la IA debe calcularlo usando los valores de kWh y kVARh del periodo: 

$$FP \= \\cos \\left( \\arctan \\left( \\frac{kVARh}{kWh} \\right) \\right)$$

O bien, mediante la Potencia Aparente ($S$):

1. Calcular Potencia Aparente ($S$): $S \= \\sqrt{kWh^2 \+ kVARh^2}$  
2. Calcular FP: $FP \= \\frac{kWh}{S}$

## **3\. Algoritmo de Estimación de Multas**

En Chile, la normativa de la SEC establece que cualquier instalación con un **Factor de Potencia inferior a 0,93** está sujeta a penalización.

### **Regla de la centésima (1% por 0,01)**

La multa se calcula de forma proporcional a la desviación del estándar:

* **Umbral Normativo:** $0,93$ (Todo valor igual o superior a $0,93$ tiene recargo $0$).  
* **Tasa de Multa:** Se aplica un **recargo del 1% sobre el valor total de la facturación de energía** por cada centésima ($0,01$) que el FP baje de $0,93$.

### **Ejemplo de Verificación para la IA:**

* **Datos extraídos:** Facturación de Energía \= $\\$1.000.000$; FP Calculado \= $0,85$.  
* **Cálculo de Desviación:** $0,93 \- 0,85 \= 0,08$ (equivale a $8$ centésimas).  
* **Porcentaje de Multa:** $8\\%$.  
* **Monto de Multa esperado:** $\\$1.000.000 \\times 0,08 \= \\$80.000$.

## **4\. Parámetros Técnicos y Rangos para la IA**

Para asegurar que la IA no cometa errores de alucinación, debe validar los datos extraídos contra estos rangos:

| Parámetro | Rango Esperado / Acción | Importancia para la IA |
| :---- | :---- | :---- |
| **Factor de Potencia (FP)** | Entre $0,00$ y $1,00$ | Si es $\> 1,00$, hubo un error de lectura de unidades. |
| **Multa %** | Típicamente entre $10\\%$ y $35\\%$ | Si la IA detecta una multa $\> 50\\%$, es una anomalía crítica.  |
| **Tarifas Afectadas** | BT3, BT4, AT3, AT4 | La IA no debe buscar multas de reactiva en BT1 (residencial).  |
| **Constante de Medida** | Enteros (ej: $1, 10, 40, 80, 120$) | Vital para pasar de "consumo de medidor" a "consumo real". |

### **Glosas Identificadoras de Multas (Keywords)**

La IA debe buscar estas cadenas de texto para extraer el monto de la penalización:

* "Recargo Mal Factor de Potencia"  
* "Multa por Consumo Reactivo"  
* "Recargo Mal Fac. de Pot (X%)" 

## **5\. Lógica de Validación (Checklist para el Modelo)**

1. **¿Existe registro de kVARh?** Si no hay, no existe cálculo de reactiva.  
2. **¿El FP es \< 0,93?** Si sí, debe existir una glosa de "Recargo" o "Multa".  
3. **¿El monto del recargo coincide con la regla del 1%?** (Validar: $(\\text{Facturación Energía}) \\times (0,93 \- FP) \\times 100$).  
4. **¿El recargo se aplicó sobre el neto?** El recargo por mal factor de potencia forma parte del subtotal neto antes de impuestos. 

