/** Tolerancia relativa por defecto para comparar flotantes. */
export const DEFAULT_EPSILON = 1e-12;

/**
 * Comparador numérico ascendente explícito. Nunca se usa el comparador por
 * defecto de `Array.prototype.sort`, que ordena como texto.
 */
export function ascending(a: number, b: number): number {
  return a - b;
}

/** `true` si el array ya está en orden no decreciente. Una pasada O(n). */
export function isSortedAscending(values: readonly number[]): boolean {
  let previous = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value < previous) return false;
    previous = value;
  }
  return true;
}

/**
 * Devuelve una copia ordenada ascendentemente del array.
 *
 * Rendimiento (RNF-06): una misma variable se ordena en varios sitios del
 * análisis (mínimo/máximo, cuantiles, RIC, atípicos). Cuando quien llama ya
 * pasa el array ordenado, la comprobación O(n) evita el `sort` O(n log n); con
 * 50 000 datos eso recorta el análisis a menos de la mitad.
 *
 * @param values - Valores finitos.
 */
export function sortAscending(values: readonly number[]): number[] {
  const copy = [...values];
  return isSortedAscending(copy) ? copy : copy.sort(ascending);
}

/**
 * Igualdad de flotantes con tolerancia relativa.
 *
 * Fórmula: `|a − b| <= eps · máx(1, |a|, |b|)`.
 *
 * @param a - Primer valor.
 * @param b - Segundo valor.
 * @param epsilon - Tolerancia relativa (por defecto `1e-12`).
 */
export function epsEq(a: number, b: number, epsilon: number = DEFAULT_EPSILON): boolean {
  if (a === b) return true;
  return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
}
