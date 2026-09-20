import type { QuantileMethod } from "../types";
import { isFiniteNumber } from "./validate";

/**
 * Cuantil de una muestra **ya ordenada** ascendentemente (ADR-003 §4).
 *
 * Fórmulas:
 * - `inclusivo` (R-7, por defecto; equivale a `PERCENTIL.INC` de Excel y a
 *   `quantile(type = 7)` de R): `h = (n − 1)·p + 1`.
 * - `exclusivo` (R-6, equivale a `CUARTIL.EXC`): `h = (n + 1)·p`, definido solo
 *   para `1/(n+1) <= p <= n/(n+1)`.
 *
 * En ambos casos `Q(p) = x(piso(h)) + (h − piso(h)) · (x(piso(h)+1) − x(piso(h)))`.
 * Es la única implementación de cuantiles del dominio: cuartiles, deciles y
 * percentiles se construyen sobre ella.
 *
 * @param sorted - Muestra ordenada ascendentemente, sin faltantes.
 * @param p - Proporción en [0, 1].
 * @param method - Método de interpolación (`"inclusivo"` por defecto).
 * @returns El cuantil, o `null` si no está definido para esa entrada.
 */
export function quantile(
  sorted: readonly number[],
  p: number,
  method: QuantileMethod = "inclusivo",
): number | null {
  const n = sorted.length;
  if (n === 0) return null;
  if (!isFiniteNumber(p) || p < 0 || p > 1) return null;
  if (sorted.some((value) => !isFiniteNumber(value))) return null;

  const h = method === "inclusivo" ? (n - 1) * p + 1 : (n + 1) * p;
  if (method === "exclusivo" && (h < 1 || h > n)) return null;

  const floor = Math.floor(h);
  if (floor >= n) return sorted[n - 1] ?? null;
  const lower = sorted[floor - 1];
  const upper = sorted[floor];
  if (lower === undefined || upper === undefined) return null;
  return lower + (h - floor) * (upper - lower);
}
