# StatLab

**Estadística que se entiende: de lo básico a la regresión.** Plataforma web de estadística, **solo cliente** (sin backend) y en español, para personas sin formación en estadística: se cargan o escriben los datos, se elige una pregunta en palabras simples y StatLab responde con la **interpretación primero**; el paso a paso, con las fórmulas y su equivalente en Excel, queda plegado tras «Ver cómo se calculó» (`docs/03-adr/ADR-004-interpretacion-primero.md`).

La portada está en `/` y la aplicación en `/app`. Todo el cálculo ocurre en el navegador: no hay servidor, no hay base de datos y no se envía ningún dato a ningún servicio externo.

## Privacidad

**Todos los datos que se ingresan o importan se procesan en el navegador del usuario y nunca salen del dispositivo.** No hay backend que los reciba, no se suben archivos a ningún servidor y no se llama a ninguna API externa con la información cargada. Lo único que persiste, en el `localStorage` del propio navegador, son los últimos datos analizados (para «Recuperar último análisis») y el informe en curso. Para llevarlos a otro equipo se guarda un archivo de proyecto `.statlab.json`.

## Para quién es

- Personas que tienen datos y una pregunta, pero no un título en estadística.
- Estudiantes que quieren entender qué significa cada resultado y comprobarlo a mano o en Excel.
- Docentes que necesitan tablas, gráficas e informes a partir de datos de clase.

## Características

- **Espacio de trabajo en cuatro zonas:** Datos (pegar, importar CSV o Excel, o escribir en una tabla; tipos de variable detectados y editables), Explorar, Analizar e Informe.
- **Explorar (estadística descriptiva):** frecuencias simples y por intervalos, promedio, mediana, moda, dispersión, cuartiles y percentiles, forma (asimetría y curtosis), puntaje z y «¿dónde queda un valor?», tablas cruzadas; gráficas circular, barras, histograma, caja, Pareto, polígono, ojiva y barras agrupadas.
- **Analizar, por preguntas en llano:**
  - Regresión lineal simple por los 5 pasos de la clase, correlación de Pearson y Spearman, predicción con intervalo y Excel con fórmulas vivas.
  - Regresión múltiple (R² ajustado, F, VIF, variables indicadoras), polinómica (elección de grado) y logística (razones de momios, matriz de confusión, McFadden).
  - Pruebas de hipótesis con guion de 5 pasos y tamaño del efecto: t de una muestra, Welch o Student, pareada, z de proporciones, ANOVA con Tukey y chi-cuadrado.
  - Intervalos de confianza, tamaño de muestra, normalidad con Q-Q y calculadora de probabilidades (normal, t, χ², F, binomial y Poisson).
- **Modo guiado CRISP-DM:** recorre las seis fases (problema, datos, preparación, modelado, evaluación y despliegue) con bitácora de preparación y lista de evaluación con semáforo, y lo deja en el informe.
- **Informe:** se añade cualquier resultado con su interpretación, sus pasos, tablas y gráficas; exporta a PDF, XLSX y texto. Los proyectos se guardan y abren como `.statlab.json`.
- **Validado contra R y Excel:** las pruebas de cálculo comparan con `lm`, `glm`, `t.test`, `aov`, `TukeyHSD`, `chisq.test` y las funciones de Excel equivalentes.

## Stack

- [Next.js](https://nextjs.org) 16.3.5 (App Router, `output: "export"`) + [React](https://react.dev) 19.2.8 + TypeScript estricto
- [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) (estilo `new-york`, base `neutral`)
- [Zustand](https://zustand-demo.pmnd.rs) 5 (estado) y [Zod](https://zod.dev) 4 (validación)
- [Recharts](https://recharts.org) 3.8 (gráficos)
- [xlsx (SheetJS)](https://sheetjs.com) y [PapaParse](https://www.papaparse.com) 5.7 (import/export de datos)
- [jsPDF](https://github.com/parallax/jsPDF) 4 + [html-to-image](https://github.com/bubkoo/html-to-image) 1.11 (export de reportes e imágenes)
- [Vitest](https://vitest.dev) 5 + Testing Library (tests)

## Requisitos

- Node.js **22** (ver `.nvmrc`)
- pnpm **11** (`packageManager` fijado en `package.json`)

## Comandos

```bash
pnpm dev              # servidor de desarrollo
pnpm build            # build de producción (export estático a out/)
pnpm start            # sirve el build (uso local, no aplica al export estático)
pnpm lint             # ESLint
pnpm lint:fix         # ESLint con --fix
pnpm format           # Prettier --write
pnpm format:check     # Prettier --check
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest (una pasada)
pnpm test:watch       # Vitest en modo watch
pnpm test:coverage    # Vitest con cobertura
pnpm check            # lint + format:check + typecheck + test
```

Antes de publicar un cambio, `pnpm check` y `pnpm build` deben terminar sin errores.

## Estructura de carpetas y regla de dependencias

```
src/
  core/            # lógica pura (estadística, modelos de datos). Sin UI ni framework.
    statistics/    # tablas de frecuencia, tendencia central, posición, variabilidad, contingencia
    data/          # Dataset/Column/Variable, parseo, inferencia de tipo, paleta
  infrastructure/  # adaptadores: import (CSV/Excel), export (PDF/Excel/imagen),
    import/        # storage (localStorage) e IA (interfaz para Fase 2 con Gemini).
    export/
    storage/
    ai/
  features/        # casos de uso de la app (wizard, análisis, export), UI de feature.
    wizard/        # store, esquemas y pasos del asistente (en curso)
    analysis/      # ejecución de análisis y presentación de resultados
    export/        # selección y armado de reportes exportables
  components/      # componentes de presentación reutilizables.
    ui/            # generado por shadcn/ui (exento de la regla de fronteras).
    charts/        # envoltorios Recharts + paleta determinista
    tables/        # tablas de datos y resultados
    layout/        # shell de la app, stepper, tema
    shared/        # tarjetas de métrica, ayudas, formateo de presentación
  app/             # rutas de Next.js (App Router).
  lib/             # utilidades transversales (p. ej. `cn`).
  test/            # setup de Vitest.
```

Regla de dependencias entre capas, forzada automáticamente por `eslint.config.mjs`:

```mermaid
flowchart LR
    app["src/app"] --> features["src/features"]
    features --> core["src/core"]
    features --> infrastructure["src/infrastructure"]
    features --> components["src/components"]
    app --> components
    infrastructure --> core
    components["src/components (fuera de ui/)"] --> core
```

- `src/core` no puede importar de `infrastructure`, `features`, `components`, `app`, `react` ni `next`. Es TypeScript puro.
- `src/infrastructure` solo puede importar de `src/core` y librerías externas.
- `src/features` puede importar de `core`, `infrastructure` y `components` (no de `app`).
- `src/components` (fuera de `ui/`) solo puede importar de `core`, `lib` y otros `components`.
- `src/app` solo puede importar de `features` y `components` (no directamente de `core` ni `infrastructure`).
- `src/components/ui` (generado por shadcn/ui) está exento de esta regla.

Un PR que rompa esta dirección de dependencias falla el lint en CI. Ver el detalle y la justificación de la regla en `docs/02-arquitectura.md`.

## Convenciones

- **Tests colocados junto al código:** `frequency-table.ts` + `frequency-table.test.ts` en la misma carpeta, nunca en un directorio `__tests__` aparte.
- **Alias `@/` obligatorio entre capas:** todo import que cruce carpetas de `src/` usa `@/core/...`, `@/features/...`, etc. Los imports relativos que crucen capas no son detectables por la regla de ESLint, así que la convención es la única defensa real.
- **Explicación obligatoria en cada métrica:** ninguna métrica, tabla o gráfica se muestra sin su microtexto "qué significa / para qué sirve" (ver `docs/01-requisitos.md` §5).
- **El redondeo ocurre solo en la capa de presentación** (`src/lib/format` y equivalentes en `components/shared`). `src/core` siempre devuelve el valor completo en `number`, sin redondear.
- **Precisión numérica:** suma compensada de Neumaier para medias y algoritmo de Welford para varianzas, para evitar cancelación catastrófica.

## Documentación

- [`docs/01-requisitos.md`](docs/01-requisitos.md) — requisitos funcionales y no funcionales, matriz de aplicabilidad por tipo de variable.
- [`docs/02-arquitectura.md`](docs/02-arquitectura.md) — arquitectura por capas, convenciones, contrato de tipos.
- [`docs/03-adr/`](docs/03-adr) — decisiones de arquitectura (ADRs), incluida la definición exacta de cada fórmula estadística.
- [`docs/04-plan-implementacion.md`](docs/04-plan-implementacion.md) — plan de implementación por paquetes de trabajo y su estado actual.
- [`docs/06-preguntas-para-el-profesor.md`](docs/06-preguntas-para-el-profesor.md) — preguntas abiertas para el profesor, en lenguaje llano, con las decisiones tomadas por defecto.
- [`docs/07-despliegue.md`](docs/07-despliegue.md) — pasos para desplegar en Vercel.

## Despliegue (Vercel)

- **Framework:** Next.js.
- **Build:** `pnpm build` (`next build` con `output: "export"`) → directorio de salida `out/`.
- **Cabeceras de seguridad** (Content-Security-Policy, X-Frame-Options, Referrer-Policy, etc.) definidas en `vercel.json`.
- **Dominio:** `estadistica.juandgaitan.com`, apuntado mediante un registro DNS **CNAME** hacia `cname.vercel-dns.com`.

Ver la guía paso a paso, con verificación de cabeceras y checklist previo a publicar, en [`docs/07-despliegue.md`](docs/07-despliegue.md).
