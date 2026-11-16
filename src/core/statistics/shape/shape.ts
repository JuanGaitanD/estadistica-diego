import { makeMetric, unavailableMetric } from "../metric";
import { checkSample, quantile, REASONS } from "../numeric";
import { neumaierSum } from "../numeric/sum";
import { welford } from "../numeric/welford";
import type { Metric } from "../types";
import { TUKEY_FACTOR } from "../variability/variability";

/** Motivos propios de las medidas de forma. */
export const SHAPE_REASONS = {
  minimoTres: "Se necesitan al menos 3 datos",
  minimoCuatro: "Se necesitan al menos 4 datos",
  sinVariacion: "Todos los datos son iguales: no hay forma que medir",
} as const;

/** Media y desviación estándar muestral; `null` si no hay variación. */
function meanAndSd(values: readonly number[]): { mean: number; sd: number } | null {
  const stats = welford(values);
  if (stats === null || values.length < 2) return null;
  const sd = Math.sqrt(stats.m2 / (values.length - 1));
  return sd > 0 ? { mean: stats.mean, sd } : null;
}

/**
 * Coeficiente de asimetría de Fisher ajustado a la muestra: el mismo número
 * que `COEFICIENTE.ASIMETRIA` de Excel y `skewness(type = 2)` de R.
 *
 * Fórmula: `g = n / ((n − 1)(n − 2)) · Σ((xi − x̄)/s)³`, con `s` muestral.
 */
export function skewness(values: readonly number[]): Metric {
  const label = "Asimetría";
  const check = checkSample(values, 3);
  if (!check.ok) {
    return unavailableMetric(
      "asimetria",
      label,
      check.reason === REASONS.minimoDos ? SHAPE_REASONS.minimoTres : check.reason,
    );
  }
  const base = meanAndSd(values);
  if (base === null) return unavailableMetric("asimetria", label, SHAPE_REASONS.sinVariacion);
  const n = values.length;
  const cubes = neumaierSum(values.map((x) => ((x - base.mean) / base.sd) ** 3));
  return makeMetric("asimetria", label, (n / ((n - 1) * (n - 2))) * cubes);
}

/**
 * Curtosis en exceso ajustada a la muestra: el mismo número que `CURTOSIS` de
 * Excel y `kurtosis(type = 2)` de R. 0 es la de una normal.
 *
 * Fórmula: `n(n+1)/((n−1)(n−2)(n−3)) · Σ((xi − x̄)/s)⁴ − 3(n−1)²/((n−2)(n−3))`.
 */
export function kurtosis(values: readonly number[]): Metric {
  const label = "Curtosis";
  const check = checkSample(values, 4);
  if (!check.ok) {
    return unavailableMetric(
      "curtosis",
      label,
      check.reason === REASONS.minimoDos ? SHAPE_REASONS.minimoCuatro : check.reason,
    );
  }
  const base = meanAndSd(values);
  if (base === null) return unavailableMetric("curtosis", label, SHAPE_REASONS.sinVariacion);
  const n = values.length;
  const fourth = neumaierSum(values.map((x) => ((x - base.mean) / base.sd) ** 4));
  const value =
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * fourth -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return makeMetric("curtosis", label, value);
}

/**
 * Puntaje z de cada dato, en el mismo orden de entrada: `z = (x − x̄) / s`
 * (`NORMALIZACION` de Excel). `null` si hay menos de 2 datos o no hay variación.
 */
export function zScores(values: readonly number[]): number[] | null {
  if (!checkSample(values, 2).ok) return null;
  const base = meanAndSd(values);
  if (base === null) return null;
  return values.map((x) => (x - base.mean) / base.sd);
}

/**
 * Percentil de un valor (búsqueda inversa): la proporción 0..1 que el método
 * R-7 asigna a `x`, de modo que `quantile(sorted, p) = x`. Es
 * `RANGO.PERCENTIL.INC` de Excel. `null` si `x` cae fuera de los datos.
 *
 * @param sorted - Muestra ordenada ascendentemente.
 * @param x - Valor a ubicar.
 */
export function percentileOfValue(sorted: readonly number[], x: number): number | null {
  const n = sorted.length;
  if (n < 2 || !checkSample(sorted, 2).ok || !Number.isFinite(x)) return null;
  const min = sorted[0] ?? 0;
  const max = sorted[n - 1] ?? 0;
  if (x < min || x > max || min === max) return null;
  let below = 0;
  while (below < n && (sorted[below] ?? 0) < x) below += 1;
  if (sorted[below] === x) return below / (n - 1);
  const lower = sorted[below - 1] ?? min;
  const upper = sorted[below] ?? max;
  return (below - 1 + (x - lower) / (upper - lower)) / (n - 1);
}

/** Los cinco números del diagrama de caja y bigotes, con los atípicos aparte. */
export interface BoxPlotSummary {
  readonly min: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  readonly max: number;
  /** Extremo del bigote: el dato más bajo que no es atípico. */
  readonly lowerWhisker: number;
  /** Extremo del bigote: el dato más alto que no es atípico. */
  readonly upperWhisker: number;
  readonly outliers: readonly number[];
}

/**
 * Resumen para el diagrama de caja (Tukey): cuartiles R-7 y bigotes hasta el
 * último dato dentro de Q1 − 1,5·RIC y Q3 + 1,5·RIC; lo que queda fuera son
 * los atípicos, igual que en `detectOutliers`.
 *
 * @param sorted - Muestra ordenada ascendentemente.
 */
export function boxPlotSummary(sorted: readonly number[]): BoxPlotSummary | null {
  const n = sorted.length;
  if (n === 0 || !checkSample(sorted, 1).ok) return null;
  const q1 = quantile(sorted, 0.25) ?? 0;
  const median = quantile(sorted, 0.5) ?? 0;
  const q3 = quantile(sorted, 0.75) ?? 0;
  const iqr = q3 - q1;
  const low = q1 - TUKEY_FACTOR * iqr;
  const high = q3 + TUKEY_FACTOR * iqr;
  const inside = sorted.filter((x) => x >= low && x <= high);
  return {
    min: sorted[0] ?? 0,
    q1,
    median,
    q3,
    max: sorted[n - 1] ?? 0,
    lowerWhisker: inside[0] ?? q1,
    upperWhisker: inside[inside.length - 1] ?? q3,
    outliers: sorted.filter((x) => x < low || x > high),
  };
}
