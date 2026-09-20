import { makeMetric, unavailableMetric } from "../metric";
import { checkSample, isFiniteNumber, neumaierSum, REASONS } from "../numeric";
import type { FrequencyRow, Metric } from "../types";

/**
 * Media aritmética.
 *
 * Fórmula: `x̄ = (1/n) · suma de xi`, calculada con suma compensada de Neumaier.
 *
 * @param values - Valores finitos de la variable.
 * @returns Métrica con la media, o `null` con su motivo si no hay datos válidos.
 */
export function arithmeticMean(values: readonly number[]): Metric {
  const check = checkSample(values, 1);
  if (!check.ok) return unavailableMetric("media-aritmetica", "Media aritmética", check.reason);
  return makeMetric("media-aritmetica", "Media aritmética", neumaierSum(values) / values.length);
}

/**
 * Media ponderada.
 *
 * Fórmula: `x̄w = suma de (wi · xi) / suma de wi`. Exige `wi >= 0` y
 * `suma de wi > 0`; los pesos no se normalizan.
 *
 * @param values - Valores finitos de la variable.
 * @param weights - Pesos, uno por dato, no negativos.
 * @returns Métrica con la media ponderada, o `null` con su motivo.
 */
export function weightedMean(values: readonly number[], weights: readonly number[]): Metric {
  const label = "Media ponderada";
  const check = checkSample(values, 1);
  if (!check.ok) return unavailableMetric("media-ponderada", label, check.reason);
  if (weights.length !== values.length) {
    return unavailableMetric("media-ponderada", label, REASONS.pesosLongitud);
  }
  if (weights.some((weight) => !isFiniteNumber(weight))) {
    return unavailableMetric("media-ponderada", label, REASONS.noNumerico);
  }
  if (weights.some((weight) => weight < 0)) {
    return unavailableMetric("media-ponderada", label, REASONS.pesosInvalidos);
  }
  const totalWeight = neumaierSum(weights);
  if (totalWeight <= 0) {
    return unavailableMetric("media-ponderada", label, REASONS.pesosSumaCero);
  }
  const products = values.map((value, index) => value * (weights[index] ?? 0));
  return makeMetric("media-ponderada", label, neumaierSum(products) / totalWeight);
}

/**
 * Media geométrica, calculada en el espacio logarítmico para evitar el
 * desbordamiento del producto.
 *
 * Fórmula: `G = (producto de xi)^(1/n) = exp((1/n) · suma de ln xi)`.
 * Definida solo si todos los valores son mayores que cero.
 *
 * @param values - Valores finitos y positivos.
 * @returns Métrica con la media geométrica, o `null` con su motivo.
 */
export function geometricMean(values: readonly number[]): Metric {
  const label = "Media geométrica";
  const check = checkSample(values, 1);
  if (!check.ok) return unavailableMetric("media-geometrica", label, check.reason);
  if (values.some((value) => value <= 0)) {
    return unavailableMetric("media-geometrica", label, REASONS.soloPositivos);
  }
  const logs = values.map((value) => Math.log(value));
  return makeMetric("media-geometrica", label, Math.exp(neumaierSum(logs) / values.length));
}

/**
 * Media armónica.
 *
 * Fórmula: `H = n / suma de (1/xi)`. Definida solo si todos los valores son
 * mayores que cero (mismo signo y ninguno nulo), para que sea interpretable.
 *
 * @param values - Valores finitos y positivos.
 * @returns Métrica con la media armónica, o `null` con su motivo.
 */
export function harmonicMean(values: readonly number[]): Metric {
  const label = "Media armónica";
  const check = checkSample(values, 1);
  if (!check.ok) return unavailableMetric("media-armonica", label, check.reason);
  if (values.some((value) => value <= 0)) {
    return unavailableMetric("media-armonica", label, REASONS.soloPositivos);
  }
  const inverses = values.map((value) => 1 / value);
  return makeMetric("media-armonica", label, values.length / neumaierSum(inverses));
}

/**
 * Media sobre datos agrupados, como aproximación por marcas de clase.
 *
 * Fórmula: `x̄ = suma de (fi · xi) / n`, con `xi` la marca de clase.
 *
 * @param rows - Filas de una tabla de frecuencias agrupada.
 * @returns Métrica etiquetada como aproximación por datos agrupados.
 */
export function groupedMean(rows: readonly FrequencyRow[]): Metric {
  const label = "Media (datos agrupados)";
  const usable = rows.filter((row) => isFiniteNumber(row.classMark));
  const n = usable.reduce((total, row) => total + row.absolute, 0);
  if (usable.length === 0 || n === 0) {
    return unavailableMetric("media-agrupada", label, REASONS.sinDatos);
  }
  const products = usable.map((row) => row.absolute * (row.classMark ?? 0));
  return makeMetric("media-agrupada", label, neumaierSum(products) / n);
}
