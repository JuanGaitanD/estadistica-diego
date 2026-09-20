# core/statistics

Lógica estadística pura: frecuencias, agrupación en intervalos, tendencia
central, posición, variabilidad y tablas de contingencia. Las fórmulas exactas
están fijadas en `docs/03-adr/ADR-003-formulas-estadisticas.md`; los tests son
la comprobación de ese documento (ver también `adr-crosscheck.test.ts`, que
contrasta los casos delicados contra cálculos hechos a mano).

La fase 1 **no** incluye inferencia, chi-cuadrado ni regresión.

Sin dependencias de React, Next ni del DOM: solo TypeScript y matemáticas. La
regla de fronteras de `eslint.config.mjs` lo fuerza. Cubierto por tests
unitarios con umbral de cobertura global (ver `vitest.config.ts`).

## Contratos que conviene conocer

- **Nunca se devuelve `NaN`.** Un cálculo imposible devuelve una `Metric` con
  `value: null` y un `unavailableReason` en español. `makeMetric` degrada solo
  cualquier resultado no finito.
- **`Metric.integer`** marca los conteos (n, frecuencias): la capa de
  presentación los muestra sin decimales. Ver `formatMetricValue` en
  `src/components/shared/format.ts`, que es el único sitio donde se decide.
- **`VariableKind` está declarado aquí y en `core/data`** de forma
  estructuralmente idéntica, porque este módulo no puede importar del modelo de
  datos. La equivalencia no queda al azar: `src/features/analysis/model/types.ts`
  la comprueba en tiempo de compilación con la constante
  `KINDS_ARE_COMPATIBLE`, que deja de compilar si los dos tipos divergen.
- **El orden de los datos no se asume**, pero `runVariableAnalysis` ordena una
  sola vez y reutiliza el array: `sortAscending` detecta la entrada ya ordenada
  y se salta el `sort` (ver la nota de rendimiento en `run-analysis.ts`).
