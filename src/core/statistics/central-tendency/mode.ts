import { explanationFor } from "../explanations/catalog";
import { makeMetric, unavailableMetric } from "../metric";
import { isFiniteNumber, REASONS } from "../numeric";
import type { FrequencyRow, Metric, ModeEntry, ModeResult, ObservedValue } from "../types";

function modeLabel(kind: ModeResult["kind"], count: number): string {
  if (kind === "amodal") return "amodal";
  if (kind === "unimodal") return "unimodal";
  if (count === 2) return "bimodal";
  if (count === 3) return "trimodal";
  return "multimodal";
}

/**
 * Moda de una variable, categórica o numérica (ADR-003 §3.6).
 *
 * Fórmula: `Mo` = valor o valores cuya frecuencia alcanza `fmax`.
 * Es **amodal** cuando todos los valores distintos tienen la misma frecuencia y
 * hay más de uno; **unimodal** cuando solo uno alcanza `fmax`; **multimodal**
 * (bimodal, trimodal…) cuando lo alcanzan dos o más.
 *
 * @param values - Valores ya limpios de la variable.
 * @returns El tipo de moda, los valores modales con su recuento y la explicación.
 */
export function mode(values: readonly ObservedValue[]): ModeResult {
  const explanation = explanationFor("moda");
  const counts = new Map<string, ModeEntry>();
  for (const value of values) {
    if (typeof value === "number" && !isFiniteNumber(value)) continue;
    const key = typeof value === "number" ? `n:${value}` : `s:${value}`;
    const entry = counts.get(key);
    if (entry === undefined) counts.set(key, { value, count: 1 });
    else counts.set(key, { value: entry.value, count: entry.count + 1 });
  }

  const entries = [...counts.values()];
  if (entries.length === 0) {
    return { kind: "amodal", label: "amodal", values: [], explanation };
  }

  const max = Math.max(...entries.map((entry) => entry.count));
  const min = Math.min(...entries.map((entry) => entry.count));
  const modal = entries.filter((entry) => entry.count === max);

  if (entries.length > 1 && max === min) {
    return { kind: "amodal", label: "amodal", values: [], explanation };
  }
  const kind: ModeResult["kind"] = modal.length === 1 ? "unimodal" : "multimodal";
  return { kind, label: modeLabel(kind, modal.length), values: modal, explanation };
}

/**
 * Moda interpolada de datos agrupados.
 *
 * Fórmula: `Mo = Li + (D1 / (D1 + D2)) · l`, con `D1 = fi − f(i−1)` y
 * `D2 = fi − f(i+1)`, tomando `f0 = f(K+1) = 0`. Si `D1 + D2 = 0` se devuelve la
 * marca de clase.
 *
 * @param rows - Filas de una tabla de frecuencias agrupada.
 * @param intervalLength - Longitud `l` de las clases.
 * @returns Métrica etiquetada como aproximación por datos agrupados.
 */
export function groupedMode(rows: readonly FrequencyRow[], intervalLength: number): Metric {
  const label = "Moda (datos agrupados)";
  if (rows.length === 0) return unavailableMetric("moda-agrupada", label, REASONS.sinDatos);
  let best = 0;
  for (let index = 1; index < rows.length; index += 1) {
    if ((rows[index]?.absolute ?? 0) > (rows[best]?.absolute ?? 0)) best = index;
  }
  const row = rows[best];
  if (row === undefined || row.absolute === 0) {
    return unavailableMetric("moda-agrupada", label, REASONS.sinDatos);
  }
  const lower = row.lowerBound;
  if (!isFiniteNumber(lower)) {
    return unavailableMetric("moda-agrupada", label, REASONS.sinDatos);
  }
  const width =
    isFiniteNumber(row.upperBound) && row.upperBound - lower > 0
      ? row.upperBound - lower
      : intervalLength;
  const d1 = row.absolute - (rows[best - 1]?.absolute ?? 0);
  const d2 = row.absolute - (rows[best + 1]?.absolute ?? 0);
  if (d1 + d2 === 0) {
    return makeMetric("moda-agrupada", label, row.classMark ?? lower + width / 2);
  }
  return makeMetric("moda-agrupada", label, lower + (d1 / (d1 + d2)) * width);
}
