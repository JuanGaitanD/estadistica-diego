/** Acumulados del algoritmo de Welford en una pasada. */
export interface WelfordAccumulator {
  readonly n: number;
  readonly mean: number;
  /** Suma de cuadrados de las desviaciones respecto a la media. */
  readonly m2: number;
}

/**
 * Algoritmo de Welford en una pasada.
 *
 * Fórmula: para cada x, `n += 1; d = x − media; media += d/n; M2 += d · (x − media)`.
 * A partir de `M2`: `s² = M2/(n−1)` y `σ² = M2/n`. Se usa en lugar de
 * `(suma x² − (suma x)²/n)` para evitar la cancelación catastrófica.
 *
 * @param values - Valores finitos.
 * @returns Acumulados `n`, `mean` y `m2`; `null` si no hay datos.
 */
export function welford(values: readonly number[]): WelfordAccumulator | null {
  if (values.length === 0) return null;
  let n = 0;
  let mean = 0;
  let m2 = 0;
  for (const value of values) {
    n += 1;
    const delta = value - mean;
    mean += delta / n;
    m2 += delta * (value - mean);
  }
  return { n, mean, m2 };
}
