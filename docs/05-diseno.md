# StatLab — Dirección de diseño (para implementación con shadcn/ui)

## Decisión final (2026-09-20)

Tras evaluar tres propuestas conmutables (A "Editorial académico", B "Herramienta de datos moderna", C "Cálida y amigable") implementadas simultáneamente detrás de `data-design`, el dueño del producto decidió consolidar:

- **Dirección visual: Propuesta A (Editorial académico)** — fondo hueso, verde bosque como color primario, tarjetas sin borde con una hairline superior (`--surface-ring`), tablas de estilo publicación con reglas finas (`--rule`), ritmo vertical amplio (`--space-section`, `--space-block`).
- **Tipografía: Plus Jakarta Sans** (de la propuesta C) para títulos, cuerpo y UI, en vez de la pareja Source Serif 4 / Inter de la propuesta A original. Se conserva JetBrains Mono como monoespaciada para fórmulas, datos en bruto y cifras tabulares.
- Las cifras grandes (tarjetas de métricas, franja de resultados) usan Plus Jakarta Sans en semibold (`--num-weight: 600`) con `font-variant-numeric: tabular-nums lining-nums` y `letter-spacing` ajustado (`--num-tracking: -0.01em`) para mantener la lectura de números propia de la propuesta A sin la serif.
- El selector de propuestas (`design-switcher.tsx`), el atributo `data-design` y las variantes B y C se eliminaron del código: `globals.css` ahora define directamente `:root` y `.dark` con los tokens definitivos, y `layout.tsx` solo carga Plus Jakarta Sans y JetBrains Mono con `next/font`.
- El ícono (`src/app/icon.svg`, `apple-icon.png`) usa los colores de la propuesta A y se conserva sin cambios.

El resto de este documento (secciones 1 en adelante) es el registro histórico del proceso de diseño previo a esta decisión; se conserva como referencia pero ya no describe el estado actual del código.

## 1. Dirección visual elegida y por qué

StatLab adopta un lenguaje visual de **"herramienta de datos" tipo SaaS técnico en modo claro**: fondo blanco/gris muy claro, tipografía sans-serif geométrica de alto contraste, mucho espacio en blanco, tarjetas con bordes sutiles (no sombras pesadas), y un único color de acento saturado reservado para acciones primarias y datos activos. Esta dirección se apoya en la evidencia agregada de 24 sitios de referencia consultados (79% usan fondo claro, 75% usan una sans-serif "grotesk"), y en el perfil de nuestro usuario: un profesor experto en estadística pero poco hábil con tecnología, que necesita reconocer de un vistazo qué paso está haciendo, qué significa cada número y cómo salir de un error. Por eso se prioriza texto grande (mínimo 16px en body, 14px solo para metadatos secundarios), un solo bloque de contenido por pantalla (nunca dos tareas compitiendo por atención), iconografía mínima y siempre acompañada de texto (nunca solo un ícono), y contraste WCAG AA verificado en cada combinación texto/fondo.

Se descarta deliberadamente la estética "dashboard oscuro para developers" (Builder.io, Novu, Rive, Penpot dark) que domina en herramientas técnicas: es visualmente atractiva pero reduce legibilidad prolongada, intimida a usuarios no técnicos y complica la impresión/exportación a PDF. En su lugar se toma la composición de sitios de datos en modo claro (DuckDB, Statsig, Elastic, DigitalOcean, Flatfile): jerarquía tipográfica clara con un salto grande entre título y cuerpo, tarjetas con relleno generoso y una franja de acento de color que marca únicamente lo interactivo o lo "actualmente seleccionado" (paso activo del wizard, botón primario, barra de progreso). El modo oscuro se ofrece como variante secundaria fiel a los mismos tokens, no como diseño primario.

## 2. Referencias conservadas (composición, no cumplimiento)

| Sitio                    | URL                                | Qué tomar                                                                                                                                                                                                                                                                                          |
| ------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DuckDB**               | https://duckdb.org                 | Fondo blanco puro, headline bold grande centrado, acento amarillo saturado usado con moderación (un solo CTA, un solo dot de logo), tarjetas de features con borde sutil y sin sombra dura — usar este patrón para las tarjetas de "tipo de variable" y "cálculo disponible".                      |
| **Statsig**              | https://statsig.com                | Composición de tarjetas de métricas/producto sobre fondo claro, con íconos pequeños + etiqueta corta debajo; franja de logos de confianza en gris neutro. Tomar el patrón de "tarjeta compacta con ícono + título + descripción de una línea" para las tarjetas de selección de gráficas/cálculos. |
| **Elastic**              | https://elastic.co                 | Carrusel de tarjetas con panel de color a la izquierda y texto a la derecha, uso de un azul de acento consistente en botones y acentos de marca, jerarquía headline/subhead muy limpia. Tomar el uso de un único azul de acento en todos los CTA y el contraste alto texto-sobre-blanco.           |
| **DigitalOcean (About)** | https://www.digitalocean.com/about | Composición de dos columnas (texto corto a la izquierda, visual a la derecha) para pantallas de bienvenida/explicación; uso de un solo azul de marca para el botón primario sobre fondo blanco. Tomar la simplicidad del layout de bienvenida para la pantalla inicial del wizard.                 |
| **Flatfile**             | https://flatfile.io                | Producto centrado en "preparar y validar datos": vista previa de archivos/tablas como elemento central de la pantalla, tono minimalista con mucho aire alrededor de la tabla. Tomar la composición de vista previa de datos para el paso de "ingreso de datos" (dropzone + preview de tabla).      |

Nota: son sitios reales de producción; se toma su composición (retícula, jerarquía, densidad, uso de acento) — no su paleta exacta ni su copy — y se adapta a los tokens de la sección 3.

## 3. Tokens propuestos para shadcn/ui

Formato de variables shadcn (HSL, compatible con `hsl(var(--x))` en `tailwind.config`). Acento primario: azul técnico de alto contraste (inspirado en Elastic/DigitalOcean); radios generosos para sensación amigable.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;

  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --primary: 217 91% 40%; /* azul de acento — botones primarios, paso activo */
  --primary-foreground: 0 0% 100%;

  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;

  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 40%;

  --accent: 45 93% 47%; /* amarillo DuckDB — resaltados puntuales, "nuevo"/"sugerido" */
  --accent-foreground: 222 47% 11%;

  --destructive: 0 72% 42%;
  --destructive-foreground: 0 0% 100%;

  --border: 214 32% 88%;
  --input: 214 32% 88%;
  --ring: 217 91% 40%;

  --radius: 0.75rem;

  /* Paleta categórica para gráficas (8 colores, distinguibles en daltonismo, contraste sobre blanco) */
  --chart-1: 217 91% 40%; /* azul */
  --chart-2: 25 95% 45%; /* naranja */
  --chart-3: 145 63% 32%; /* verde */
  --chart-4: 271 60% 45%; /* morado */
  --chart-5: 350 75% 45%; /* rojo-magenta */
  --chart-6: 199 89% 38%; /* cian oscuro */
  --chart-7: 40 90% 35%; /* mostaza oscuro */
  --chart-8: 210 10% 40%; /* gris azulado (neutro, para "otros") */
}

.dark {
  --background: 222 47% 8%;
  --foreground: 210 40% 96%;

  --card: 222 40% 11%;
  --card-foreground: 210 40% 96%;

  --popover: 222 40% 11%;
  --popover-foreground: 210 40% 96%;

  --primary: 217 91% 62%;
  --primary-foreground: 222 47% 8%;

  --secondary: 222 30% 16%;
  --secondary-foreground: 210 40% 96%;

  --muted: 222 30% 16%;
  --muted-foreground: 215 16% 65%;

  --accent: 45 93% 58%;
  --accent-foreground: 222 47% 8%;

  --destructive: 0 70% 55%;
  --destructive-foreground: 0 0% 100%;

  --border: 222 25% 22%;
  --input: 222 25% 22%;
  --ring: 217 91% 62%;

  --chart-1: 217 91% 65%;
  --chart-2: 25 95% 60%;
  --chart-3: 145 55% 50%;
  --chart-4: 271 65% 68%;
  --chart-5: 350 80% 65%;
  --chart-6: 199 85% 55%;
  --chart-7: 40 85% 55%;
  --chart-8: 210 12% 65%;
}
```

Verificación de contraste: `--primary` (azul 217 91% 40%) sobre blanco = ratio ~5.2:1 (AA para texto normal y componentes). `--foreground` sobre `--background` en ambos modos supera 12:1. Los 8 colores categóricos combinan tonos claramente separados en matiz (azul, naranja, verde, morado, rojo, cian, mostaza, gris) siguiendo el criterio "safe para daltonismo" (evitar pares rojo-verde puros de igual luminosidad; aquí el rojo es más magenta y el verde más oscuro/desaturado, separables por luminosidad además de matiz).

**Paleta secuencial (5 pasos) para heatmap de tabla de contingencia**, sobre el azul de marca (de más claro = menor frecuencia a más oscuro = mayor frecuencia):

```css
--heat-1: 217 60% 95%; /* frecuencia muy baja */
--heat-2: 217 70% 85%;
--heat-3: 217 80% 68%;
--heat-4: 217 85% 52%;
--heat-5: 217 90% 34%; /* frecuencia muy alta */
```

Usar texto oscuro (`--foreground`) sobre heat-1..heat-3 y texto blanco sobre heat-4..heat-5.

## 4. Tipografía

- **Familia UI y datos**: `Inter` (Google Fonts vía `next/font/google`) — grotesk neutro, excelente legibilidad en tamaños pequeños y números tabulares (`font-variant-numeric: tabular-nums` en todas las tablas y métricas).
- **Familia para títulos de paso / hero** (opcional, mismo peso visual que Inter para no fragmentar): mantener Inter también en títulos, variando solo peso y tamaño, para simplicidad de carga y consistencia — evitar mezclar dos familias con un usuario no técnico.
- **Escala de tamaños** (Tailwind, base 16px):
  - `text-3xl` (30px) / peso 700 — título de pantalla (ej. "Resultados de tu análisis")
  - `text-xl` (20px) / peso 600 — título de paso del wizard / título de tarjeta de sección
  - `text-base` (16px) / peso 400 — cuerpo, opciones de checkbox/select, texto de tabla
  - `text-sm` (14px) / peso 400 — ayudas, notas al pie, metadatos
  - `text-4xl`–`text-5xl` (36–48px) / peso 700, tabular-nums — valor numérico de una tarjeta de métrica
  - `text-xs` (12px) / peso 500, uppercase, tracking amplio — etiquetas de métrica ("MEDIA", "DESVIACIÓN ESTÁNDAR")
- Pesos usados: 400 (regular), 500 (medium, para etiquetas y botones secundarios), 600 (semibold, subtítulos), 700 (bold, títulos y cifras destacadas). Nunca menos de 400 ni cursiva para datos.

## 5. Layout de pantallas principales

### (a) Shell general (header + stepper)

```
┌──────────────────────────────────────────────────────────┐
│ [Logo StatLab]                    [Toggle claro/oscuro]  │  <- header, h-16, border-b
├──────────────────────────────────────────────────────────┤
│   ①──────②──────③──────④──────⑤                          │  <- Stepper custom
│  Datos  Variables Gráficas Cálculos Resultados            │
│  (Progress bar bajo los números, paso activo en --primary)│
├──────────────────────────────────────────────────────────┤
│                                                            │
│           <contenido del paso, max-w-3xl centrado>        │
│                                                            │
├──────────────────────────────────────────────────────────┤
│  [Atrás]                                    [Continuar →] │  <- footer de navegación fijo
└──────────────────────────────────────────────────────────┘
```

Componentes shadcn: `NavigationMenu`/header simple con `Button` (ghost) para el toggle de tema; Stepper **custom** (no existe en shadcn) construido con `div` + `Progress` + badges numerados usando `Badge`; footer con dos `Button` (variant `outline` y `default`).

### (b) Paso 1 — Ingreso de datos

```
 "¿Qué datos vamos a analizar?"
 Sube un archivo o pega tus datos. Nosotros nos encargamos del resto.

 ┌───────────────────────────────┐   ┌────────────────────────────┐
 │  ⬆  Arrastra tu archivo aquí   │   │  O pega tus datos aquí:    │
 │     .csv .xlsx .txt            │   │  ┌───────────────────────┐ │
 │     [Seleccionar archivo]      │   │  │ (Textarea grande)     │ │
 └───────────────────────────────┘   │  └───────────────────────┘ │
                                      └────────────────────────────┘

 [Switch] Mi primera fila tiene los encabezados

 Vista previa:
 ┌──────┬──────┬──────┬──────┐
 │ Edad │ Sexo │ Nota │ ...  │  <- Table (sticky header)
 ├──────┼──────┼──────┼──────┤
 │  23  │  M   │  8.5 │      │
 │  ...  mostrando 5 de 120 filas                             │
 └──────┴──────┴──────┴──────┘
```

Componentes shadcn: `Card` (contenedor dropzone), `Button`, `Textarea`, `Switch`, `Table` con scroll horizontal, `Badge` ("120 filas · 6 columnas"), `Alert` para errores de importación.

### (c) Paso 2 — Tipo de variables

```
 "¿Qué tipo de dato tiene cada columna?"
 Ya adivinamos algunas; solo confirma o corrige.

 ┌────────────┬───────────────────────┬─────────────┬───────┐
 │ Columna    │ Tipo                  │ Sugerido    │       │
 ├────────────┼───────────────────────┼─────────────┼───────┤
 │ Edad       │ [Select: Cuantitativa │ Cuantitativa│ ⓘ     │
 │            │  continua ▾]          │  (detectado)│       │
 │ Sexo       │ [Select: Cualitativa  │ Cualitativa │ ⓘ     │
 │            │  nominal ▾]           │  nominal    │       │
 └────────────┴───────────────────────┴─────────────┴───────┘
```

Componentes shadcn: `Table`, `Select` por fila, `Badge` (para "sugerido"), `Tooltip` (ⓘ explica la diferencia entre cualitativa/cuantitativa, discreta/continua, nominal/ordinal en lenguaje llano).

### (d) Paso 3 y 4 — Gráficas y cálculos (selección)

```
 "¿Qué gráficas necesitas?"
 Marca las que quieras ver en tus resultados.

 ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
 │ ☐ Gráfica de  │ │ ☐ Gráfica de  │ │ ☐ Polígono de │
 │   pastel      │ │   barras      │ │   frecuencias │
 │   [icono]     │ │   [icono]     │ │   [icono]     │
 │   Compara     │ │   Compara     │ │   Muestra la  │
 │   partes de   │ │   categorías  │ │   forma de la │
 │   un todo     │ │   entre sí    │ │   distribución│
 └───────────────┘ └───────────────┘ └───────────────┘
 ┌───────────────┐
 │ ☐ Ojiva       │
 │   [icono]     │
 │   Muestra     │
 │   acumulados  │
 └───────────────┘
```

Igual esquema para "¿Cuáles cálculos necesitas?": tarjetas agrupadas por `Tabs` (Medidas de tendencia central / Medidas de dispersión / Medidas de posición / Tablas de frecuencia), cada `Card` con `Checkbox` + título + descripción corta.

Componentes shadcn: `Tabs`, `Card`, `Checkbox`, `Label`, `Tooltip` para aclarar cuándo una gráfica no aplica al tipo de variable elegido (deshabilitar checkbox con `disabled` + texto "No disponible para variables cualitativas").

### (e) Pantalla de resultados

```
 Resultados de tu análisis                          [Exportar ▾]
 ────────────────────────────────────────────────────────────
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐
 │ MEDIA       │ │ MEDIANA     │ │ DESV. EST.  │ │ VARIANZA  │
 │ 8.34    ⓘ   │ │ 8.00    ⓘ   │ │ 1.12    ⓘ   │ │ 1.25   ⓘ  │
 │ tarjeta con │ │             │ │             │ │           │
 │ borde sutil │ │             │ │             │ │           │
 └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘

 [Tabs: Tabla de frecuencias | Gráficas | Datos originales]

 ┌─────────────────────────────┐   ┌───────────────────────────┐
 │  Tabla de frecuencias        │   │   Gráfica de barras       │
 │  (Table con encabezado fijo) │   │   (Recharts, leyenda,     │
 │                               │   │    etiquetas de valor/%) │
 └─────────────────────────────┘   └───────────────────────────┘

 [Botón: Descargar CSV] [XLSX] [PDF] [Imagen de gráficas]
```

Componentes shadcn: `Card` para cada métrica (con `Tooltip` o `Popover` "¿Qué significa esto?" y "¿Para qué sirve?"), `Tabs`, `Table`, `DropdownMenu` para exportación, `Dialog`/`Sheet` para ver una gráfica en grande, `Progress` mientras se calcula, `Skeleton` para estados de carga.

## 6. Reglas de gráficas

- **Mapa variable→color fijo**: cada categoría de una variable recibe un color de `--chart-1` a `--chart-8` asignado por orden de aparición y se mantiene igual en pastel, barras, polígono y ojiva dentro de la misma sesión de resultados (usar un `Map<categoria, colorToken>` generado una vez al calcular).
- Cada segmento/barra/punto muestra **valor absoluto y porcentaje** (ej. "23 (18.4%)") directamente como etiqueta o en tooltip al pasar el cursor; nunca solo color sin número.
- Leyenda siempre visible fuera del área de dibujo (no flotante sobre los datos), con el mismo orden que la tabla de frecuencias.
- Tamaño mínimo de gráfica: 320×280px en móvil, 480×360px en escritorio; texto de ejes y etiquetas nunca menor a 12px.
- Aplicación por tipo de variable:
  - **Cualitativa nominal/ordinal**: gráfica de pastel, gráfica de barras.
  - **Cuantitativa discreta**: gráfica de barras, polígono de frecuencias.
  - **Cuantitativa continua (agrupada en clases)**: histograma (barras contiguas), polígono de frecuencias, ojiva (frecuencia acumulada).
  - Deshabilitar en la UI (no ocultar) las combinaciones no aplicables, con tooltip explicando por qué.

## 7. Microcopy en español (lenguaje llano)

**Títulos y subtítulos de pasos**

- Paso 1: "¿Qué datos vamos a analizar?" / "Sube un archivo o pega tus datos: nosotros nos encargamos del resto."
- Paso 2: "¿Qué tipo de dato tiene cada columna?" / "Ya adivinamos algunas; solo confirma o corrige lo que haga falta."
- Paso 3: "¿Qué gráficas necesitas?" / "Elige una o varias; puedes cambiarlas después."
- Paso 4: "¿Qué cálculos necesitas?" / "Marca las medidas que quieres ver en tus resultados."
- Resultados: "Aquí están tus resultados" / "Revisa las tarjetas, tablas y gráficas. Puedes exportarlas cuando quieras."

**Estados vacíos**

- Antes de subir datos: "Todavía no hay datos cargados. Sube un archivo o pega tus valores para comenzar."
- Sin gráficas seleccionadas: "No elegiste ninguna gráfica. Puedes volver al paso anterior y seleccionar al menos una."
- Sin cálculos seleccionados: "No elegiste ningún cálculo. Selecciona al menos uno para ver resultados."

**Errores de importación**

- Archivo con formato no soportado: "Este archivo no lo pudimos leer. Usa un archivo .csv, .xlsx o .txt separado por comas."
- Columna vacía o inconsistente: "La columna \"{nombre}\" tiene datos que no coinciden con el tipo elegido. Revisa la fila {n}."
- Archivo vacío: "El archivo no tiene datos para analizar. Verifica que tenga al menos una fila además del encabezado."
- Demasiadas columnas/filas: "Tu archivo es muy grande para procesarlo aquí. Prueba con un archivo de hasta {límite} filas."

**Tooltips de ayuda (ejemplos)**

- Media: "Es el promedio de todos los valores. Útil para tener una idea general del centro de los datos."
- Mediana: "Es el valor que queda justo en la mitad cuando ordenas todos los datos. Es más resistente a valores extremos que la media."
- Desviación estándar: "Indica qué tan dispersos están los datos respecto al promedio. Un número alto significa datos más variados."
- Variable cualitativa: "Describe una categoría o cualidad, no una cantidad (por ejemplo: sexo, color favorito)."
- Variable cuantitativa: "Describe una cantidad medible (por ejemplo: edad, estatura, nota)."
- Ojiva: "Muestra cuántos datos se acumulan hasta cierto punto. Útil para saber, por ejemplo, cuántos alumnos sacaron menos de cierta nota."
- Botón "Primera fila es encabezado": "Actívalo si la primera fila de tu archivo tiene los nombres de las columnas, no datos."

---

Documento generado como insumo de diseño para la implementación de la UI con shadcn/ui. No modifica el repositorio del proyecto.
