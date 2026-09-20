# StatLab — Requisitos

Calculadora estadística web, **solo cliente**, en español, para un profesor de estadística experto en la materia y poco hábil con tecnología. Sin backend: todo el cálculo ocurre en el navegador.

Principio rector: **todo dato mostrado debe tener un significado y una utilidad clara**. Ninguna métrica se renderiza sin su microtexto "qué significa / para qué sirve".

---

## 1. Tipos de variable soportados

| Código     | Nombre en UI          | Descripción                                                    |
| ---------- | --------------------- | -------------------------------------------------------------- |
| `nominal`  | Cualitativa nominal   | Categorías sin orden (color, ciudad, género)                   |
| `ordinal`  | Cualitativa ordinal   | Categorías con orden definido por el usuario (bajo/medio/alto) |
| `discreta` | Cuantitativa discreta | Números enteros contables (nº de hijos, goles)                 |
| `continua` | Cuantitativa continua | Números en un rango, agrupables en intervalos (estatura, peso) |

El usuario **siempre** puede sobrescribir el tipo inferido (RF-06).

## 2. Matriz de aplicabilidad

Leyenda: OK aplica · ADV aplica con advertencia · NO no aplica (se deshabilita con explicación).

### 2.1 Cálculos

| Cálculo                                      | nominal | ordinal | discreta | continua |
| -------------------------------------------- | :-----: | :-----: | :------: | :------: |
| Distribución de frecuencias (valores únicos) |   OK    |   OK    |    OK    | ADV (1)  |
| Distribución agrupada en intervalos (K, l)   |   NO    |   NO    | ADV (2)  |    OK    |
| Frecuencia acumulada (F, H)                  | NO (3)  |   OK    |    OK    |    OK    |
| Mínimo / Máximo                              | NO (4)  | OK (4)  |    OK    |    OK    |
| Moda                                         |   OK    |   OK    |    OK    |  OK (5)  |
| Mediana                                      |   NO    | OK (6)  |    OK    |    OK    |
| Media aritmética                             |   NO    |   NO    |    OK    |    OK    |
| Media ponderada                              |   NO    |   NO    |    OK    |    OK    |
| Media geométrica                             |   NO    |   NO    | ADV (7)  | ADV (7)  |
| Media armónica                               |   NO    |   NO    | ADV (7)  | ADV (7)  |
| Cuartiles / Deciles / Percentiles            |   NO    | ADV (6) |    OK    |    OK    |
| Rango                                        |   NO    |   NO    |    OK    |    OK    |
| Varianza / Desv. estándar / CV               |   NO    |   NO    |    OK    |    OK    |
| RIC (IQR)                                    |   NO    | ADV (6) |    OK    |    OK    |
| Tabla de contingencia                        |   OK    |   OK    |    OK    | ADV (8)  |

(1) Si la continua tiene más de 15 valores distintos se sugiere agrupar en intervalos.
(2) Solo si el nº de valores distintos supera el umbral (por defecto 15).
(3) Para nominal se muestra frecuencia absoluta y relativa/porcentual, nunca acumuladas (carecen de sentido sin orden).
(4) Para nominal, "mínimo/máximo" se reinterpreta como categoría menos/más frecuente. Para ordinal son la categoría de menor/mayor rango en el orden declarado.
(5) En continua agrupada se ofrece además la _clase modal_ y la moda interpolada (ADR-003).
(6) Para ordinal se usan estadísticos posicionales (mediana y cuartiles por posición). La media nunca se ofrece.
(7) Geométrica requiere todos los valores > 0; armónica requiere todos distintos de 0 y se recomienda > 0. Si no se cumple, se deshabilita indicando el motivo.
(8) La continua debe agruparse en intervalos antes de cruzarse.

### 2.2 Gráficas

| Gráfica                                    | nominal | ordinal |       discreta        |          continua          |
| ------------------------------------------ | :-----: | :-----: | :-------------------: | :------------------------: |
| Pie (circular)                             |   OK    |   OK    | ADV (<=10 categorías) |             NO             |
| Barras                                     |   OK    |   OK    |          OK           | OK (agrupada = histograma) |
| Histograma (barras contiguas)              |   NO    |   NO    |          ADV          |             OK             |
| Polígono de frecuencia                     |   NO    |   ADV   |          OK           |             OK             |
| Ojiva (acumulada)                          |   NO    |   OK    |          OK           |             OK             |
| Barras agrupadas / apiladas (contingencia) |   OK    |   OK    |          OK           |       ADV (agrupada)       |

Regla de UI: las opciones no aplicables **no se ocultan**; aparecen deshabilitadas con un tooltip que explica por qué no aplican (valor pedagógico).

---

## 3. Requisitos funcionales

### Entrada de datos

- **RF-01** El sistema acepta datos por tres vías equivalentes: (a) texto pegado con valores separados por coma (también salto de línea, punto y coma o tabulador, autodetectado), (b) archivo CSV, (c) archivo Excel (.xlsx/.xls).
- **RF-02** Las tres vías producen el mismo modelo interno `Dataset`; ningún cálculo posterior distingue el origen.
- **RF-03** La primera fila se interpreta como encabezados por defecto; existe un interruptor "La primera fila son encabezados" que, al desactivarse, genera nombres `Columna 1..n`.
- **RF-04** Para texto de una sola línea sin salto, el resultado es un dataset de **una columna**; el usuario puede nombrarla.
- **RF-05** En XLSX con varias hojas, el usuario elige la hoja; se lee solo la elegida.
- **RF-06** El sistema infiere el tipo de cada variable y muestra una vista previa editable donde el usuario confirma o corrige tipo, nombre y, si es ordinal, el orden de las categorías.
- **RF-07** Se detectan y reportan valores faltantes (celda vacía, `NA`, `N/A`, `null`, `-`, `.`, `#N/A`). Política por defecto: **exclusión por variable** (pairwise); en contingencia se excluye la fila si falta cualquiera de las dos variables cruzadas. La política es visible y conmutable a "excluir fila completa".
- **RF-08** Límite de tamaño: hasta 100 000 celdas sin degradación perceptible; por encima se avisa y se ofrece continuar.
- **RF-09** Se detecta el separador decimal (coma o punto) y los separadores de miles; el usuario puede forzar la configuración regional.

### Flujo (wizard)

- **RF-10** El análisis se conduce por un asistente de pasos con preguntas en lenguaje natural:
  1. "¿Qué datos vamos a analizar?" — subtítulo "Ingresa los datos o adjunta un csv/excel".
  2. "¿Qué tipo de variables son?"
  3. "¿Cuáles cálculos necesitas?"
  4. "¿Qué gráficas necesitas?"
  5. Resultados.
- **RF-11** Se puede navegar hacia atrás sin perder lo configurado; cambiar los datos invalida y recalcula lo posterior avisando al usuario.
- **RF-12** Cada paso valida con zod antes de permitir avanzar y muestra errores en lenguaje claro, no técnico.
- **RF-13** Existe un atajo "Análisis recomendado" que preselecciona el conjunto sensato de cálculos y gráficas según los tipos detectados.
- **RF-14** El estado del análisis se persiste en `localStorage` para sobrevivir a una recarga accidental, con botón "Empezar de cero".

### Cálculos fijos (siempre disponibles)

- **RF-15** Distribución de frecuencias por variable, con selección de columnas y **sin redundancia**: el usuario elige entre frecuencia relativa (proporción 0–1) **o** porcentual (%), nunca ambas. Columnas posibles: valor/clase, marca de clase `xi`, `fi`, `hi`|`pi`, `Fi`, `Hi`|`Pi`.
- **RF-16** Mínimo y máximo, con su posición en el dataset.
- **RF-17** Número de intervalos **K** por regla de **Sturges** (`K = techo(1 + log2 n)`) por defecto; alternativas: raíz (`techo(sqrt n)`), Rice (`techo(2·n^(1/3))`), Scott y Freedman–Diaconis (derivan de la amplitud). El usuario puede fijar K a mano. La regla usada se imprime siempre junto a la tabla.
- **RF-18** Longitud de intervalo `l = Rango / K`, redondeada hacia arriba a la precisión de los datos; se documenta el límite inferior de la primera clase y la convención de intervalos **[a, b)** (cerrado-abierto) con la última clase **[a, b]**.
- **RF-19** Moda: identifica caso **amodal**, **unimodal** y **multimodal** (bimodal, trimodal…), listando todos los valores modales con su nº de repeticiones.
- **RF-20** Promedios: aritmético, **ponderado** (requiere pesos elegidos por el usuario), **geométrico** y **armónico**; cada uno con su guía breve de cuándo usarlo y con bloqueo razonado si el dominio no es válido.
- **RF-21** Mediana (sobre datos crudos y, si hay agrupación, mediana interpolada de datos agrupados).
- **RF-22** Tabla de contingencia de dos variables, con frecuencias absolutas y, opcionalmente, porcentajes por fila, por columna o sobre el total; totales marginales; **resaltado interactivo en hover** del máximo y el mínimo de la fila y de la columna sobre la que está el cursor.

### Cálculos opcionales

- **RF-23** Tabla de posición: cuartiles Q1/Q2/Q3 (método **inclusivo** o **exclusivo** a elección), deciles D1..D9 y percentiles (individuales pedidos por el usuario o la serie completa P1..P99).
- **RF-24** Tabla de variabilidad: rango, varianza **muestral (n−1)** y poblacional (n) como opción, desviación estándar, coeficiente de variación en **%** y RIC = Q3 − Q1. Se muestran además los límites de Tukey (Q1 − 1.5·RIC, Q3 + 1.5·RIC) con la lista de atípicos.

### Gráficas

- **RF-25** Tipos: circular, barras/histograma, polígono de frecuencia y ojiva; más barras agrupadas/apiladas para contingencia.
- **RF-26** **Paleta consistente**: todas las gráficas que representan la misma variable usan la misma asignación categoría→color, determinista y estable entre renders y exportaciones.
- **RF-27** Etiquetas por dato visibles con **valor, porcentaje y etiqueta de categoría**; conmutables.
- **RF-28** Cada gráfica lleva título, nombre de la variable de origen, n efectivo y una leyenda explicativa de una línea.
- **RF-29** Accesibilidad de color: paleta con contraste suficiente y patrón o borde diferenciador para daltonismo; leyenda siempre textual.

### Explicaciones

- **RF-30** Cada métrica, tabla y gráfica expone un texto corto "**Qué significa**" y "**Para qué sirve**" (§5), accesible inline o por icono de ayuda, e incluible en el PDF.

### Exportación

- **RF-31** Exportar los **datos** (originales y/o tablas calculadas) a CSV y a XLSX (una hoja por tabla).
- **RF-32** Exportar **reporte PDF** completo o parcial: el usuario marca con casillas qué secciones incluir (`ExportSelection`).
- **RF-33** Exportar **gráficas como imagen** (PNG/SVG), individualmente o todas de una vez.
- **RF-34** Nombres de archivo predecibles: `statlab_<analisis>_<AAAA-MM-DD>.<ext>`.
- **RF-35** El PDF incluye portada con título editable, fecha y n, y pie con numeración; las tablas no se cortan a mitad de fila.

### Fase 2 (previsto, no implementado)

- **RF-36** Se define el puerto `AiReportProvider` para generar un reporte narrado con IA (Gemini). En fase 1 no hay implementación ni llamada de red; la UI puede mostrar la función como "próximamente", deshabilitada.

---

## 4. Requisitos no funcionales

- **RNF-01** Sitio 100 % cliente, sin backend ni base de datos. Los datos del usuario **nunca salen del navegador** en fase 1; esto se declara visiblemente en la UI.
- **RNF-02** Despliegue estático en Vercel (`output: 'export'` si ninguna dependencia lo impide) bajo `estadistica.juandgaitan.com`.
- **RNF-03** TypeScript `strict`, sin `any` en `src/core`.
- **RNF-04** `src/core` con cobertura de tests **>= 95 %** en líneas y ramas, con casos de referencia contrastados a mano.
- **RNF-05** Precisión numérica: `number` (IEEE 754 doble) con sumatoria compensada (Neumaier) para la media y **Welford** para la varianza, evitando cancelación catastrófica. **El redondeo ocurre solo en la capa de presentación.**
- **RNF-06** Rendimiento: 50 000 filas × 10 columnas calculan el paquete completo en menos de 1 s en un portátil de gama media; ningún cálculo bloquea la UI más de 100 ms (troceado o Web Worker si hace falta).
- **RNF-07** Usabilidad para usuario poco técnico: lenguaje sin jerga informática, un objetivo por pantalla, botón primario evidente, sin callejones sin salida, deshacer siempre posible.
- **RNF-08** Accesibilidad AA: navegación por teclado completa, contraste >= 4.5:1, etiquetas ARIA en tablas y gráficas, y tabla de datos como alternativa textual de cada gráfica.
- **RNF-09** Responsive: usable en portátil y tablet; las tablas grandes con scroll horizontal y cabecera fija.
- **RNF-10** Toda la UI en **español** (es-419), con textos centralizados para facilitar una futura i18n.
- **RNF-11** El dominio estadístico (`src/core`) no depende de React ni de librerías de terceros; es portable y testeable en Node puro.
- **RNF-12** La regla de dependencia entre capas se verifica automáticamente en CI (ESLint).
- **RNF-13** Bundle inicial < 250 kB gzip; `xlsx`, `jspdf` y `html-to-image` se cargan bajo demanda con import dinámico.
- **RNF-14** Los archivos del usuario se procesan en memoria; nada se sube. `localStorage` guarda como máximo la configuración y un dataset pequeño, con aviso y purgado manual.
- **RNF-15** Determinismo: mismos datos y misma configuración producen los mismos resultados y los mismos colores.
- **RNF-16** Navegadores objetivo: últimas dos versiones de Chrome, Edge, Firefox y Safari.

---

## 5. Microtextos "qué significa / para qué sirve"

Textos de referencia para la UI; viajan dentro del resultado del dominio (ver arquitectura).

| Métrica                     | Qué significa                                                                  | Para qué sirve                                                           |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Frecuencia absoluta `fi`    | Cuántas veces aparece cada valor o clase                                       | Ver qué valores dominan y cuáles son raros                               |
| Frecuencia relativa `hi`    | La proporción del total que representa cada valor (0 a 1)                      | Comparar grupos de distinto tamaño                                       |
| Frecuencia porcentual `pi`  | Lo mismo que la relativa, expresada en %                                       | Comunicar resultados de forma intuitiva                                  |
| Frecuencia acumulada `Fi`   | Cuántos datos hay hasta esa clase inclusive                                    | Responder "¿cuántos están por debajo de…?"                               |
| Marca de clase `xi`         | El punto medio de un intervalo                                                 | Representar el intervalo en cálculos y gráficas                          |
| Mínimo                      | El valor más pequeño observado                                                 | Delimitar el recorrido y detectar errores de captura                     |
| Máximo                      | El valor más grande observado                                                  | Delimitar el recorrido y detectar valores extremos                       |
| Nº de intervalos K          | En cuántas clases se agrupan los datos                                         | Resumir muchos valores distintos sin perder la forma de la distribución  |
| Longitud de intervalo `l`   | El ancho de cada clase                                                         | Garantizar clases comparables entre sí                                   |
| Moda                        | El valor o valores que más se repiten                                          | Identificar lo más típico; único promedio válido para datos cualitativos |
| Media aritmética            | El reparto equitativo del total entre todos los datos                          | Resumir el centro cuando no hay valores extremos                         |
| Media ponderada             | Promedio en el que cada dato pesa distinto                                     | Notas por créditos, precios por cantidad vendida                         |
| Media geométrica            | Promedio multiplicativo (raíz n-ésima del producto)                            | Promediar tasas de crecimiento, índices y razones                        |
| Media armónica              | Inverso del promedio de los inversos                                           | Promediar velocidades y razones con numerador constante                  |
| Mediana                     | El valor que parte los datos ordenados en dos mitades                          | Centro robusto ante valores extremos o asimetría                         |
| Cuartiles Q1/Q2/Q3          | Cortan los datos ordenados en cuatro partes iguales                            | Describir dispersión y detectar asimetría                                |
| Deciles / Percentiles       | Cortan en 10 / 100 partes iguales                                              | Ubicar un dato respecto al grupo (estar en el percentil 90)              |
| Rango                       | Diferencia entre máximo y mínimo                                               | Medida rápida de dispersión, muy sensible a extremos                     |
| Varianza muestral `s2`      | Promedio de las desviaciones al cuadrado respecto a la media, dividido por n−1 | Base matemática de la dispersión y de la inferencia                      |
| Desviación estándar `s`     | La dispersión típica, en las mismas unidades de los datos                      | Decir cuánto se aleja en promedio un dato de la media                    |
| Coeficiente de variación CV | La desviación estándar como porcentaje de la media                             | Comparar dispersión entre variables con unidades distintas               |
| RIC (IQR)                   | Longitud del 50 % central de los datos (Q3 − Q1)                               | Medir dispersión sin que la afecten los valores extremos                 |
| Valores atípicos            | Datos fuera de Q1−1.5·RIC y Q3+1.5·RIC                                         | Señalar posibles errores o casos excepcionales                           |
| Tabla de contingencia       | Cuenta los casos que combinan dos categorías                                   | Explorar si dos variables están relacionadas                             |
| Gráfico circular            | Reparte un círculo según la participación de cada categoría                    | Mostrar composición con pocas categorías                                 |
| Barras / histograma         | Compara alturas proporcionales a la frecuencia                                 | Comparar categorías o ver la forma de la distribución                    |
| Polígono de frecuencia      | Une los puntos medios de las clases                                            | Ver la forma y la tendencia de la distribución                           |
| Ojiva                       | Curva de frecuencias acumuladas                                                | Leer gráficamente cuartiles, percentiles y "cuántos hay por debajo de"   |

---

## 6. Supuestos y preguntas abiertas para el profesor

Cada punto lleva una **decisión por defecto** ya tomada (para no bloquear el desarrollo) y su pregunta.

1. **Datos agrupados vs no agrupados (mediana, moda, cuartiles).**
   _Decisión:_ cuando la variable está agrupada en intervalos se calculan **ambas versiones** y se muestran lado a lado: la exacta sobre los datos crudos y la interpolada de datos agrupados (Me = Li + ((n/2 − F_{i−1}) / f_i)·l ; Mo = Li + (D1/(D1+D2))·l). La exacta se marca como principal.
   _Pregunta:_ ¿prefiere que la versión agrupada sea la principal en el reporte, o solo un complemento?

2. **Fórmula de percentiles.**
   _Decisión:_ método **R-7** (interpolación lineal, `h = (n−1)p + 1`), el de Excel `PERCENTIL.INC`, `CUARTIL.INC` y R por defecto. Para cuartiles se ofrece además el método **exclusivo** (R-6 / `CUARTIL.EXC`).
   _Pregunta:_ ¿confirma R-7 como predeterminado, o su curso usa la fórmula posicional clásica `k(n+1)/100`?

3. **"Cuartiles incluidos o no".**
   _Interpretación adoptada:_ se refiere a **método inclusivo vs exclusivo**, es decir, si al partir la muestra en dos mitades para Q1 y Q3 se incluye o no la mediana cuando n es impar. Se implementan los dos, con el inclusivo por defecto y una nota que explica la diferencia.
   _Pregunta:_ ¿es esa la interpretación correcta, o se refería a incluir o no la columna Q2 (= mediana) en la tabla de posición? Lo segundo también será configurable.

4. **Pesos del promedio ponderado.**
   _Decisión:_ el usuario elige una **columna numérica del mismo dataset** como pesos; alternativamente los escribe a mano en una lista de igual longitud o, si la variable está agrupada, se usan las frecuencias como pesos. Se rechazan pesos negativos y suma de pesos = 0; no se normalizan (la fórmula ya divide por la suma de pesos).
   _Pregunta:_ ¿el caso típico es "notas × créditos" (columna de pesos) o "clases × frecuencia"?

5. **Valores faltantes.**
   _Decisión:_ exclusión por variable, con el `n` efectivo indicado en cada tabla y un aviso del nº de datos descartados. Nunca se imputa.
   _Pregunta:_ ¿le sirve así, o quiere poder tratar el faltante como una categoría propia ("Sin dato") en variables cualitativas?

6. **Varianza por defecto.** Muestral (n−1). _Pregunta:_ ¿debe la poblacional (n) estar visible por defecto también, dado que en clase se usan ambas?

7. **Convención de intervalos.** `[a, b)` con última clase cerrada. _Pregunta:_ ¿usa usted `(a, b]` en clase? Es un interruptor barato de añadir.

8. **Límite inferior de la primera clase.** Se toma el mínimo exacto. Alternativa docente: redondear hacia abajo a un valor "redondo". _Pregunta:_ ¿prefiere límites redondeados aunque la primera clase no empiece exactamente en el mínimo?

9. **Redondeo mostrado.** Por defecto 4 cifras significativas para estadísticos y 2 decimales para porcentajes, configurable globalmente. _Pregunta:_ ¿qué precisión usa en sus materiales?

10. **CV con media negativa o cercana a cero.** Se muestra "no interpretable" con explicación en vez de un número engañoso. _Pregunta:_ ¿de acuerdo?

11. **Máximo de categorías en un gráfico circular.** Por defecto 10; el resto se agrupa en "Otros" con aviso. _Pregunta:_ ¿prefiere agrupar o que se impida graficar?

12. **Alcance de la contingencia.** Solo cruce de **dos** variables, sin prueba de independencia (chi-cuadrado) en fase 1. _Pregunta:_ ¿necesita chi-cuadrado y medidas de asociación? Sería un requisito adicional.

13. **Fuera de alcance declarado en fase 1:** inferencia (intervalos de confianza, pruebas de hipótesis), regresión y correlación, series de tiempo, asimetría y curtosis, diagramas de caja y de dispersión. _Pregunta:_ ¿alguno es imprescindible ya? Asimetría/curtosis y boxplot son los candidatos naturales a fase 1.5.
