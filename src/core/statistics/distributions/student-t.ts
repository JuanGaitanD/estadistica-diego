import { regularizedBeta } from "./special";

/** P(T ≤ t) de una t de Student con `df` grados de libertad (`DISTR.T.N(t; df; VERDADERO)`). */
export function tCdf(t: number, df: number): number {
  if (!Number.isFinite(t)) return t > 0 ? 1 : 0;
  const tail = 0.5 * regularizedBeta(df / (df + t * t), df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

/** Valor p de dos colas: P(|T| ≥ |t|) (`DISTR.T.2C(|t|; df)`). */
export function tTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  return regularizedBeta(df / (df + t * t), df / 2, 0.5);
}

/**
 * Cuantil de la t de Student: el t con P(T ≤ t) = p (`INV.T(p; df)`). Se
 * resuelve por bisección sobre la CDF, que es monótona.
 */
export function tQuantile(p: number, df: number): number {
  if (!(p > 0 && p < 1) || !(df > 0)) return Number.NaN;
  if (p === 0.5) return 0;
  let low = -1;
  let high = 1;
  while (tCdf(low, df) > p) low *= 2;
  while (tCdf(high, df) < p) high *= 2;
  for (let i = 0; i < 200 && high - low > 1e-13 * Math.max(1, Math.abs(high)); i += 1) {
    const mid = (low + high) / 2;
    if (tCdf(mid, df) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
