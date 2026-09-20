import { makeMetric, unavailableMetric } from "../metric";
import { checkSample, quantile, sortAscending, welford, REASONS } from "../numeric";
import type { Metric, QuantileMethod, VariabilityOptions, VariabilityResult } from "../types";
import { interquartileRange } from "../position/position";

/** Umbral por debajo del cual la media se considera nula para el CV (ADR-003 §5.4). */
export const CV_MEAN_EPSILON = 1e-12;

/** Factor de los límites de Tukey. */
export const TUKEY_FACTOR = 1.5;

/** Opciones de variabilidad por defecto (RF-24). */
export const DEFAULT_VARIABILITY_OPTIONS: VariabilityOptions = {
  range: true,
  sampleVariance: true,
  populationVariance: false,
  standardDeviation: true,
  coefficientOfVariation: true,
  iqr: true,
  outliers: true,
};

/**
 * Rango.
 *
 * Fórmula: `R = máximo − mínimo`.
 *
 * @param values - Valores finitos de la variable.
 */
export function range(values: readonly number[]): Metric {
  const check = checkSample(values, 1);
  if (!check.ok) return unavailableMetric("rango", "Rango", check.reason);
  const sorted = sortAscending(values);
  const minimum = sorted[0] ?? 0;
  const maximum = sorted[sorted.length - 1] ?? 0;
  return makeMetric("rango", "Rango", maximum - minimum);
}

/**
 * Varianza muestral, con el algoritmo de Welford.
 *
 * Fórmula: `s² = suma de (xi − x̄)² / (n − 1)`; requiere n ≥ 2.
 *
 * @param values - Valores finitos de la variable.
 */
export function sampleVariance(values: readonly number[]): Metric {
  const label = "Varianza muestral";
  const check = checkSample(values, 2);
  if (!check.ok) return unavailableMetric("varianza-muestral", label, check.reason);
  const accumulator = welford(values);
  if (accumulator === null) {
    return unavailableMetric("varianza-muestral", label, REASONS.sinDatos);
  }
  return makeMetric("varianza-muestral", label, accumulator.m2 / (accumulator.n - 1));
}

/**
 * Varianza poblacional, con el algoritmo de Welford.
 *
 * Fórmula: `σ² = suma de (xi − x̄)² / n`.
 *
 * @param values - Valores finitos de la variable.
 */
export function populationVariance(values: readonly number[]): Metric {
  const label = "Varianza poblacional";
  const check = checkSample(values, 1);
  if (!check.ok) return unavailableMetric("varianza-poblacional", label, check.reason);
  const accumulator = welford(values);
  if (accumulator === null) {
    return unavailableMetric("varianza-poblacional", label, REASONS.sinDatos);
  }
  return makeMetric("varianza-poblacional", label, accumulator.m2 / accumulator.n);
}

/**
 * Desviación estándar.
 *
 * Fórmula: `s = raíz(s²)` (muestral) o `σ = raíz(σ²)` (poblacional).
 *
 * @param values - Valores finitos de la variable.
 * @param kind - `"muestral"` (por defecto) o `"poblacional"`.
 */
export function standardDeviation(
  values: readonly number[],
  kind: "muestral" | "poblacional" = "muestral",
): Metric {
  const sample = kind === "muestral";
  const key = sample ? "desviacion-estandar" : "desviacion-estandar-poblacional";
  const label = sample ? "Desviación estándar" : "Desviación estándar poblacional";
  const variance = sample ? sampleVariance(values) : populationVariance(values);
  if (variance.value === null) {
    return unavailableMetric(key, label, variance.unavailableReason ?? REASONS.sinDatos);
  }
  return makeMetric(key, label, Math.sqrt(variance.value));
}

/**
 * Coeficiente de variación, en porcentaje.
 *
 * Fórmula: `CV = 100 · s / |x̄|`, con la desviación muestral. No es
 * interpretable (y se devuelve `null`) si la media es cero o casi cero, o si la
 * variable tiene valores de ambos signos.
 *
 * @param values - Valores finitos de la variable.
 */
export function coefficientOfVariation(values: readonly number[]): Metric {
  const key = "coeficiente-de-variacion";
  const label = "Coeficiente de variación";
  const deviation = standardDeviation(values, "muestral");
  if (deviation.value === null) {
    return unavailableMetric(key, label, deviation.unavailableReason ?? REASONS.sinDatos);
  }
  const hasPositive = values.some((value) => value > 0);
  const hasNegative = values.some((value) => value < 0);
  if (hasPositive && hasNegative) {
    return unavailableMetric(key, label, REASONS.signosMixtos);
  }
  const accumulator = welford(values);
  if (accumulator === null || Math.abs(accumulator.mean) < CV_MEAN_EPSILON) {
    return unavailableMetric(key, label, REASONS.mediaCero);
  }
  return makeMetric(key, label, (100 * deviation.value) / Math.abs(accumulator.mean));
}

/** Límites de Tukey y los valores que quedan fuera. */
export interface OutlierReport {
  readonly fences: { readonly lower: number; readonly upper: number } | null;
  readonly outliers: readonly number[];
  readonly lowerFence: Metric;
  readonly upperFence: Metric;
}

/**
 * Límites de Tukey y valores atípicos.
 *
 * Fórmula: `límite inferior = Q1 − 1,5·RIC`, `límite superior = Q3 + 1,5·RIC`;
 * son atípicos los valores fuera de ese intervalo.
 *
 * @param values - Valores finitos de la variable.
 * @param method - Método de cuantiles usado para Q1 y Q3.
 */
export function detectOutliers(
  values: readonly number[],
  method: QuantileMethod = "inclusivo",
): OutlierReport {
  const check = checkSample(values, 1);
  const unavailable = (reason: string): OutlierReport => ({
    fences: null,
    outliers: [],
    lowerFence: unavailableMetric("limite-inferior-tukey", "Límite inferior de Tukey", reason),
    upperFence: unavailableMetric("limite-superior-tukey", "Límite superior de Tukey", reason),
  });
  if (!check.ok) return unavailable(check.reason);
  const sorted = sortAscending(values);
  const q1 = quantile(sorted, 0.25, method);
  const q3 = quantile(sorted, 0.75, method);
  if (q1 === null || q3 === null) return unavailable(REASONS.fueraDeRango);
  const iqr = q3 - q1;
  const lower = q1 - TUKEY_FACTOR * iqr;
  const upper = q3 + TUKEY_FACTOR * iqr;
  return {
    fences: { lower, upper },
    outliers: sorted.filter((value) => value < lower || value > upper),
    lowerFence: makeMetric("limite-inferior-tukey", "Límite inferior de Tukey", lower),
    upperFence: makeMetric("limite-superior-tukey", "Límite superior de Tukey", upper),
  };
}

/** Parámetros del bloque de variabilidad. */
export interface VariabilityParams {
  readonly variableId: string;
  readonly values: readonly number[];
  readonly options?: VariabilityOptions;
  readonly quantileMethod?: QuantileMethod;
}

/**
 * Calcula la tabla de variabilidad: rango, varianzas, desviación estándar,
 * coeficiente de variación, RIC y atípicos (RF-24).
 *
 * @param params - Variable, valores y opciones.
 */
export function computeVariability(params: VariabilityParams): VariabilityResult {
  const options = params.options ?? DEFAULT_VARIABILITY_OPTIONS;
  const method = params.quantileMethod ?? "inclusivo";
  const metrics: Metric[] = [];
  if (options.range) metrics.push(range(params.values));
  if (options.sampleVariance) metrics.push(sampleVariance(params.values));
  if (options.populationVariance) metrics.push(populationVariance(params.values));
  if (options.standardDeviation) {
    metrics.push(standardDeviation(params.values, "muestral"));
    if (options.populationVariance) {
      metrics.push(standardDeviation(params.values, "poblacional"));
    }
  }
  if (options.coefficientOfVariation) metrics.push(coefficientOfVariation(params.values));
  if (options.iqr) metrics.push(interquartileRange(params.values, method));

  if (!options.outliers) {
    return { variableId: params.variableId, metrics, outliers: [], fences: null };
  }
  const report = detectOutliers(params.values, method);
  metrics.push(report.lowerFence, report.upperFence);
  return {
    variableId: params.variableId,
    metrics,
    outliers: report.outliers,
    fences: report.fences,
  };
}
