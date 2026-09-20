import { explanationFor, type ExplanationKey } from "./explanations/catalog";
import { finiteOrNull } from "./numeric/validate";
import type { Explanation, Metric } from "./types";

/**
 * Construye una métrica disponible. Si el número no es finito (NaN o infinito)
 * se degrada a `null` con motivo, para que nunca salga un NaN del dominio.
 *
 * @param key - Clave del catálogo de explicaciones, usada también como `key`.
 * @param label - Etiqueta mostrada al usuario.
 * @param value - Valor calculado.
 * @param options - `integer: true` marca conteos que deben mostrarse sin decimales.
 */
export function makeMetric(
  key: ExplanationKey,
  label: string,
  value: number,
  options: { readonly integer?: boolean } = {},
): Metric {
  const safe = finiteOrNull(value);
  if (safe === null) {
    return unavailableMetric(key, label, "El cálculo no produjo un número válido");
  }
  return {
    key,
    label,
    value: safe,
    explanation: explanationFor(key),
    ...(options.integer === true ? { integer: true } : {}),
  };
}

/**
 * Construye una métrica no calculable, con su motivo en español.
 *
 * @param key - Clave del catálogo de explicaciones.
 * @param label - Etiqueta mostrada al usuario.
 * @param reason - Por qué no se puede calcular.
 */
export function unavailableMetric(key: ExplanationKey, label: string, reason: string): Metric {
  return { key, label, value: null, unavailableReason: reason, explanation: explanationFor(key) };
}

/**
 * Variante de `makeMetric` con clave e identificador distintos (por ejemplo
 * `Q1`, `D3` o `P90`, que comparten la explicación de su familia).
 *
 * @param key - Identificador único de la métrica.
 * @param explanationKey - Clave del catálogo de explicaciones.
 * @param label - Etiqueta mostrada al usuario.
 * @param value - Valor calculado, o `null`.
 * @param reason - Motivo cuando el valor es `null`.
 */
export function makeKeyedMetric(
  key: string,
  explanationKey: ExplanationKey,
  label: string,
  value: number | null,
  reason: string,
): Metric {
  const safe = value === null ? null : finiteOrNull(value);
  const explanation: Explanation = explanationFor(explanationKey);
  if (safe === null) {
    return { key, label, value: null, unavailableReason: reason, explanation };
  }
  return { key, label, value: safe, explanation };
}
