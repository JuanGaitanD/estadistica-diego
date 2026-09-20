import { makeKeyedMetric } from "../metric";
import { checkSample, quantile, sortAscending, REASONS } from "../numeric";
import type { Metric, PositionOptions, PositionResult, QuantileMethod } from "../types";

/** Opciones de posición por defecto: cuartiles por el método inclusivo (R-7). */
export const DEFAULT_POSITION_OPTIONS: PositionOptions = {
  quartiles: true,
  quartileMethod: "inclusivo",
  includeQ2: true,
  deciles: false,
  percentiles: [],
};

function quantileMetric(
  key: string,
  explanationKey: "cuartiles" | "deciles" | "percentiles",
  label: string,
  sorted: readonly number[],
  p: number,
  method: QuantileMethod,
): Metric {
  const check = checkSample(sorted, 1);
  if (!check.ok) return makeKeyedMetric(key, explanationKey, label, null, check.reason);
  const value = quantile(sorted, p, method);
  return makeKeyedMetric(key, explanationKey, label, value, REASONS.fueraDeRango);
}

/**
 * Cuartiles Q1, Q2 y Q3 sobre los datos crudos.
 *
 * Fórmula: `Qk = Q(k/4)` con la función `quantile` (R-7 inclusivo por defecto,
 * R-6 exclusivo como alternativa).
 *
 * @param values - Valores finitos de la variable.
 * @param method - Método de cuantiles.
 * @param includeQ2 - Si se incluye Q2 (= mediana) en la tabla.
 */
export function computeQuartiles(
  values: readonly number[],
  method: QuantileMethod = "inclusivo",
  includeQ2 = true,
): Metric[] {
  const sorted = sortAscending(values);
  const metrics = [quantileMetric("Q1", "cuartiles", "Cuartil 1", sorted, 0.25, method)];
  if (includeQ2) {
    metrics.push(quantileMetric("Q2", "cuartiles", "Cuartil 2 (mediana)", sorted, 0.5, method));
  }
  metrics.push(quantileMetric("Q3", "cuartiles", "Cuartil 3", sorted, 0.75, method));
  return metrics;
}

/**
 * Deciles D1..D9.
 *
 * Fórmula: `Dk = Q(k/10)`.
 *
 * @param values - Valores finitos de la variable.
 * @param method - Método de cuantiles.
 */
export function computeDeciles(
  values: readonly number[],
  method: QuantileMethod = "inclusivo",
): Metric[] {
  const sorted = sortAscending(values);
  const metrics: Metric[] = [];
  for (let k = 1; k <= 9; k += 1) {
    metrics.push(quantileMetric(`D${k}`, "deciles", `Decil ${k}`, sorted, k / 10, method));
  }
  return metrics;
}

/**
 * Percentiles pedidos, o la serie completa P1..P99.
 *
 * Fórmula: `Pk = Q(k/100)`.
 *
 * @param values - Valores finitos de la variable.
 * @param requested - Lista de k en [0, 100], o `"todos"` para P1..P99.
 * @param method - Método de cuantiles.
 */
export function computePercentiles(
  values: readonly number[],
  requested: readonly number[] | "todos",
  method: QuantileMethod = "inclusivo",
): Metric[] {
  const sorted = sortAscending(values);
  const list =
    requested === "todos" ? Array.from({ length: 99 }, (unused, index) => index + 1) : requested;
  return list.map((k) =>
    quantileMetric(`P${k}`, "percentiles", `Percentil ${k}`, sorted, k / 100, method),
  );
}

/**
 * Rango intercuartílico.
 *
 * Fórmula: `RIC = Q3 − Q1`, con el método de cuantiles elegido.
 *
 * @param values - Valores finitos de la variable.
 * @param method - Método de cuantiles.
 */
export function interquartileRange(
  values: readonly number[],
  method: QuantileMethod = "inclusivo",
): Metric {
  const label = "Rango intercuartílico (RIC)";
  const check = checkSample(values, 1);
  if (!check.ok) return makeKeyedMetric("ric", "ric", label, null, check.reason);
  const sorted = sortAscending(values);
  const q1 = quantile(sorted, 0.25, method);
  const q3 = quantile(sorted, 0.75, method);
  const value = q1 === null || q3 === null ? null : q3 - q1;
  return makeKeyedMetric("ric", "ric", label, value, REASONS.fueraDeRango);
}

/** Parámetros del bloque de posición. */
export interface PositionParams {
  readonly variableId: string;
  readonly values: readonly number[];
  readonly options?: PositionOptions;
}

/**
 * Calcula la tabla de posición: cuartiles, deciles y percentiles (RF-23),
 * todos construidos sobre la misma función `quantile`.
 *
 * @param params - Variable, valores y opciones.
 */
export function computePosition(params: PositionParams): PositionResult {
  const options = params.options ?? DEFAULT_POSITION_OPTIONS;
  const method = options.quartileMethod;
  return {
    variableId: params.variableId,
    method,
    quartiles: options.quartiles ? computeQuartiles(params.values, method, options.includeQ2) : [],
    deciles: options.deciles ? computeDeciles(params.values, method) : [],
    percentiles:
      options.percentiles === "todos" || options.percentiles.length > 0
        ? computePercentiles(params.values, options.percentiles, method)
        : [],
  };
}
