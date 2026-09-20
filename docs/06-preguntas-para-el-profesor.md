# Preguntas para el profesor

Este documento reúne, en un solo lugar y sin lenguaje técnico, todas las decisiones que tomamos "por defecto" para poder seguir construyendo StatLab sin detenernos, y que nos gustaría que usted confirmara o corrigiera. No hace falta saber de programación para leerlo: cada punto explica la situación en una o dos frases, dice qué hicimos por ahora y por qué, y ofrece opciones para que usted marque la que prefiera.

Si no marca nada, seguimos con la opción marcada como "(elegida por defecto)".

---

## 1. Frecuencias e intervalos (agrupar datos en clases)

### 1.1 Cuando los datos se agrupan en intervalos, ¿qué versión del resultado es la principal?

Cuando hay muchos valores distintos (por ejemplo, estaturas o pesos), el programa los agrupa en "clases" o intervalos para resumirlos. Al calcular la mediana o la moda, existe la versión exacta (con los datos originales) y la versión aproximada que sale de trabajar con los intervalos ya agrupados.

**Lo que hicimos por ahora:** mostramos las dos, una junto a la otra, pero marcamos la versión exacta (con los datos originales) como la principal.

- **A.** Dejarlo así: la exacta es la principal, la agrupada es un complemento. _(elegida por defecto)_
- **B.** Al revés: la agrupada (por intervalos) debe ser la principal en el reporte.
- **C.** Mostrar solo una de las dos (indíquenos cuál) para no confundir al estudiante.

### 1.2 ¿Dónde debe empezar el primer intervalo?

Al agrupar los datos en clases, el primer intervalo puede arrancar exactamente en el valor más bajo de los datos, o en un número "redondo" cercano (por ejemplo, empezar en 10 en vez de en 10.3).

**Lo que hicimos por ahora:** el primer intervalo empieza exactamente en el valor mínimo de los datos.

- **A.** Empezar exactamente en el valor mínimo. _(elegida por defecto)_
- **B.** Redondear hacia abajo a un número más "limpio", aunque el intervalo no arranque justo en el mínimo.

### 1.3 ¿Cómo se cierran los intervalos?

Cada intervalo necesita una regla para saber si el límite compartido con el siguiente pertenece a uno o al otro (por ejemplo, si 10 pertenece a "[5 a 10)" o a "[10 a 15)").

**Lo que hicimos por ahora:** cada intervalo incluye su límite inferior pero no el superior (por ejemplo "[5 a 10)"), y el último intervalo sí incluye ambos límites para no dejar fuera el valor máximo.

- **A.** Como lo describimos arriba: incluye el límite de abajo, no el de arriba. _(elegida por defecto)_
- **B.** Al revés: cada intervalo incluye el límite de arriba, no el de abajo (como suele verse en algunos libros).

---

## 2. Promedios (media aritmética, ponderada, geométrica, armónica)

### 2.1 ¿Cuál es el caso típico de "promedio ponderado" en su clase?

El promedio ponderado sirve cuando no todos los datos "pesan" igual (por ejemplo, una nota vale más si la materia tiene más créditos). Necesitamos saber de dónde suelen salir esos pesos en los ejercicios que usted plantea.

**Lo que hicimos por ahora:** dejamos tres formas de indicar los pesos: elegir otra columna de datos ya cargados (por ejemplo, créditos), escribir los pesos a mano, o usar automáticamente las frecuencias cuando los datos ya vienen agrupados.

- **A.** El caso típico es "notas por créditos" (una columna con los pesos). _(elegida por defecto)_
- **B.** El caso típico es "valores por frecuencia" (cuántas veces se repite cada dato agrupado).
- **C.** Los dos son igual de comunes; que quede como está, con las tres opciones disponibles.

---

## 3. Posición (cuartiles, deciles, percentiles)

### 3.1 ¿Qué fórmula de percentiles usar?

Existen varias fórmulas "oficiales" para calcular en qué percentil cae un dato, y no todas dan exactamente el mismo número.

**Lo que hicimos por ahora:** usamos la fórmula con interpolación (la misma que usan Excel, R y la mayoría de calculadoras modernas), para que los resultados de StatLab coincidan con lo que el estudiante obtendría en Excel.

- **A.** Mantener la fórmula tipo Excel/R (interpolación lineal). _(elegida por defecto)_
- **B.** Usar la fórmula clásica de posición que se enseña en algunos cursos de estadística básica (sin interpolar tanto).
- **C.** Ofrecer ambas y que el estudiante elija cuál usar (ya podemos ofrecer una variante adicional si es necesario).

### 3.2 ¿Qué quiso decir con "cuartiles incluidos o no"?

Entendimos que esto se refiere a si, al partir la muestra en dos mitades para calcular el primer y el tercer cuartil, se incluye o no el valor central (la mediana) cuando hay una cantidad impar de datos.

**Lo que hicimos por ahora:** implementamos ambas variantes (incluir o no incluir la mediana al partir la muestra), con la opción de "incluir" activada por defecto, y una nota que explica la diferencia.

- **A.** Esa es la interpretación correcta; "incluir" como opción por defecto está bien. _(elegida por defecto)_
- **B.** Esa es la interpretación correcta, pero prefiero que "no incluir" sea la opción por defecto.
- **C.** Me refería a otra cosa: si la columna de la mediana (Q2) debe aparecer o no en la tabla de cuartiles. (Esto también lo podemos configurar aparte.)

---

## 4. Variabilidad (varianza, desviación estándar, coeficiente de variación)

### 4.1 ¿Debe verse siempre la varianza calculada de las dos formas?

Hay dos maneras de calcular la varianza: una pensando que los datos son una "muestra" de un grupo más grande, y otra pensando que los datos son "toda la población". Suelen dar números ligeramente distintos.

**Lo que hicimos por ahora:** mostramos por defecto la versión "muestra" (la más común en Excel), y dejamos la versión "población completa" disponible con un interruptor que el usuario debe activar.

- **A.** Mantenerlo así: la de "muestra" se ve de entrada, la de "población" es opcional. _(elegida por defecto)_
- **B.** Mostrar las dos versiones siempre, una junto a la otra, sin que el usuario tenga que activar nada.

### 4.2 ¿Qué hacer cuando el "coeficiente de variación" no tiene sentido?

El coeficiente de variación compara la dispersión de los datos con su promedio, en porcentaje. Pero si el promedio es cero, o si hay datos positivos y negativos mezclados, el resultado deja de tener un significado claro.

**Lo que hicimos por ahora:** en esos casos, en lugar de mostrar un número que podría confundir, mostramos el mensaje "no interpretable" junto con la explicación de por qué.

- **A.** De acuerdo, así evitamos números engañosos. _(elegida por defecto)_
- **B.** Prefiero que igual se muestre el número calculado, con una advertencia al lado, en vez de ocultarlo.

---

## 5. Contingencia (cruce de dos variables)

### 5.1 ¿Hace falta saber si dos variables están "relacionadas" de forma estadística?

Hoy StatLab cruza dos variables en una tabla (por ejemplo, género contra preferencia de producto) y muestra los conteos y porcentajes, pero no calcula todavía si esa relación es estadísticamente significativa (la prueba conocida como "chi-cuadrado").

**Lo que hicimos por ahora:** dejamos esa prueba fuera de esta primera versión, para no retrasar la entrega de lo esencial.

- **A.** No es imprescindible por ahora; puede quedar para una versión futura. _(elegida por defecto)_
- **B.** Sí la necesito ya, es parte del curso actual: agréguenla a esta primera versión.

---

## 6. Gráficas

### 6.1 ¿Qué hacer cuando un gráfico circular tiene demasiadas categorías?

Un gráfico circular (de "torta") deja de ser legible si tiene demasiadas porciones distintas.

**Lo que hicimos por ahora:** si hay más de 10 categorías, agrupamos las más pequeñas en una porción llamada "Otros", con un aviso visible de que se agruparon.

- **A.** Agrupar las categorías sobrantes en "Otros", como está ahora. _(elegida por defecto)_
- **B.** En vez de agrupar, no permitir el gráfico circular y sugerir uno de barras.
- **C.** Permitir que el usuario decida el límite de categorías antes de agrupar.

---

## 7. Importación de datos (valores faltantes)

### 7.1 ¿Qué hacer con las celdas vacías o sin dato?

Cuando faltan datos en una celda (vacía, "NA", "-", etc.), hay que decidir qué hacer con esa fila o esa columna al calcular.

**Lo que hicimos por ahora:** el dato faltante simplemente se excluye del cálculo de esa columna en particular, y se avisa cuántos datos se descartaron.

- **A.** Mantener la exclusión silenciosa (con aviso de cuántos se excluyeron). _(elegida por defecto)_
- **B.** Además de excluir, permitir tratar el dato faltante como una categoría propia llamada "Sin dato" cuando la variable es de tipo categórico (por ejemplo, color o ciudad).

---

## 8. Presentación de resultados (redondeo)

### 8.1 ¿Con cuántos decimales deben verse los resultados?

Por dentro, el programa calcula con toda la precisión posible; lo único que se decide aparte es con cuántas cifras se muestran los resultados en pantalla y en el reporte.

**Lo que hicimos por ahora:** mostramos los estadísticos con 4 cifras significativas (por ejemplo, 23.47) y los porcentajes con 2 decimales (por ejemplo, 45.30 %).

- **A.** Mantener 4 cifras significativas y 2 decimales en porcentajes. _(elegida por defecto)_
- **B.** Prefiero otra cantidad de decimales (indíquenos cuál es la que usa en sus materiales).

---

## Para una fase 2

Estas son ideas que quedaron deliberadamente fuera de esta primera versión de StatLab, para poder entregar antes lo esencial. Las listamos para que usted decida cuáles priorizar en una siguiente etapa:

1. **Reporte narrado con inteligencia artificial (Gemini).** Un resumen en texto, generado automáticamente, que explique en palabras los resultados del análisis. Hoy solo existe el espacio reservado para conectarlo más adelante; no está activo ni envía datos a ningún servicio externo.
2. **Prueba de chi-cuadrado y medidas de asociación** para saber si dos variables cruzadas están relacionadas de forma estadísticamente significativa (ver pregunta 5.1).
3. **Asimetría y curtosis**: medidas que describen si los datos se inclinan hacia un lado o si tienen "colas" más pesadas de lo normal.
4. **Diagrama de caja (boxplot)**: una gráfica adicional para visualizar la mediana, los cuartiles y los valores atípicos de un vistazo.
5. **Diagrama de dispersión y correlación** entre dos variables numéricas.
6. **Inferencia estadística**: intervalos de confianza y pruebas de hipótesis.
7. **Regresión** simple entre dos variables.
8. **Series de tiempo**: análisis de datos ordenados cronológicamente.

De esta lista, los puntos 3 y 4 (asimetría/curtosis y diagrama de caja) son los candidatos más naturales para una fase inmediata siguiente, por ser una extensión directa de lo que ya existe.
