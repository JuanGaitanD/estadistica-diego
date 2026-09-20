# features/analysis

Ejecución y visualización de los análisis estadísticos. Depende de `src/core`,
`src/components` y zod; nunca de `src/app`.

- `model/` — contrato `AnalysisRequest` / `AnalysisResult` (docs/02-arquitectura.md §7)
  adaptado a los tipos reales del núcleo, y su validación con zod en español.
- `use-cases/`
  - `applicability.ts` — `getApplicability(kind, isGrouped)`: la matriz de
    docs/01-requisitos.md §2.1 con el motivo de cada bloqueo, para que el wizard
    deshabilite opciones sin ocultarlas.
  - `run-analysis.ts` — `runAnalysis(dataset, request)`: función pura que nunca
    lanza; lo que no aplica vuelve como "no disponible" con su motivo.
  - `sections.ts` — ids estables de las secciones (`section-<variableId>-frecuencias`,
    `section-contingencia-<a>-<b>`) y `RESULT_SECTIONS(result)` para la exportación.
- `components/` — vistas sin estado global: `AnalysisSummary`, `VariableResults`,
  `ContingencyTable`, `MetricExplanation`. Reutilizan `components/shared` y
  `components/tables/data-table`.

Convención: el formateo de números ocurre solo aquí, con `formatNumber` /
`formatPercent` (prop `decimals`, por defecto 2). El dominio devuelve números sin
redondear.
