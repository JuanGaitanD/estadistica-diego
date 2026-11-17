# StatLab · Evaluación y plan: de calculadora descriptiva a plataforma de estadística

Fecha: 2026-11-16. Estado: **aprobado por Juan el 2026-11-16** con las decisiones de la §9; en construcción en la rama `feat/plataforma-interpretacion`.

Lema: **«Estadística que se entiende: de lo básico a la regresión»**.

> **Principio rector: la interpretación va primero.** Frente a la persona va primero qué significa el resultado, en lenguaje llano y con la conclusión práctica. Los cálculos básicos, el paso a paso y las fórmulas quedan **ocultos por defecto** detrás de «Ver cómo se calculó», nunca encima de la interpretación. Vale para pantallas, tarjetas e informe exportado.

Fuentes: `AGENTS.md`, `HANDOFF.md`, `docs/01` a `docs/08`, el código de `src/` y un recorrido del sitio desplegado (https://estadistica.juandgaitan.com/) con los datos de ejemplo, paso 1 a resultados, el 2026-11-16.

---

## 1. Diagnóstico en una página

StatLab hoy es una **calculadora de estadística descriptiva univariada** bien construida: motor puro y probado (`src/core`, 420 tests), importación robusta (texto, CSV, Excel, decimales ambiguos), asistente de 4 pasos, tablas, 4 tipos de gráfica, tabla de contingencia y exportación a PDF, CSV, XLSX y PNG.

El objetivo nuevo es otro producto: **cualquier persona sin formación carga sus datos, hace de estadística básica a regresiones, entiende cada resultado y lo exporta**. Frente a eso, las brechas son de tres tipos:

1. **Alcance.** Falta todo lo que va después de la descriptiva: forma (asimetría, curtosis), caja y bigotes, histograma real, dispersión, probabilidad y distribuciones, intervalos de confianza, pruebas de hipótesis, correlación y todas las regresiones. Es aproximadamente el 60 % del temario pedido.
2. **Entender.** Cada métrica trae «qué significa / para qué sirve» genérico (catálogo en `core/statistics/explanations/catalog.ts`), pero **no hay paso a paso del cálculo con los números de la persona ni interpretación del resultado concreto** («la media es 3,74: el estudiante típico saca 3,7 sobre 5, y como la mediana es casi igual, no hay notas extremas que la distorsionen»). Eso es lo que hace que una persona sin formación entienda.
3. **Enfoque y flujo.** El asistente pregunta «¿qué cálculos necesitas?» y muestra 20 casillas técnicas (Moda, Promedio armónico, Deciles…). Quien no sabe estadística no sabe qué marcar. El flujo debería partir de **la pregunta que la persona quiere responder**, no del nombre del cálculo. Además el asistente es lineal y de un solo uso: no se puede hacer un análisis, luego otro, y juntarlos en un informe.

Cambio de público a tener presente: `docs/01-requisitos.md` describe al usuario como «profesor experto en la materia, poco hábil con tecnología». El objetivo nuevo es «persona sin formación en estadística». Este plan asume el nuevo público, sin perder el rigor que necesita la clase (fórmulas, paso a paso, equivalencias con Excel).

---

## 2. Inventario de lo que existe

### 2.1 Motor (`src/core`)

| Área              | Qué hay                                                                                                                                                                                                                  | Dónde                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Datos             | Parseo de texto con autodetección de separador, número con coma o punto y resolución por columna (`4.125`), faltantes (`NA`, `-`, `#N/A`…), inferencia de tipo (nominal, ordinal, discreta, continua), límites de tamaño | `core/data/*`                             |
| Frecuencias       | Tabla simple y agrupada (fi, hi/pi, Fi, Hi/Pi, marca de clase)                                                                                                                                                           | `core/statistics/frequency`               |
| Agrupación        | K por Sturges, raíz, Rice, Scott, Freedman–Diaconis o manual; longitud l; intervalos [a, b)                                                                                                                              | `core/statistics/grouping`                |
| Tendencia central | Media aritmética, ponderada, geométrica, armónica, agrupada; mediana cruda, agrupada y ordinal; moda (amodal, uni, multi) y moda agrupada                                                                                | `core/statistics/central-tendency`        |
| Posición          | Cuartiles (R-7 inclusivo / R-6 exclusivo), deciles, percentiles                                                                                                                                                          | `core/statistics/position`                |
| Variabilidad      | Rango, varianza muestral y poblacional (Welford), desviación, CV, RIC, límites de Tukey y atípicos                                                                                                                       | `core/statistics/variability`             |
| Bivariado         | Tabla de contingencia con marginales y porcentajes                                                                                                                                                                       | `core/statistics/contingency`             |
| Explicaciones     | Catálogo «qué / para qué / fórmula» por métrica                                                                                                                                                                          | `core/statistics/explanations/catalog.ts` |
| Precisión         | Suma de Neumaier, Welford, comparación con tolerancia                                                                                                                                                                    | `core/statistics/numeric`                 |

### 2.2 Aplicación

- **Asistente de 4 pasos** (`features/wizard`): Datos → Variables → Cálculos y gráficas → Resultados. Validación con zod, persistencia en `localStorage`, «Seleccionar lo habitual», «Recuperar último análisis».
- **Resultados** (`features/analysis`): resumen con tarjetas, tablas por variable, índice lateral, cruces con mapa de calor, avisos (faltantes, no aplicables).
- **Gráficas** (`components/charts`): circular, barras (también como histograma agrupado), polígono, ojiva, mapa de calor de contingencia; paleta determinista; tabla equivalente accesible.
- **Exportación** (`features/export`, `infrastructure/export`): PDF con selección de secciones (jsPDF), CSV y XLSX de datos y tablas, PNG por gráfica y «Todas las gráficas».
- **Ayuda**: hoja lateral con guía rápida (`components/layout/app-shell.tsx`).
- **IA**: solo el puerto `AiReportProvider`, sin implementación (`infrastructure/ai`).
- **Calidad**: TypeScript estricto, capas verificadas con ESLint, CI, CSP sin `eval`, accesibilidad AA trabajada, modo oscuro.

### 2.3 Hallazgos del recorrido del sitio (2026-11-16)

- Paso 3: 20 casillas con nombres técnicos; el botón «Seleccionar lo habitual» resuelve, pero quien no sabe no entiende qué eligió ni por qué.
- Resultados: la página mide unos 14 600 px de alto con 4 variables; no hay forma de ver «lo importante» primero.
- Las tarjetas explican **qué es** la media, no **qué dice esta media** de estos datos.
- Texto crudo de código en pantalla: «Número de intervalos K = 6 (regla: **sturges**)» (`features/analysis/components/variable-results.tsx:334`).
- El formato `svg` está declarado en `export-selection.ts` pero no implementado.
- No se puede **escribir** datos en una tabla, solo pegar texto o subir archivo.
- No se puede copiar una tabla o un resultado al portapapeles.
- Abiertos del HANDOFF que afectan al plan: PDF de unos 40 MB (rasterizado), tarjetas con más del 60 % vacío, PNG que incluye el enlace «Descargar PNG», no hay `wigi.json`.

---

## 3. Alcance completo

Cada módulo responde una **pregunta en lenguaje llano**. Para cada uno se define cómo se entiende con cuatro piezas fijas, que serán el contrato de todo resultado del motor, **en este orden de aparición**:

1. **Interpretación automática** («Qué significa»): frases generadas por reglas deterministas en el dominio a partir del resultado, con la conclusión práctica. Es lo primero que se ve. Sin IA: así es testeable y no inventa.
2. **Explicación llana** del concepto: qué es, sin fórmulas, en una frase; como ayuda secundaria.
3. **Paso a paso**: el cálculo con los números de la persona (tabla de trabajo, sustituciones, fórmula, equivalente en Excel). **Oculto por defecto** detrás de «Ver cómo se calculó».
4. **Exportación**: qué sale en cada formato. En el informe, la interpretación encabeza cada sección y el paso a paso solo entra si la persona lo marca.

La interpretación siempre trae su **advertencia honesta** cuando aplica (muestra pequeña, supuesto no cumplido, correlación no implica causa).

### M0 · Datos: cargar, escribir, preparar

Pregunta: «¿Qué datos tengo?»

- Existe: pegar texto, CSV, XLSX/XLS, encabezados, decimales, faltantes, tipos editables.
- Falta:
  - **Hoja editable** para escribir datos desde cero o corregir celdas (tabla nativa con `<input>`; sin librería de hoja de cálculo).
  - **Conjuntos de ejemplo por tema**, incluido el de la clase de regresión (§7).
  - **Preparación** (la fase de CRISP-DM que hoy no se ve): faltantes (excluir o no), atípicos marcados, recodificar categorías (unir «M» y «Masculino»), variable calculada simple (ej. `Peso / Altura²`). Solo lo mínimo; nada de un lenguaje de fórmulas.
  - **Guardar y abrir proyecto** (`.statlab.json`): datos + análisis + informe. Justificación: el trabajo de una persona dura más de una sesión y `localStorage` no viaja entre equipos.
- Explicación: tipos de variable con ejemplos («¿Se puede sacar promedio? Entonces es cuantitativa»).
- Interpretación: «24 filas, 4 variables, 0 faltantes. _Nota_ y _Edad_ son números; _Género_ y _Ciudad_ son categorías».
- Exporta: CSV, XLSX y proyecto `.json`.

### M1 · Descriptiva de una variable

Pregunta: «¿Cómo son mis datos?»

| Tema                 | Existe                                             | Falta                                                                                                                                                 |
| -------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tablas de frecuencia | Simple, agrupada, acumuladas                       | Mostrar la regla de K con nombre legible y el cálculo de K y l paso a paso                                                                            |
| Tendencia central    | Media (4 tipos), mediana, moda, agrupadas          | Interpretación comparada media vs. mediana (detecta asimetría en palabras)                                                                            |
| Dispersión           | Rango, varianza, desviación, CV, RIC               | Interpretación del CV («variación baja / moderada / alta» con umbrales declarados); tabla de desviaciones paso a paso                                 |
| Posición             | Cuartiles, deciles, percentiles, atípicos de Tukey | **Diagrama de caja y bigotes**; **puntaje z** de cada dato; «¿en qué percentil está el valor X?» (búsqueda inversa)                                   |
| Forma                | Nada                                               | **Asimetría** (coeficiente de Fisher ajustado, el de `COEFICIENTE.ASIMETRIA` de Excel) y **curtosis** (exceso, el de `CURTOSIS`), con interpretación  |
| Gráficos             | Circular, barras, polígono, ojiva                  | **Histograma** propio (barras contiguas con eje continuo), **caja y bigotes**, **gráfico de puntos/tallo** para n pequeño, **Pareto** para categorías |

- Paso a paso: tabla de trabajo xi, xi − x̄, (xi − x̄)², suma, división por n − 1, raíz. Igual para mediana (posición (n+1)/2) y cuartiles (posición R-7).
- Interpretación ejemplo: «La nota típica es 3,7 (media) y la mitad saca más de 3,75 (mediana). Como son casi iguales, la distribución es simétrica. La desviación de 0,73 indica que la mayoría está entre 3,0 y 4,5. No hay atípicos».
- Exporta: tablas (CSV, XLSX, copiar), gráficas (PNG, SVG, copiar imagen), sección del PDF con interpretación y paso a paso opcional.

### M2 · Dos variables (exploración)

Pregunta: «¿Se relacionan estas dos cosas?»

- Existe: contingencia con mapa de calor.
- Falta: **diagrama de dispersión** (número vs. número), **cajas por grupo** (número vs. categoría), **barras agrupadas/apiladas** (categoría vs. categoría, ya prevista en RF-25 y no hecha), **media por grupo**.
- Lleva de la mano a M5 (pruebas) y M6 (correlación y regresión): «¿Quieres saber si esta diferencia es real o casualidad? → Prueba».

### M3 · Probabilidad y distribuciones

Pregunta: «¿Qué tan probable es…?»

- Falta todo. Alcance básico, justificado porque es la base de los intervalos y pruebas:
  - Conceptos: probabilidad como frecuencia relativa (enlaza con M1), regla de la suma y del producto, probabilidad condicional desde la tabla de contingencia (ya existe el dato).
  - **Calculadora visual de distribuciones**: Binomial, Poisson, Normal, t de Student, Chi-cuadrado, F. La persona escribe «P(X ≤ 3)» o mueve un control y ve el área sombreada.
  - **Normal estándar y puntaje z**: «¿Qué porcentaje está por debajo de 4,5?».
  - **¿Mis datos parecen normales?**: histograma con curva normal superpuesta, gráfico Q-Q y lectura de asimetría y curtosis. Shapiro-Wilk queda opcional (ver §4).
- Paso a paso: estandarización z = (x − μ)/σ, lectura de la tabla, fórmula binomial con combinatorio.
- Interpretación: «Hay 15,9 % de probabilidad de sacar menos de 3,0 si las notas se comportan como una normal con media 3,74 y desviación 0,73».
- Equivalencias Excel: `DISTR.NORM.N`, `DISTR.BINOM.N`, `POISSON.DIST`, `DISTR.T.N`…
- Exporta: gráfica (PNG/SVG), resultado en texto (copiar), sección del PDF.

### M4 · Muestreo e intervalos de confianza

Pregunta: «¿Qué puedo decir de toda la población con mi muestra?»

- Falta todo:
  - Explicación de muestra vs. población, error estándar, **simulación del teorema del límite central** (medias de muestras remuestreadas de los datos de la persona: se ve, no se cree).
  - **IC para la media** (t), **IC para una proporción** (Wilson, más estable que Wald con n pequeño; se explica por qué), IC para la diferencia de medias y de proporciones.
  - **Tamaño de muestra** para estimar una media o proporción con un margen dado.
- Paso a paso: x̄ ± t(α/2, n−1) · s/√n con cada número sustituido.
- Interpretación (con la redacción correcta, que es donde casi todos se equivocan): «Con un método que acierta el 95 % de las veces, la nota media de la población está entre 3,43 y 4,05». Advertencia si n < 30 y los datos no parecen normales.
- Equivalencias Excel: `INTERVALO.CONFIANZA.T`.
- Exporta: tabla de resultado, gráfica del intervalo, PDF.

### M5 · Pruebas de hipótesis

Pregunta: «¿Es real esta diferencia o pudo ser casualidad?»

- Falta todo. Conjunto mínimo que cubre las preguntas habituales:

| Pregunta en llano                        | Prueba                                                        | Datos                                 |
| ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| ¿El promedio es distinto de un valor?    | t de una muestra                                              | 1 numérica                            |
| ¿Una proporción es distinta de un valor? | z de proporción                                               | 1 categórica                          |
| ¿Dos grupos tienen promedios distintos?  | t de Welch (no supone varianzas iguales; Student como opción) | numérica + categórica de 2 niveles    |
| ¿Antes y después cambió?                 | t pareada                                                     | 2 numéricas emparejadas               |
| ¿Tres o más grupos difieren?             | ANOVA de un factor (con Tukey HSD opcional)                   | numérica + categórica de 3+ niveles   |
| ¿Dos categorías están relacionadas?      | Chi-cuadrado de independencia (+ V de Cramér)                 | 2 categóricas (reusa la contingencia) |
| ¿Dos proporciones difieren?              | z de dos proporciones                                         | categórica + grupo                    |

- Cada prueba sigue el mismo guion de **5 pasos** (paralelo al método de la clase): 1) hipótesis en palabras y en símbolos, 2) nivel de significancia, 3) estadístico con sustitución, 4) valor p (con la curva y el área sombreada), 5) decisión y conclusión en llano. Más **tamaño del efecto** (d de Cohen, η², V de Cramér) para no confundir «significativo» con «importante».
- Comprobación de supuestos visible (normalidad aproximada, frecuencias esperadas ≥ 5 en chi-cuadrado) con aviso y alternativa sugerida.
- Interpretación: «Las mujeres sacaron en promedio 0,4 puntos más (3,9 vs. 3,5). Con p = 0,18 esa diferencia **podría deberse al azar**: con estos 24 datos no hay evidencia suficiente. No significa que sean iguales».
- Equivalencias Excel: `PRUEBA.T.N`, `PRUEBA.CHICUAD`.
- Exporta: tabla de la prueba, gráfica, PDF con los 5 pasos.

### M6 · Correlación y regresión lineal simple

Pregunta: «¿Se mueven juntas? ¿Puedo predecir Y a partir de X?»

- Falta todo. Es el corazón de lo visto en clase, así que va completo:
  - **Correlación** de Pearson (y Spearman para ordinales o relaciones no lineales), con prueba de significancia y matriz de correlación para varias variables.
  - **Regresión simple** con el **método de los 5 pasos** de la nota de clase, mostrado con los números de la persona:
    1. Modelo Yi = B0 + B1·Xi y la suma de errores al cuadrado S = Σ(Yi − B0 − B1·Xi)².
    2. Derivar S respecto a B0 y a B1.
    3. Igualar a 0 → ecuaciones normales: ΣY = n·b0 + b1·ΣX; ΣXY = b0·ΣX + b1·ΣX².
    4. Resolver el sistema (por eliminación, mostrando cada paso; Cramer como alternativa).
    5. Escribir la recta Ŷ = b0 + b1·X y usarla.
  - Tabla de trabajo: X, Y, X², XY, Ŷ, e = Y − Ŷ, e², (Y − Ȳ)². Totales al pie.
  - **SCE, SCT, SCR**, **R² = 1 − SCE/SCT**, **R**, error estándar de la estimación, prueba t de la pendiente e IC de b0 y b1 (enlaza con M4 y M5).
  - **Gráficos**: dispersión con la recta y los residuos dibujados como segmentos (se ve qué se minimiza), residuos vs. ajustados, histograma de residuos.
  - **Predecir**: la persona escribe un X y obtiene Ŷ con intervalo de predicción; aviso si X está fuera del rango observado (extrapolación).
  - **Equivalencias Excel** en pantalla: `INTERSECCION.EJE`, `PENDIENTE`, `COEFICIENTE.R2`, `COEF.DE.CORREL`, `ESTIMACION.LINEAL`, `PRONOSTICO.LINEAL`.
- Dos correcciones conceptuales que el producto debe enseñar bien:
  - Mínimos cuadrados **minimiza** la suma de errores al cuadrado (la nota dice «maximizar»; el paso 2 lo explicará con una frase y el gráfico de segmentos).
  - **R = √R² pierde el signo.** En simple, r lleva el signo de b1; es lo que devuelve `COEF.DE.CORREL`. Se mostrará r con signo y se explicará por qué.
- Interpretación: «Por cada hora más de estudio, la nota sube 0,6 puntos en promedio. Con 0 horas la recta predice 2,2. El modelo explica el 90 % de la variación de la nota (R² = 0,90). Correlación no es causalidad».
- Exporta: tabla de trabajo (CSV, XLSX, copiar), **XLSX con fórmulas de Excel vivas** para que se pueda verificar en clase, gráficas, PDF con los 5 pasos.

### M7 · Regresión múltiple y polinómica

Pregunta: «¿Puedo predecir Y con varias variables a la vez? ¿Y si la relación es curva?»

- Falta todo:
  - **Múltiple**: ecuaciones normales en forma matricial (XᵀX)·b = Xᵀy, mostradas para 2 predictores con sumas, como extensión directa del paso 3 de la simple; para más, la tabla de coeficientes. R² y **R² ajustado** (se explica por qué el R² simple siempre sube al agregar variables), prueba F global, t por coeficiente, **VIF** para multicolinealidad. Predictores categóricos con variables indicadoras (se explica la categoría de referencia).
  - **Polinómica**: es múltiple con X, X², X³…; selector de grado con comparación de R² ajustado y aviso de sobreajuste (la curva de grado alto «memoriza» los datos).
  - Gráficos: dispersión con curva (polinómica), real vs. predicho, residuos.
- Interpretación: «Manteniendo la edad constante, cada hora de estudio suma 0,5 puntos». Advertencias: pocas filas por variable, VIF alto.
- Equivalencia Excel: `ESTIMACION.LINEAL` con varias columnas; línea de tendencia polinómica.
- Exporta: tabla de coeficientes, ANOVA de la regresión, gráficas, PDF.

### M8 (añadido) · Regresión logística

Pregunta: «¿Puedo predecir un sí/no?»

- **Justificación**: muchas preguntas reales de una persona sin formación son binarias (¿aprueba o no?, ¿compra o no?) y la regresión lineal da probabilidades fuera de [0, 1]. Es el puente natural entre regresión y clasificación, y encaja en la fase de evaluación de CRISP-DM.
- Alcance: logística binaria por IRLS (reusa el solucionador de M7), coeficientes como **razones de momios** («cada hora más multiplica por 1,8 las probabilidades de aprobar»), curva sigmoide, **matriz de confusión**, exactitud, sensibilidad y especificidad con umbral ajustable, pseudo-R² de McFadden.
- Paso a paso: no tiene ecuaciones normales cerradas; se explica que se resuelve por aproximaciones sucesivas y se muestra la tabla de iteraciones (cómo converge).
- Exporta: coeficientes, matriz de confusión, gráficas, PDF.
- Fuera de alcance: multinomial y ordinal.

### M9 (añadido) · Flujo guiado CRISP-DM

- **Justificación**: se vio en clase y ordena exactamente lo que necesita una persona sin formación: primero la pregunta, luego los datos, luego el método, y al final evaluar y comunicar. Además resuelve el problema del flujo actual (casillas técnicas sin contexto).
- No es un módulo de cálculo: es el **modo guiado** que recorre los demás módulos y deja cada fase documentada en el informe:

| Fase CRISP-DM               | En StatLab                                                                                         | Qué queda en el informe            |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1. Comprensión del problema | La persona escribe su pregunta y elige su tipo («describir», «comparar», «relacionar», «predecir») | Objetivo en una frase              |
| 2. Comprensión de los datos | M0 + M1 automático: resumen de cada variable                                                       | Tabla resumen, faltantes, atípicos |
| 3. Preparación              | Limpieza de M0 (faltantes, recodificar, atípicos)                                                  | Bitácora de cambios aplicados      |
| 4. Modelado                 | El método que recomienda el selector (§5.3)                                                        | Resultado con paso a paso          |
| 5. Evaluación               | Supuestos, R², residuos, tamaño del efecto, matriz de confusión                                    | Lista de verificación con semáforo |
| 6. Despliegue               | Informe final y exportación                                                                        | El PDF o XLSX final                |

### Añadidos menores, justificados

- **Tamaño de muestra** (M4): pregunta frecuente antes de recoger datos.
- **Puntaje z y «¿en qué percentil está X?»** (M1): la forma más natural de ubicar un dato propio.
- **Pareto** (M1): la gráfica más pedida en contextos de empresa para categorías.
- **Proyecto guardable** (M0): sin esto, el informe acumulativo no sobrevive entre equipos.

### Deliberadamente fuera de alcance (y por qué)

- Series de tiempo, agrupamiento, árboles, redes: otro curso; diluyen el producto.
- Batería completa de no paramétricas (Mann-Whitney, Kruskal-Wallis, Wilcoxon): se ofrecen como **fase opcional** (F8); en la versión base la app avisa cuando el supuesto falla y nombra la alternativa. **Hecho el 2026-11-16** (pendientes menores): el selector las usa cuando el supuesto falla, junto con la prueba del signo y la exacta de Fisher.
- Shapiro-Wilk: opcional; Q-Q + asimetría/curtosis bastan para el nivel del curso.
- Informe narrado con IA (RF-36): la interpretación por reglas cubre la necesidad sin enviar datos fuera del navegador (RNF-01). Se puede retomar después.

---

## 4. Implicaciones técnicas (para dimensionar, no para implementar ahora)

- **Todo sigue en el navegador** (RNF-01): sin backend. El motor nuevo va en `src/core/statistics/*` con la misma regla de pureza.
- **Distribuciones** (t, chi-cuadrado, F, normal): CDF e inversa con la función gamma incompleta y la beta incompleta regularizada (fracción continua de Lentz). Unas 300 líneas puras, probadas contra valores de R y Excel. Se prefiere a añadir `jstat` (sin mantenimiento activo, tipos pobres).
- **Álgebra lineal**: matrices pequeñas (decenas de columnas). Descomposición QR o Cholesky propia para (XᵀX)·b = Xᵀy y para IRLS. Sin dependencia nueva.
- **Contrato de resultado ampliado**: hoy `Metric` lleva valor + `Explanation`. Se extiende con `steps` (paso a paso estructurado: tabla de trabajo, sustituciones) e `interpretation` (frases generadas por reglas). Ambos en el dominio, para que pantalla, PDF y XLSX digan lo mismo.
- **Gráficas**: Recharts ya está; cubre dispersión, caja (compuesta), histograma y curvas. Las áreas sombreadas de distribuciones se dibujan con `Area`.
- **Exportación**:
  - Portapapeles: tablas como TSV (se pegan bien en Excel y Sheets), resultado como texto, gráfica como imagen (`ClipboardItem`, soportado en el suelo de navegadores declarado). Hay que revisar la nota del HANDOFF que evitaba `navigator.clipboard`.
  - SVG: Recharts ya dibuja SVG; basta serializarlo (formato ya declarado, sin implementar).
  - PDF: hay que bajar los ~40 MB antes de que el informe crezca (gráficas vectoriales o JPEG a escala moderada).
  - XLSX con fórmulas vivas para regresión (SheetJS ya lo permite).
- **Navegación**: hoy una sola página con pasos. El nuevo flujo (§5) necesita rutas o vistas por módulo. Antes de escribir rutas hay que leer la guía de Next 16 en `node_modules/next/dist/docs/` (lo exige `AGENTS.md`) y mantener la exportación estática.
- **Rendimiento**: regresiones y pruebas son baratas con n ≤ 50 000; la simulación del límite central se acota (p. ej. 2 000 remuestreos). Web Worker solo si se mide bloqueo > 100 ms (RNF-06).

---

## 5. Enfoque de UX

### 5.1 Principios

1. **Pregunta primero, método después.** La persona dice qué quiere saber; la app elige el método y explica por qué.
2. **La interpretación primero.** Cada resultado abre con la frase de interpretación, la conclusión práctica y el número clave. Tablas de trabajo, fórmulas y paso a paso **no se ven** hasta que la persona pulsa «Ver cómo se calculó».
3. **Tres capas de profundidad**, siempre en el mismo orden y solo la primera abierta: _Qué significa_ (llano, visible) → _Cómo se calculó_ (paso a paso con sus números, oculto) → _Fórmula y equivalente en Excel_ (dentro del mismo desplegable).
4. **Nada bloqueado sin motivo** (regla que ya existe): lo no aplicable se ve deshabilitado con su porqué y con la alternativa.
5. **Todo resultado se puede llevar**: cada tarjeta tiene «Copiar», «Descargar» y «Añadir al informe».

### 5.2 Flujo principal y navegación

Se reemplaza el asistente lineal de un solo uso por un **espacio de trabajo** con cuatro zonas fijas en la barra lateral (en móvil, barra inferior):

```
┌───────────────┬─────────────────────────────────────────────┐
│ 1 Datos       │                                             │
│ 2 Explorar    │   Vista del módulo elegido                  │
│ 3 Analizar ▸  │   (pregunta → resultado → interpretación)   │
│   · Describir │                                             │
│   · Comparar  │   [Copiar] [Descargar] [Añadir al informe]  │
│   · Relacionar│                                             │
│   · Predecir  │                                             │
│   · Probabil. │                                             │
│ 4 Informe (3) │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

- **1 Datos**: cargar, escribir, preparar (M0). Siempre visible cuántas filas y variables hay.
- **2 Explorar**: resumen automático de cada variable al cargar (M1 con «lo habitual» ya aplicado). Es lo que hoy es «Resultados», pero sin tener que elegir casillas antes.
- **3 Analizar**: módulos agrupados por **intención**, no por nombre técnico. El nombre técnico aparece como subtítulo («Comparar dos grupos · prueba t»).
- **4 Informe**: lo que la persona fue añadiendo, en orden editable, con título y notas; desde aquí se exporta todo junto.
- **Modo guiado (CRISP-DM)**: un botón «Guíame» en la portada recorre las seis fases (§M9) usando las mismas vistas, con una barra de fase arriba. Quien ya sabe usa el espacio libre.
- El asistente actual no se tira: sus pasos 1–2 pasan a ser «Datos» y su paso 4 a ser «Explorar».

### 5.3 Cómo guiar a quien no sabe qué prueba usar

Selector **«¿Qué quieres saber?»** con tarjetas de preguntas y ejemplos con sus propios nombres de columnas:

1. «Describir una variable» → M1.
2. «Comparar grupos» → pide la variable numérica y la de grupo → según cuántos grupos y si son las mismas personas: t de Welch, t pareada o ANOVA.
3. «Ver si dos cosas se relacionan» → según tipos: dos números → correlación + dispersión; dos categorías → chi-cuadrado; número y categoría → comparar grupos.
4. «Predecir algo» → si Y es número: regresión simple, múltiple o polinómica (según número de X y forma de la nube); si Y es sí/no: logística.
5. «Calcular una probabilidad» → M3.
6. «Estimar para toda la población» → M4.

La recomendación siempre se muestra con su razón («Elegimos t de Welch porque comparas un número entre 2 grupos distintos y no sabemos si varían igual») y un enlace «¿Por qué no otra?» con las alternativas descartadas. También funciona al revés: si la persona elige dos columnas en Explorar, la app sugiere el análisis que corresponde.

---

## 6. Matriz tema → estado → evidencia

Leyenda: **Existe** · **Parcial** (hay base, falta lo pedido) · **Falta**.

| Tema                                                | Estado  | Evidencia                                                                        |
| --------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| Carga por texto, CSV, Excel                         | Existe  | `infrastructure/import/*`, `features/wizard/steps/step-data.tsx`                 |
| Escribir datos en una tabla                         | Falta   | Solo `textarea` de pegado en `step-data.tsx`                                     |
| Tipos de variable e inferencia                      | Existe  | `core/data/infer-kind.ts`, `step-variables.tsx`                                  |
| Faltantes                                           | Existe  | `core/data/missing.ts`, RF-07                                                    |
| Preparación (recodificar, calculadas)               | Falta   | Sin código                                                                       |
| Guardar/abrir proyecto                              | Parcial | Solo `localStorage` (`infrastructure/storage`)                                   |
| Tablas de frecuencia (simple, agrupada, acumuladas) | Existe  | `core/statistics/frequency`, `grouping`                                          |
| Tendencia central                                   | Existe  | `core/statistics/central-tendency`                                               |
| Dispersión                                          | Existe  | `core/statistics/variability`                                                    |
| Posición (cuartiles, percentiles)                   | Existe  | `core/statistics/position`                                                       |
| Atípicos (Tukey)                                    | Existe  | `variability.ts:142` `detectOutliers`                                            |
| Caja y bigotes                                      | Falta   | `chart-registry.ts:20` solo `pie`, `bar`, `polygon`, `ogive`                     |
| Puntaje z, percentil de un valor                    | Falta   | Sin código                                                                       |
| Asimetría y curtosis                                | Falta   | Sin código en `core`                                                             |
| Histograma propio                                   | Parcial | Barras sobre la tabla agrupada; requisitos lo marcan como pendiente              |
| Polígono, ojiva, circular, barras                   | Existe  | `components/charts/*`                                                            |
| Pareto, dispersión, barras agrupadas                | Falta   | Barras agrupadas previstas en RF-25, no hechas                                   |
| Tabla de contingencia                               | Existe  | `core/statistics/contingency`, `contingency-heatmap.tsx`                         |
| Explicación llana por métrica                       | Parcial | Catálogo genérico `explanations/catalog.ts`; no habla de los datos de la persona |
| Paso a paso del cálculo                             | Falta   | Solo fórmula en texto en el catálogo                                             |
| Interpretación automática del resultado             | Falta   | Sin código                                                                       |
| Probabilidad y distribuciones                       | Falta   | Sin código                                                                       |
| Muestreo, error estándar, límite central            | Falta   | Sin código                                                                       |
| Intervalos de confianza                             | Falta   | Sin código                                                                       |
| Pruebas de hipótesis                                | Falta   | Sin código (preguntas al profesor §5.1 lo dejaron para después)                  |
| Correlación                                         | Falta   | Sin código                                                                       |
| Regresión lineal simple                             | Falta   | Sin código                                                                       |
| Regresión múltiple y polinómica                     | Falta   | Sin código                                                                       |
| Regresión logística                                 | Falta   | Sin código                                                                       |
| Selector «¿qué prueba uso?»                         | Falta   | Solo «Seleccionar lo habitual» (`usual-selection.ts`)                            |
| Flujo CRISP-DM                                      | Falta   | Sin código                                                                       |
| Informe acumulativo                                 | Parcial | PDF con selección de secciones de un solo análisis (`export-dialog.tsx`)         |
| Exportar CSV / XLSX                                 | Existe  | `csv-exporter.ts`, `xlsx-exporter.ts`                                            |
| Exportar PDF                                        | Parcial | Funciona; pesa ~40 MB (HANDOFF)                                                  |
| Imagen PNG de gráficas                              | Existe  | `image-exporter.ts`; incluye por error el enlace «Descargar PNG» (HANDOFF)       |
| Imagen SVG                                          | Falta   | Declarado en `export-selection.ts:27`, sin implementar                           |
| Copiar al portapapeles                              | Falta   | Sin uso de `navigator.clipboard`                                                 |
| XLSX con fórmulas vivas                             | Falta   | Sin código                                                                       |
| Ayuda general                                       | Parcial | Hoja de ayuda (`app-shell.tsx`)                                                  |
| Accesibilidad, tema oscuro, CSP                     | Existe  | HANDOFF rondas 1–3                                                               |
| Textos crudos de código en pantalla                 | Defecto | «regla: sturges» en `variable-results.tsx:334`                                   |

---

## 7. Caso de prueba del módulo de regresión (nota de clase)

La nota da las ecuaciones normales 20 = 5·b0 + 15·b1 y 66 = 15·b0 + 55·b1, es decir n = 5, ΣX = 15, ΣY = 20, ΣX² = 55, ΣXY = 66. Un conjunto que reproduce exactamente esas sumas (la nota no trae la tabla; **Juan debe confirmar si los datos originales de clase son otros**):

| X      | Y      | X²     | XY     | Ŷ = 2,2 + 0,6X | e = Y − Ŷ | e²             | (Y − Ȳ)²    |
| ------ | ------ | ------ | ------ | -------------- | --------- | -------------- | ----------- |
| 1      | 3      | 1      | 3      | 2,8            | 0,2       | 0,04           | 1           |
| 2      | 3      | 4      | 6      | 3,4            | −0,4      | 0,16           | 1           |
| 3      | 4      | 9      | 12     | 4,0            | 0,0       | 0,00           | 0           |
| 4      | 5      | 16     | 20     | 4,6            | 0,4       | 0,16           | 1           |
| 5      | 5      | 25     | 25     | 5,2            | −0,2      | 0,04           | 1           |
| **15** | **20** | **55** | **66** |                | **0**     | **SCE = 0,40** | **SCT = 4** |

Resultados esperados (pruebas del motor con tolerancia `toBeCloseTo(…, 10)`):

- Eliminación: (2) − 3·(1) → 66 − 60 = (55 − 45)·b1 → **b1 = 0,6**; b0 = (20 − 15·0,6)/5 → **b0 = 2,2**.
- **SCE = 0,4**, **SCT = 4**, SCR = 3,6, **R² = 1 − 0,4/4 = 0,9**, **R = √0,9 ≈ 0,948683** (r positivo, igual que `COEF.DE.CORREL`).
- Suma de residuos = 0 (propiedad de mínimos cuadrados; se usa como prueba).
- Comprobación cruzada: `PENDIENTE` = 0,6; `INTERSECCION.EJE` = 2,2; `COEFICIENTE.R2` = 0,9 sobre las mismas columnas en Excel.
- Prueba de signo: el mismo conjunto con Y invertida debe dar r negativo aunque R² sea igual.

---

## 8. Plan por fases

**Base de la estimación.** Medido en este repo: el rediseño completo con tres rondas de revisión ocupó una jornada de trabajo con agentes (2026-11-12, ~9 h entre el primer archivo tocado y el último commit). Cada fase se estimó por analogía con ese volumen (archivos, tests, revisión) y se le suma el **50 %** de margen. Incluye implementación, tests, revisión independiente y verificación en el navegador; no incluye el tiempo de Juan aprobando.

| Fase                                       | Contenido                                                                                                                                                                             | Entrega verificable                                                                                   | Base     | Con margen  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- | ----------- |
| **F0 · Cimientos**                         | Contrato de resultado ampliado (`steps`, `interpretation`); arreglar PDF de 40 MB, PNG con enlace, «regla: sturges»; SVG y portapapeles genéricos; `wigi.json`                        | Toda tarjeta actual se puede copiar y bajar en SVG; PDF < 5 MB                                        | 6 h      | **9 h**     |
| **F1 · Nuevo flujo**                       | Espacio de trabajo (Datos, Explorar, Analizar, Informe), hoja editable, proyecto `.json`, informe acumulativo con «Añadir al informe»                                                 | Se hacen dos análisis y salen juntos en un PDF                                                        | 10 h     | **15 h**    |
| **FL · Landing**                           | Página de presentación en `/` (qué hace, para quién, 3 pasos, ejemplo real de interpretación, exportaciones, llamado a empezar), la app pasa a `/app`; diseño con la skill `disenojg` | 390 y 1440 px sin desborde, accesible, el enlace a `/` sigue llevando a la app para quien ya la usaba | 5 h      | **7,5 h**   |
| **F2 · Descriptiva completa y explicable** | Asimetría, curtosis, z, percentil de un valor; caja, histograma, Pareto, dispersión, barras agrupadas; paso a paso e interpretación de todo lo existente                              | Cada métrica muestra sus tres capas                                                                   | 9 h      | **13,5 h**  |
| **F3 · Regresión simple y correlación**    | M6 completo con los 5 pasos, residuos, SCE/SCT/R²/R, predicción, XLSX con fórmulas; caso de la §7 como prueba                                                                         | El ejemplo de clase da b1 = 0,6, b0 = 2,2, R² = 0,9 en pantalla, PDF y Excel                          | 8 h      | **12 h**    |
| **F4 · Probabilidad e intervalos**         | Motor de distribuciones, calculadora visual, normalidad (Q-Q), límite central, IC, tamaño de muestra                                                                                  | Valores iguales a R/Excel en las tablas de prueba                                                     | 9 h      | **13,5 h**  |
| **F5 · Pruebas de hipótesis y selector**   | t (una, Welch, pareada), proporciones, ANOVA + Tukey, chi-cuadrado; guion de 5 pasos; tamaño del efecto; selector «¿Qué quieres saber?»                                               | Las 6 preguntas del selector llevan a su prueba con razón                                             | 11 h     | **16,5 h**  |
| **F6 · Múltiple, polinómica y logística**  | Solucionador QR, R² ajustado, F, VIF, indicadoras; polinómica con grado; logística IRLS, momios, matriz de confusión                                                                  | Coinciden con `ESTIMACION.LINEAL` y con R `glm`                                                       | 10 h     | **15 h**    |
| **F7 · Modo guiado CRISP-DM y cierre**     | Recorrido de 6 fases, bitácora de preparación, lista de evaluación; revisión integral de accesibilidad, rendimiento, textos; documentación                                            | Un caso completo de punta a punta en modo guiado                                                      | 7 h      | **10,5 h**  |
| **Total**                                  |                                                                                                                                                                                       |                                                                                                       | **75 h** | **112,5 h** |
| F8 · Opcional                              | No paramétricas, Shapiro-Wilk, informe con IA                                                                                                                                         |                                                                                                       | 6 h      | 9 h         |

**Orden y dependencias.** F0 → F1 son obligatorias primero (cambian el contrato y el flujo; hacer módulos antes obligaría a rehacerlos). **F3 va antes que F4 y F5** a propósito: es lo visto en clase y lo que más valor da ya; su prueba t de la pendiente y los IC de b0 y b1 se agregan cuando llegue F4/F5. F2 puede ir en paralelo con F3. F6 depende de F3 (y su parte inferencial de F4). F7 cierra. **FL** (pedida por Juan el 2026-11-16) va justo después de F1: no choca con los módulos de cálculo y necesita la app ya en su ruta propia.

**Entregas parciales útiles**: tras F3 ya hay una versión presentable en clase (descriptiva explicada + regresión simple paso a paso + informe).

---

## 9. Decisiones de Juan (2026-11-16)

1. **Flujo**: espacio de trabajo Datos / Explorar / Analizar / Informe, con informe acumulativo.
2. **Orden**: regresión simple justo después de los cimientos (F3).
3. **Logística y modo guiado CRISP-DM**: dentro del alcance base.
4. **Datos de la clase**: la nota solo trae las sumas (n = 5, ΣX = 15, ΣX² = 55, ΣY = 20, ΣXY = 66) y el punto X = 1, Y = 3. Se usa la tabla de la §7 (que contiene ese punto) como caso de prueba.
5. **Nombre y lema**: se conserva «StatLab»; lema nuevo «Estadística que se entiende: de lo básico a la regresión».
6. **Requisitos**: `docs/01-requisitos.md` actualizado al nuevo público y alcance (§7, RF-37 a RF-56).
7. **Principio rector**: la interpretación va primero; el paso a paso queda oculto por defecto (ver arriba). Las fases se ajustan así:
   - F0 define en el contrato que `interpretation` es obligatoria y `steps` opcional y plegado.
   - F1 diseña tarjeta e informe con la interpretación como encabezado y «Ver cómo se calculó» cerrado.
   - En cada fase, el criterio de aceptación de cada resultado incluye su frase de interpretación probada con tests.
