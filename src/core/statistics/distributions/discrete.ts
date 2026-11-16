import { lnGamma } from "./special";

/** ln C(n, k). */
function lnChoose(n: number, k: number): number {
  return lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
}

/** P(X = k) de una binomial (`DISTR.BINOM.N(k; n; p; FALSO)`). */
export function binomialPmf(k: number, n: number, p: number): number {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(lnChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** P(X ≤ k) de una binomial (`DISTR.BINOM.N(k; n; p; VERDADERO)`). */
export function binomialCdf(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i += 1) sum += binomialPmf(i, n, p);
  return Math.min(1, sum);
}

/** P(X = k) de una Poisson (`POISSON.DIST(k; λ; FALSO)`). */
export function poissonPmf(k: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log(lambda) - lambda - lnGamma(k + 1));
}

/** P(X ≤ k) de una Poisson (`POISSON.DIST(k; λ; VERDADERO)`). */
export function poissonCdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i += 1) sum += poissonPmf(i, lambda);
  return Math.min(1, sum);
}
