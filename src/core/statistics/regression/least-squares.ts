/**
 * Mínimos cuadrados por descomposición QR de Householder: más estable que
 * resolver (XᵀX)·b = Xᵀy directamente, que pierde precisión con predictores
 * parecidos o potencias de X.
 */
export interface LeastSquares {
  readonly coefficients: readonly number[];
  /** (XᵀX)⁻¹, para los errores estándar. */
  readonly inverse: readonly (readonly number[])[];
}

/**
 * Resuelve min ‖y − X·b‖² (con pesos opcionales: min Σ wᵢ(yᵢ − xᵢ·b)²).
 * Devuelve `null` si las columnas de X son linealmente dependientes.
 */
export function leastSquares(
  X: readonly (readonly number[])[],
  y: readonly number[],
  weights?: readonly number[],
): LeastSquares | null {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  if (p === 0 || n < p) return null;
  const sqrtW = (i: number) => (weights ? Math.sqrt(weights[i] ?? 0) : 1);
  const A = X.map((row, i) => row.map((v) => v * sqrtW(i)));
  const b = y.map((v, i) => v * sqrtW(i));
  const at = (i: number, j: number) => A[i]![j]!;

  for (let k = 0; k < p; k += 1) {
    let columnNorm = 0;
    for (let i = 0; i < n; i += 1) columnNorm += at(i, k) ** 2;
    let norm = 0;
    for (let i = k; i < n; i += 1) norm += at(i, k) ** 2;
    norm = Math.sqrt(norm);
    // Columna (casi) combinación de las anteriores: colinealidad exacta.
    if (norm <= 1e-10 * Math.sqrt(columnNorm) || norm === 0) return null;
    const alpha = at(k, k) > 0 ? -norm : norm;
    const v = Array.from({ length: n }, (_, i) => (i < k ? 0 : at(i, k)));
    v[k]! -= alpha;
    const vv = v.reduce((sum, value) => sum + value * value, 0);
    for (let j = k; j < p; j += 1) {
      let dot = 0;
      for (let i = k; i < n; i += 1) dot += v[i]! * at(i, j);
      const factor = (2 * dot) / vv;
      for (let i = k; i < n; i += 1) A[i]![j]! -= factor * v[i]!;
    }
    let dot = 0;
    for (let i = k; i < n; i += 1) dot += v[i]! * b[i]!;
    const factor = (2 * dot) / vv;
    for (let i = k; i < n; i += 1) b[i]! -= factor * v[i]!;
  }

  const coefficients = new Array<number>(p).fill(0);
  for (let i = p - 1; i >= 0; i -= 1) {
    let sum = b[i]!;
    for (let j = i + 1; j < p; j += 1) sum -= at(i, j) * coefficients[j]!;
    coefficients[i] = sum / at(i, i);
  }

  // R⁻¹ (triangular superior) y (XᵀX)⁻¹ = R⁻¹ · R⁻ᵀ.
  const Rinv = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let i = p - 1; i >= 0; i -= 1) {
    Rinv[i]![i] = 1 / at(i, i);
    for (let j = i + 1; j < p; j += 1) {
      let sum = 0;
      for (let m = i + 1; m <= j; m += 1) sum += at(i, m) * Rinv[m]![j]!;
      Rinv[i]![j] = -sum / at(i, i);
    }
  }
  const inverse = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      let sum = 0;
      for (let m = Math.max(i, j); m < p; m += 1) sum += Rinv[i]![m]! * Rinv[j]![m]!;
      return sum;
    }),
  );
  return { coefficients, inverse };
}
