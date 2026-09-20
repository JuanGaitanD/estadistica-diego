import { explanationFor } from "../explanations/catalog";
import { makeMetric, unavailableMetric } from "../metric";
import { checkSample, isFiniteNumber, quantile, sortAscending, REASONS } from "../numeric";
import type { FrequencyRow, Metric, OrdinalMedianResult } from "../types";

/**
 * Mediana sobre datos crudos.
 *
 * Fórmula: es el cuantil 0,5 por el método inclusivo (R-7), que coincide
 * exactamente con `x((n+1)/2)` si n es impar y con el promedio de los dos
 * centrales si n es par. Hay una sola ruta de código: `quantile`.
 *
 * @param values - Valores finitos de la variable.
 * @returns Métrica con la mediana, o `null` con su motivo.
 */
export function median(values: readonly number[]): Metric {
  const check = checkSample(values, 1);
  if (!check.ok) return unavailableMetric("mediana", "Mediana", check.reason);
  const result = quantile(sortAscending(values), 0.5);
  if (result === null) return unavailableMetric("mediana", "Mediana", REASONS.sinDatos);
  return makeMetric("mediana", "Mediana", result);
}

/**
 * Mediana interpolada de datos agrupados.
 *
 * Fórmula: `Me = Li + ((n/2 − F(i−1)) / fi) · l`, donde `i` es la primera clase
 * cuya frecuencia acumulada alcanza `n/2`.
 *
 * @param rows - Filas de una tabla de frecuencias agrupada.
 * @param intervalLength - Longitud `l` de las clases.
 * @returns Métrica etiquetada como aproximación por datos agrupados.
 */
export function groupedMedian(rows: readonly FrequencyRow[], intervalLength: number): Metric {
  const label = "Mediana (datos agrupados)";
  const n = rows.reduce((total, row) => total + row.absolute, 0);
  if (n === 0) return unavailableMetric("mediana-agrupada", label, REASONS.sinDatos);
  const half = n / 2;
  let previousCumulative = 0;
  for (const row of rows) {
    if (row.cumulativeAbsolute >= half) {
      const lower = row.lowerBound;
      if (!isFiniteNumber(lower) || row.absolute === 0) {
        return unavailableMetric("mediana-agrupada", label, REASONS.sinDatos);
      }
      const width =
        isFiniteNumber(row.upperBound) && row.upperBound - lower > 0
          ? row.upperBound - lower
          : intervalLength;
      return makeMetric(
        "mediana-agrupada",
        label,
        lower + ((half - previousCumulative) / row.absolute) * width,
      );
    }
    previousCumulative = row.cumulativeAbsolute;
  }
  return unavailableMetric("mediana-agrupada", label, REASONS.sinDatos);
}

/**
 * Mediana posicional de una variable ordinal: devuelve la categoría central del
 * orden declarado, sin promediar categorías. Con n par se toma la posición
 * `n/2 + 1` (ADR-003 §3.5).
 *
 * @param values - Valores categóricos de la variable.
 * @param categoryOrder - Orden declarado de las categorías.
 * @returns La categoría mediana, o `null` con su motivo.
 */
export function ordinalMedian(
  values: readonly string[],
  categoryOrder: readonly string[],
): OrdinalMedianResult {
  const explanation = explanationFor("mediana-ordinal");
  const rank = new Map(categoryOrder.map((label, index) => [label, index]));
  const ranked = values.filter((value) => rank.has(value)).map((value) => rank.get(value) ?? 0);
  if (ranked.length === 0) {
    return { label: null, unavailableReason: REASONS.sinDatos, explanation };
  }
  const sorted = sortAscending(ranked);
  const n = sorted.length;
  const position = n % 2 === 1 ? (n + 1) / 2 : n / 2 + 1;
  const index = sorted[position - 1];
  const category = index === undefined ? undefined : categoryOrder[index];
  if (category === undefined) {
    return { label: null, unavailableReason: REASONS.sinDatos, explanation };
  }
  return { label: category, explanation };
}
