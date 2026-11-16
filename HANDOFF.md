# HANDOFF · StatLab

Estado del trabajo de diseño. Última actualización: 2026-11-12 (ronda 3: CSP sin `eval`, PNG oscuro, «Cerrar», decimal «Automático» y `public/` limpio).

## Plataforma (desde 2026-11-16): de calculadora descriptiva a «estadística que se entiende»

Plan aprobado por Juan el 2026-11-16: `docs/09-plan-plataforma.md` (alcance M0–M9, matriz, fases F0–F7, 112,5 h con margen tras sumar FL). Requisitos ampliados en `docs/01-requisitos.md` §7 (RF-37 a RF-56). Rama: `feat/plataforma-interpretacion` (sin push). Nota: el commit `08914a6` (`chore(config)`) arrastró por error el reformateo de prettier de `docs/09`; no se reescribió la historia.

**Principio rector (Juan):** la interpretación va primero, en llano y con la conclusión práctica; el paso a paso queda oculto detrás de «Ver cómo se calculó». Decisión técnica en `docs/03-adr/ADR-004-interpretacion-primero.md`.

| Fase                                                                   | Estado                   |
| ---------------------------------------------------------------------- | ------------------------ |
| F0 · Cimientos                                                         | **Cerrada** (2026-11-16) |
| F1 · Nuevo flujo (espacio de trabajo e informe)                        | **Cerrada** (2026-11-16) |
| FL · Landing en `/` y la app en `/app` (pedida por Juan el 2026-11-16) | **Cerrada** (2026-11-16) |
| F2 · Descriptiva completa y explicable                                 | **Cerrada** (2026-11-16) |
| F3 · Regresión simple y correlación                                    | **Cerrada** (2026-11-16) |
| F4 · Probabilidad e intervalos                                         | **Cerrada** (2026-11-16) |
| F5–F7                                                                  | Pendientes (sigue F5)    |

### F4 · qué quedó

- **Motor** (`src/core/statistics/distributions`, `inference`): normal (Φ por gamma incompleta, cuantil de Acklam con un paso de Halley), t, chi-cuadrado, F, binomial y Poisson con densidad, CDF y cuantiles; probados contra valores de R y Excel. Calculadora `describeProbability` (menor, mayor, entre; en discretas incluye los extremos) con interpretación en «de cada 100» y pasos (estandarizar, fórmula de la binomial o Poisson, F(x) con su fórmula de Excel). IC de la media (t), de una proporción (Wilson), de la diferencia de medias (Welch) y de proporciones (Newcombe), tamaño de muestra para media y proporción, y puntos Q-Q con las posiciones de `qqnorm`.
- **Interpretación con la redacción correcta:** «Con un método que acierta el 95 % de las veces, el promedio de … está entre … y …», con advertencias (n < 30, asimetría fuerte, el intervalo no es para cada caso). Con los datos de ejemplo da 3,43 a 4,05, como en el plan.
- **Pantalla** (`src/features/inference`, desde Analizar): «¿Qué tan probable es…?» (seis distribuciones, tomar media y desviación de una variable, área sombreada) y «¿Qué puedo decir de toda la población?» (promedio con Q-Q de normalidad, porcentaje de una categoría, diferencia de promedios entre dos grupos, cuántos datos necesito; confianza 90, 95 o 99 %). Todo con «Añadir al informe».
- **No hecho:** la simulación del límite central y el IC de la diferencia de proporciones en pantalla (el motor ya lo tiene).
- Verificación: 543 tests, tipos, lint y `pnpm build` en verde; paneles revisados a 1440 y 390 px sin desborde.

### F3 · qué quedó

- **Motor** (`src/core/statistics/distributions`, `regression`): t de Student (CDF, cuantil, valor p; probada con tablas y `INV.T`); regresión simple por mínimos cuadrados con SCE, SCT, SCR, R², r con el signo de b1, error estándar, prueba t e IC 95 % de b0 y b1; predicción con intervalo y aviso de extrapolación; Pearson y Spearman (rangos con empates promediados) con su prueba. **Caso de la §7 en tests:** ΣX = 15, ΣX² = 55, ΣY = 20, ΣXY = 66, b1 = 0,6, b0 = 2,2, SCE = 0,4, SCT = 4, R² = 0,9, r = 0,948683, valor p de la pendiente 0,0138.
- **Interpretación primero** (`interpretation/describe-regression.ts`): pendiente en llano, R², fuerza (|r| < 0,1 nula, < 0,3 débil, < 0,7 moderada, ≥ 0,7 fuerte), lectura del valor p con α = 0,05, error típico y advertencias (causalidad, rango de X, b0 fuera de los datos, muestra pequeña).
- **Los 5 pasos de la nota** plegados, con los números de la persona: modelo y S (dice «se minimiza, no se maximiza»), derivadas, ecuaciones normales con su tabla, resolución por eliminación, la recta; más ajuste (Ŷ, e, e², SCE, SCT, R², r con signo) y prueba de la pendiente.
- **Pantalla** (`src/features/regression`, desde Analizar → «¿Puedo predecir…?» o «¿Se mueven juntas…?»): elegir X e Y, interpretación, dispersión con la recta y los residuos como segmentos (hasta 150 puntos), predecir, correlación, coeficientes, ajuste, matriz de correlación (≥ 3 numéricas), residuos contra ajustados, «Añadir al informe» (con la gráfica) y **Excel con fórmulas vivas** (`SLOPE`, `INTERCEPT`, `RSQ`, `CORREL`, `STEYX` y la tabla de trabajo; el exportador XLSX acepta celdas con fórmula).
- La portada marca la regresión como disponible.
- **No hecho:** histograma de residuos (la gráfica de residuos contra ajustados cubre el diagnóstico). La elección de X e Y no se guarda en el proyecto `.statlab.json`.
- Verificación: 525 tests, tipos, lint y `pnpm build` en verde; panel revisado a 1440 y 390 px sin desborde.

### F2 · qué quedó

- **Forma** (`src/core/statistics/shape`): asimetría y curtosis iguales a `COEFICIENTE.ASIMETRIA` y `CURTOSIS` de Excel (probadas con el ejemplo de la ayuda de Excel), puntaje z, percentil de un valor igual a `RANGO.PERCENTIL.INC` (inverso exacto del R-7) y resumen de caja con bigotes de Tukey.
- **Interpretación:** la de cada variable numérica describe la forma desde 8 datos (umbrales de Bulmer: |g| < 0,5 casi simétrica, 0,5–1 algo cargada, > 1 muy cargada; curtosis > 1 o < −1).
- **Paso a paso de todo lo existente:** numéricas (ordenar, promedio, mediana, desviación, CV, cuartiles con sus posiciones y vallas, forma y, si se agrupa, K y l con la regla elegida); cualitativas (contar, proporción, moda y mediana ordinal); cruces (contar combinaciones, % por fila y sobre el total, con `CONTAR.SI.CONJUNTO`). Las fórmulas de varias líneas se parten en pantalla y en el PDF.
- **«¿Dónde queda un valor?»** en cada variable numérica (`value-locator.tsx`, motor en `interpretation/locate-value.ts`): percentil, cuántos datos quedan por debajo y por encima y z con lectura de rareza (|z| < 1 común, < 2 algo alejado, < 3 poco común, ≥ 3 muy raro). El puntaje z se da para cualquier valor que se escriba, no como columna por dato.
- **Gráficas:** histograma de barras contiguas cuando la variable se agrupa, caja y bigotes (SVG propio), Pareto (nominales) y barras agrupadas en cada cruce (% dentro de cada grupo; entra al informe como imagen). Los tipos salen de una sola lista, `CHART_KINDS`. Bloque «Forma» en pantalla, en el informe y en el índice.
- **Movido a otras fases (decisión del agente):** el diagrama de dispersión llega en F3 con el par X–Y de la regresión, para no construir dos veces el selector de pares; cajas y medias por grupo, en F5 con la comparación de grupos.
- Verificación: 492 tests, tipos, lint y `pnpm build` en verde; Explorar con los datos de ejemplo revisado a 1440 y 390 px sin desborde.

### FL · qué quedó

- **Portada en `/`** (`src/features/landing`): lema, para quién es, tres pasos con palotes, ejemplo real (el panel «Qué significa» de la app con su «Ver cómo se calculó»), módulos marcados «Disponible» o «En construcción», formatos de exportación y banda de cierre en ciruela. Diseño con la skill `disenojg` (commit `24fa6b7`, 2026-11-12); decisiones en `docs/05-diseno.md` («Aterrizaje en `/`»).
- **Textos del motor, no a mano:** `sample-insights.ts` corre el motor sobre los datos de ejemplo en el build; si cambia una frase del motor, cambia la portada.
- **Demo viva** (`landing-demo.tsx`): cuatro estados (pegar → qué significa → cómo se calculó → informe), avanza cada 6 s, se pausa con cursor, foco, fuera de vista o pestaña oculta; con movimiento reducido no arranca. Cascada de entrada y revelado por bloque solo en CSS (`animation-timeline: view()` donde existe).
- **La app pasa a `/app`.** `/app#ejemplo` carga los datos de ejemplo y abre Explorar (sin dejar `#ejemplo` en el historial). Los enlaces viejos `/#datos|explorar|analizar|informe` redirigen a `/app#…`. «Seguir con tu último análisis» aparece si el navegador guarda datos. `vercel.json` gana `cleanUrls` para servir `out/app.html` en `/app`.
- «Ver cómo se calculó» pasa a objetivo de 44 px con chevron propio (también en la app).
- Verificación: 461 tests, tipos, lint y `pnpm build` en verde; capturas a 1440×900 y 390×844 en claro y oscuro, `auditoria-visual.js` sin avisos (contraste, objetivos, recortes, subrayados), sin desborde horizontal, demo con hueco máximo de 45 % y comprobada con movimiento reducido. Sin probar: Firefox y WebKit, y `cleanUrls` en Vercel (no se desplegó).

### F1 · qué quedó

- **Espacio de trabajo** (`src/features/wizard/workspace.tsx`, antes `wizard.tsx`): zonas Datos, Explorar, Analizar e Informe con pestañas de cuaderno (`components/layout/zone-nav.tsx`). La zona vive en el hash (`#explorar`); sin datos válidos, Explorar y Analizar explican qué falta. Diseño con la skill `disenojg` (commit `24fa6b7`, 2026-11-12), sobre el sistema «cuaderno de laboratorio» vigente.
- **Datos:** carga, hoja editable (`model/grid.ts`, hasta 1.000 filas, pegado desde Excel; pasa por el mismo lector que el texto pegado) y tipos en la misma pantalla; «Ver qué dicen tus datos» lleva a Explorar.
- **Explorar:** la selección habitual se aplica sola al cargar y se rehace al cambiar tipos mientras la persona no la ajuste (`calculationCustomized`); «Elegir qué se calcula» se abre en línea. El cruce de dos variables trae su interpretación (`interpretContingency`).
- **Informe acumulativo** (`src/features/report`): «Añadir al informe» por variable, por cruce o «Añadir todo»; cada resultado es una copia fija (interpretación, pasos, tablas como texto e imágenes de las gráficas). Se ordena, se anota y se exporta a PDF (interpretación primero; el paso a paso solo si se marca), Excel (hoja «Qué significa» y cifras como números) o texto. Se guarda en el navegador; si no cabe, sin imágenes y con aviso.
- **Proyecto `.statlab.json`:** guardar y abrir datos, tipos, cálculos e informe; se valida entero al abrir.
- **Retirado:** el diálogo de PDF por secciones y su selección (`export-dialog`, `build-report-spec`, `export-selection`, `report-sections`): lo sustituye el informe.
- **Analizar:** preguntas en llano; solo «¿Cómo son mis datos?» está activa; las demás dicen «Llega en una próxima versión» hasta F3–F5.
- Añadir una variable con tres gráficas tarda unos segundos (captura a pixelRatio 2, ~400 KB en localStorage); el botón muestra la carga.
- Verificación: 459 tests, tipos, lint y `pnpm build` en verde; recorrido en `pnpm dev` a 1366 y 390 px (sin desborde).

### F0 · qué quedó

- **Contrato del motor:** todo `VariableAnalysisResult` trae `interpretation` (`headline`, `details`, `caveats`) y `steps` (paso a paso con tabla de trabajo y fórmula de Excel). Reglas en `src/core/statistics/interpretation/` con umbrales declarados (sesgo 0,1 desviaciones; CV 15 % / 30 %; n < 10).
- **Pantalla:** cada variable abre con «Qué significa» y botón Copiar; «Ver cómo se calculó» (un `<details>` nativo) muestra ordenar, media, mediana y desviación con los números de la persona. La tarjeta «Resumen» pasó a llamarse «Las cifras».
- **Exportar:** gráficas → Copiar (imagen), PNG y SVG; tablas de frecuencias, posición y variabilidad → Copiar (texto tabulado). El PDF pone «Qué significa: <variable>» antes de las cifras.
- **Arreglos del pendiente:** PDF comprimido (prueba: PNG de 600×600 pasa de 1,08 MB a < 100 KB); el PNG ya no incluye el botón de descarga (`data-export-ignore`); «regla: sturges» → «regla de Sturges»; `wigi.json` creado.
- **Ojo de rendimiento:** el paso a paso solo formatea las filas que muestra (30); la primera versión recalculaba decimales por celda (O(n²)) y bloqueaba la suite. El arreglo quedó dentro del commit `feat(ui)` de F0.
- Verificación: 443 tests, `tsc`, `eslint` y prettier en verde; revisado a mano en `pnpm dev` con los datos de ejemplo.

## Pendiente: StatLab hay que terminarlo y mejorarlo

Juan pidió que este pendiente **se quede anotado**. La ronda 3 cerró lo marcado «cerrado» más abajo; lo demás sigue abierto.

**Cerrado en la ronda 3**

- Violación de CSP `script-src eval` al cargar (y al generar el PDF): zod va con `jitless` (`src/lib/zod-config.ts`, ver «Ronda 3»).
- PNG exportado en modo oscuro con fondo blanco fijo: ahora usa el fondo de la gráfica en oscuro.
- «Close» en inglés en los diálogos y la hoja de ayuda: ahora «Cerrar».
- Decimal «Automático» que leía `4.125` como 4125: se resuelve con el resto de la columna (queda un caso sin resolver, abajo).
- Iconos de la plantilla de Next en `public/`: borrados.
- El botón «Ayuda» no tenía nombre accesible a 390 px (solo icono): ahora `aria-label="Ayuda"`.

**Hallazgos P3 de la revisión del rediseño (siguen abiertos)**

- La cuadrícula vertical de las gráficas cruza las cifras sobre las barras, también en el PNG exportado.
- En modo oscuro el botón de tema sale relleno de ciruela y compite con «Exportar PDF…».
- Cada tabla es una parada de Tab aunque no tenga desplazamiento (15 a 27 por pantalla de resultados).
- `docs/05-diseno.md` describe una cuadrícula de gráficas (8 y 40 px) distinta de la implementada (líneas continuas con opacidad alterna).

**De origen (ya estaban antes del rediseño; siguen abiertos)**

- ~~El PDF pesa unos 40 MB~~: cerrado en F0 (compresión).
- Con decimal «Automático», una columna en la que **todas** las celdas con decimales tienen exactamente tres cifras (`2.500`, `3.750`, `4.125`) sigue leyéndose como miles (2500, 3750, 4125) y avisa: sin otra celda que pruebe el separador no hay forma segura de decidir. Se arregla eligiendo «Punto decimal» o «Coma decimal».
- Las tarjetas de métrica tienen más del 60 % vacío.
- El esqueleto de carga parpadea aunque se pida movimiento reducido.
- En `notas.xlsx`, elegir «Otra hoja» no cambia la vista previa.
- ~~No hay `wigi.json`~~: creado en F0.
- ~~El PNG exportado incluye dentro de la imagen el enlace «Descargar PNG»~~ (cerrado en F0). Se arregla excluyéndolo con la opción `filter` de `html-to-image`; no se hizo en la ronda 3 para que el PNG en claro siguiera idéntico byte a byte.
- **Revisión de la ronda 3, para decidir:** con decimal «Automático», una sola celda que use el punto como decimal (`1.5`) hace que las celdas de tres cifras de la misma columna (`1.500`, `2.000`) se lean como decimales (1,5 y 2) **sin aviso**; antes eran 1500 y 2000 con aviso. Solo afecta a columnas que mezclan las dos convenciones. Mejora posible: un aviso informativo cuando la columna decide una celda dudosa. Además, celdas con varios puntos (`1.234.567`, cédulas con puntos) ahora son números y no texto, de modo que una columna de identificadores así pasa de categórica a cuantitativa.

## Ronda 3 (2026-11-12)

- **CSP sin `eval`.** Zod sondeaba `new Function("")` al crear el primer `z.object` y la CSP de `vercel.json` (sin `unsafe-eval`) registraba una violación por carga. `src/lib/zod-config.ts` hace `z.config({ jitless: true })` y cada archivo que define esquemas lo importa **antes** que `zod` (`analysis/model/schema.ts`, `export/model/export-selection.ts`, `wizard/model/validation.ts`, `import/schemas.ts`, `storage/schemas.ts`): el sondeo ocurre al crear el esquema, así que el orden importa. Un esquema nuevo debe hacer lo mismo. Con las cabeceras de `vercel.json`: 0 violaciones en Chromium, Firefox y WebKit al cargar, al recorrer el asistente y al generar el PDF (antes, 1 por carga). La validación da el mismo resultado (prueba en `zod-config.test.ts`).
- **PNG en oscuro.** `captureElementAsPng` usaba `#ffffff` fijo, que tapaba el fondo de la gráfica y dejaba el texto claro sobre blanco. Ahora, si `<html>` tiene la clase `dark`, el fondo es el `background-color` calculado del elemento (la superficie de la gráfica, `#191f25`); si no tiene fondo propio, vuelve a blanco. **En claro no cambia nada: PNG idéntico byte a byte.** Decisión: seguir el tema (la imagen se ve como en pantalla) en lugar de recolorear la gráfica a tonos claros, que obligaría a duplicar el tema de gráficas. Efecto colateral buscado: las gráficas del PDF generado en oscuro también salen legibles (antes, texto claro sobre blanco); sobre la hoja blanca del PDF se ven como un recuadro oscuro. En claro el PDF no cambia (solo la hora y las marcas de creación).
- **«Cerrar».** El nombre accesible del icono de cierre de diálogos y hojas y el botón del pie del diálogo dicen «Cerrar».
- **Decimal «Automático»** (`src/core/data/parse-number.ts`, `build-dataset.ts`). Solo cambia el modo automático; con «Coma decimal» o «Punto decimal» el resultado es el de siempre. Reglas:
  1. Con `,` y `.` juntos, el de más a la derecha es el decimal (`1.234,5`, `1,234.5`). Sin cambios.
  2. Un mismo símbolo repetido en grupos de tres es miles: `1.234.567` → 1234567 (antes caía a texto). Grupos mal formados (`1.2.3`, `1.234.56`) siguen sin ser número.
  3. Un único separador con 1, 2 o más de 3 cifras detrás es decimal (`1,5`, `12.5`). También lo es si la parte entera no puede ser un primer grupo de miles: `0.125`, `.125`, `1234.567` (antes se leían como 125 y 1234567).
  4. Un único separador con **exactamente 3 cifras** y una parte entera que sí podría ser un grupo (`4.125`, `1,234`) es ambiguo y lo resuelve la columna (`detectColumnDecimal`): si otra celda sin dudas usa ese símbolo como decimal (`2.5`) o el otro como miles (`1.234,5`), es decimal; si usa el otro como decimal (`1,5`) o ese como miles (`1.234.567`), es miles. Sin pruebas, o con pruebas contradictorias, se conserva lo de antes: miles y aviso «decimal ambiguo».
     El aviso solo sale cuando la columna no lo resuelve. Los tres conjuntos de la línea base (`pequeno.txt`, `grande.csv`, `notas.xlsx`) solo cambian en `pequeno.txt`, que contiene exactamente `4.125` junto a `2.5` y `3.75`: ahora `Peso` se lee con 4,125 (máximo 6,25, media 3,55) y desaparece el aviso. `grande.csv` y `notas.xlsx` no cambian en nada (interfaz y motor).
- **`public/`.** Borrados `file.svg`, `globe.svg`, `next.svg`, `vercel.svg` y `window.svg`: ninguno aparecía en `src`, metadatos, CSS ni configuración (los favicons salen de `src/app`).

Cómo verificar lo nuevo: `pnpm check` (420 tests); `pnpm build` y servir `out/` con las cabeceras de `vercel.json` (hay un servidor estático de ejemplo en la carpeta de artefactos del encargo) mirando `securitypolicyviolation`; en modo oscuro, resultados → «Descargar PNG» y abrir la imagen; pegar `Peso` con `2.5`, `3.75` y `4.125` y ver que la vista previa dice `4,125` sin aviso.

## Navegadores objetivo

Declarados en `browserslist` de `package.json`: **Safari y iOS Safari 16.4+, Chrome y Edge 111+, Firefox 128+, Samsung Internet 22+**.

No se llegó a Safari 14 / Chrome y Firefox 90 que pidió Juan como punto de partida: el suelo lo impone **Tailwind CSS 4** (usa `@property`, `color-mix()` y `@layer`), y bajarlo exigiría migrar a Tailwind 3. Next.js 16 ya apunta por defecto a Chrome/Edge 111, Firefox 111 y Safari 16.4; Firefox sube a 128 por Tailwind. Por debajo de ese suelo la página se carga pero sin estilos garantizados.

### Respaldos añadidos (ronda 2)

- `color-mix()` y `oklch()` propios sustituidos por tokens sRGB equivalentes en `globals.css` (`--cuadricula-25/50/55`, `--seleccion`, `--peligro-hover`, sombra flotante) y en `button.tsx`. Tailwind ya protege con `@supports` sus propias mezclas de opacidad.
- `select`: la lista dibujada va dentro de `@supports (appearance: base-select)`; sin él, el control cerrado sigue dibujado y la lista es la nativa (Firefox y móviles). Su `:hover` va en `@media (hover: hover)`.
- `hover:` de Tailwind 4 ya se compila dentro de `@media (hover: hover)` (comprobado en el CSS generado): sin estados pegados en táctil.
- `forced-colors`: foco en `Highlight`, borde en botones, casillas, interruptores y select, marcado con `Highlight`, paso actual con contorno.
- `ResizeObserver` con guarda en las tablas con desplazamiento; `IntersectionObserver` del índice ya la tenía.
- Sin `dvh`/`svh`, `@container` con consultas, `structuredClone`, `.at()`, `inert`, `navigator.clipboard` ni `backdrop-filter` en el código propio. `has-[...]` solo en detalles (relleno de botón, foco de la fila de opción, columnas de la alerta): dentro del suelo declarado está soportado.
- Fuentes: `font-display: swap`, ejes de fuente variable solo en el peso.

### Lo que no se probó de verdad

Safari de macOS e iOS, Samsung Internet, Firefox de escritorio real y navegadores viejos: Playwright solo trae Chromium 158, Firefox 159 y WebKit 27.2. `forced-colors` se emuló con el medio de Playwright, que no recolorea la página (solo activa las reglas `@media`): hay que mirarlo en Windows con un tema de alto contraste. Tampoco el táctil real ni abrir el XLSX/PDF en su aplicación.

## Estado del CI

`.github/workflows/ci.yml` fallaba en `pnpm audit --prod --audit-level high` (19 avisos). Se subieron `next` y `eslint-config-next` 16.3.5 → 16.4.1, `zod` → 4.6.7, y se fijaron con `overrides` de `pnpm-workspace.yaml` `dompurify` ^3.4.17 (vía `jspdf`) y `source-map-js` ^1.2.2 (vía `next`); `sharp` 0.35.5 llega con `next`. Resultado local: `No known vulnerabilities found`. Lint, tipos, 395 tests y build pasan; el formato pasa con `prettier --check --end-of-line auto` (en Linux, con LF, es el comando del CI). **No se ha visto el run real en GitHub** (no se hizo push). Cálculos y exportaciones idénticos tras la actualización: motor byte a byte, CSV, XLSX y PNG byte a byte, PDF con el mismo texto y páginas (cambian la hora impresa y las marcas de creación).

## Favicon

Palotes de conteo sobre placa ciruela: `src/app/icon1.svg` (SVG), `icon2.png` (32 px) y `apple-icon.png` (180 px, opaco), más `theme-color` en el `viewport` de `layout.tsx`. El logo de la cabecera (`brand-logo.tsx`) dibuja lo mismo. No hay manifest ni `favicon.ico`.

## Dónde estamos

Rediseño visual completo en la rama `design/disenojg`, integrada en `main` por avance rápido y publicada el 2026-11-12: dirección **«cuaderno de laboratorio de estadística»**, decidida en `docs/05-diseno.md` («Decisión final (2026-11-12)»). La decisión anterior (editorial académico, verde bosque, Plus Jakarta Sans) quedó como histórico en el mismo documento.

Qué cambió: paleta fría de papel cuadriculado con acción **ciruela `#7e306b`**, **Atkinson Hyperlegible Next y Mono** con `next/font`, botón con cuerpo, foco con anillo doble, campos y casillas propios, `select` nativo dibujado, tablas con cifras en mono, tema de gráficas con papel milimétrico y firma de **palotes de conteo** (stepper, carga, vacíos).

Qué **no** cambió: motor de cálculo (`src/core`), casos de uso, modelos, stores, parsers y exportación (`src/infrastructure`), formato de números, textos de las pantallas (salvo los tres cambios declarados abajo).

Cambios de texto/estructura declarados: desaparece el eyebrow duplicado «Paso N · …» (lo dice el stepper), aparece el enlace «Saltar al contenido» y la tabla del mapa de calor gana título (`caption`).

## Cómo verificar

En el repo:

```bash
pnpm check     # lint + format:check + typecheck + test (543 tests)
pnpm build     # export estático a out/
pnpm dev --port 3101
```

- **Windows:** con `core.autocrlf=true` el checkout deja los archivos en CRLF y `pnpm format:check` marca archivos que no se tocaron (también en `main`). Para comprobar el formato sin ese ruido: `npx prettier --check --end-of-line auto .`.
- **Cálculos idénticos** (la comprobación que importa en un rediseño): los scripts viven fuera del repo, en la carpeta de artefactos del encargo (`comparar-calculos.mjs`, `volcado-directo.mjs`, línea base en `antes/`). Con el servidor en marcha: `comparar-calculos.mjs --url … --salida despues/resultados.json` y `--diff antes/resultados.json despues/resultados.json` (solo deben salir las diferencias declaradas arriba); `volcado-directo.mjs --salida despues/motor.json` y `git diff --no-index antes/motor.json despues/motor.json` (debe salir vacío). Resultado a 2026-11-12: motor idéntico byte a byte; interfaz con solo las diferencias declaradas.
- **Visual:** capturas a 390, 768 y 1440 px en claro y oscuro con el auditor de la skill `diseñoJG` (`auditoria-visual.js`), recorrido con Tab, y pasada en Chromium, Firefox y WebKit.

## Notas de implementación

- `components/ui/select.tsx` conserva la API compuesta de Radix (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`) pero pinta un `<select>` nativo; la lista abierta se dibuja solo con `appearance: base-select` (Chromium 135+, y WebKit 27 en la prueba). Firefox y móviles usan la lista nativa.
- El foco es una sola regla global en `globals.css` (fuera de las capas). No añadas `focus-visible:ring-*` en componentes.
- Las tablas equivalentes de las gráficas van dentro de `div.sr-only` con `table-fixed w-px`: sin eso una `<table>` ignora el ancho de 1 px y provoca desborde horizontal en móvil.
- `Button` admite `loading` (conserva cuerpo y ancho, `aria-busy`, ignora el clic). No se usa en «Descargar PNG» porque esa fila entra en la imagen exportada.
- Con `next dev`, el bloque `nextjs-agent-rules` de `AGENTS.md` se regenera con cada `next dev`; Next 16.4.1 cambió su título a `##` y ese cambio se commiteó (`chore(next)`).

## Revisión independiente de la ronda 2 (2026-11-12)

Veredicto: apto para publicar, sin bloqueantes. Audit en verde (Next 16.4.1 era el mínimo: los avisos críticos llegan hasta 16.4.0); lint, formato en LF, tipos, 395 tests y build pasan; cálculos con cero diferencias y motor idéntico byte a byte; CSV, XLSX y PNG idénticos byte a byte y PDF con el mismo texto salvo la hora; sin peticiones externas con la CSP de `vercel.json`; 30 casos por navegador sin desborde ni errores, y la comparación píxel a píxel con `main` solo cambia el logo y el contorno del paso actual en `forced-colors`. P3 abiertos: la sonda `Function("")` de zod provoca la violación de CSP `eval` al cargar (ya ocurría; se quitaría con `z.config({ jitless: true })`); quedan en `public/` iconos de la plantilla de Next sin uso; `/favicon.ico` da 404 si se pide a mano (los navegadores usan los enlaces del HTML).

## Revisión independiente de la ronda 1 (2026-11-12)

Veredicto: apto con una corrección, ya aplicada en `fix(ui): dejar vacío el select cuando el valor guardado ya no es una opción` (el `select` mostraba la primera opción cuando el valor guardado dejaba de estar disponible, por ejemplo al pasar a cualitativa la columna de pesos; el cálculo no cambiaba, solo lo que se veía). Cálculos: motor idéntico byte a byte; por la interfaz solo las tres diferencias de texto declaradas, también con un conjunto de datos propio del revisor (negativos, repetidos, categórica, vacíos y cruce) comparado contra `main`. Lint, typecheck, test y build pasan; el formato pasa en LF (como lo ve el CI). CSV y XLSX exportados idénticos a los de `main`. Con las cabeceras de `vercel.json`, ninguna petición externa. Sin desborde en Chromium, Firefox y WebKit a 390 y 1440 px. Movimiento reducido, `forced-colors` y zoom al 200 % comprobados emulados.

Los hallazgos P3 abiertos están en «Pendiente: StatLab hay que terminarlo y mejorarlo», arriba.
