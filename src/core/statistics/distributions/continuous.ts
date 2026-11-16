import { lnGamma, regularizedBeta } from "./special";

/** Gamma incompleta regularizada inferior P(a, x) (serie o fracción continua). */
export function regularizedGammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  const front = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 500; n += 1) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    return front * sum;
  }
  // Fracción continua para Q(a, x) (Lentz), y P = 1 − Q.
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return 1 - front * h;
}

/** Φ(z): P(Z ≤ z) de la normal estándar (`DISTR.NORM.ESTAND.N(z; VERDADERO)`). */
export function standardNormalCdf(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0;
  const half = 0.5 * regularizedGammaP(0.5, (z * z) / 2);
  return z >= 0 ? 0.5 + half : 0.5 - half;
}

/** Densidad de la normal. */
export function normalPdf(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** P(X ≤ x) de una normal (`DISTR.NORM.N(x; μ; σ; VERDADERO)`). */
export function normalCdf(x: number, mean = 0, sd = 1): number {
  return standardNormalCdf((x - mean) / sd);
}

/**
 * Cuantil de la normal estándar (`INV.NORM.ESTAND(p)`): aproximación de
 * Acklam refinada con un paso de Halley (error < 1e-14).
 */
export function standardNormalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : Number.NaN;
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
    2.506628277459239,
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972,
    -13.28068155288572,
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  let x: number;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p <= 1 - low) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  // Un paso de Halley.
  const e = standardNormalCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** Cuantil de una normal (`INV.NORM(p; μ; σ)`). */
export function normalQuantile(p: number, mean = 0, sd = 1): number {
  return mean + sd * standardNormalQuantile(p);
}

/** P(X ≤ x) de una chi-cuadrado (`DISTR.CHICUAD(x; gl; VERDADERO)`). */
export function chiSquareCdf(x: number, df: number): number {
  return x <= 0 ? 0 : regularizedGammaP(df / 2, x / 2);
}

/** Densidad de la chi-cuadrado. */
export function chiSquarePdf(x: number, df: number): number {
  if (x < 0) return 0;
  if (x === 0) return df === 2 ? 0.5 : df < 2 ? Infinity : 0;
  const k = df / 2;
  return Math.exp((k - 1) * Math.log(x) - x / 2 - k * Math.log(2) - lnGamma(k));
}

/** P(X ≤ x) de una F de Snedecor (`DISTR.F.N(x; gl1; gl2; VERDADERO)`). */
export function fCdf(x: number, d1: number, d2: number): number {
  return x <= 0 ? 0 : regularizedBeta((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2);
}

/** Densidad de la F. */
export function fPdf(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  const lnB = lnGamma(d1 / 2) + lnGamma(d2 / 2) - lnGamma((d1 + d2) / 2);
  return Math.exp(
    (d1 / 2) * Math.log(d1 / d2) +
      (d1 / 2 - 1) * Math.log(x) -
      ((d1 + d2) / 2) * Math.log(1 + (d1 * x) / d2) -
      lnB,
  );
}

/** Densidad de la t de Student. */
export function tPdf(x: number, df: number): number {
  return Math.exp(
    lnGamma((df + 1) / 2) -
      lnGamma(df / 2) -
      0.5 * Math.log(df * Math.PI) -
      ((df + 1) / 2) * Math.log(1 + (x * x) / df),
  );
}

/** Invierte una CDF continua y creciente por bisección en [low, high] (que se amplía). */
export function invertCdf(
  cdf: (x: number) => number,
  p: number,
  low: number,
  high: number,
): number {
  if (!(p > 0 && p < 1)) return Number.NaN;
  let lo = low;
  let hi = high;
  while (cdf(hi) < p) hi = hi * 2 + 1;
  while (cdf(lo) > p) lo = lo < 0 ? lo * 2 : lo / 2 - 1;
  for (let i = 0; i < 300 && hi - lo > 1e-12 * Math.max(1, Math.abs(hi)); i += 1) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Cuantil de la chi-cuadrado (`INV.CHICUAD(p; gl)`). */
export function chiSquareQuantile(p: number, df: number): number {
  return invertCdf((x) => chiSquareCdf(x, df), p, 0, Math.max(1, df * 2));
}

/** Cuantil de la F (`INV.F(p; gl1; gl2)`). */
export function fQuantile(p: number, d1: number, d2: number): number {
  return invertCdf((x) => fCdf(x, d1, d2), p, 0, 4);
}
