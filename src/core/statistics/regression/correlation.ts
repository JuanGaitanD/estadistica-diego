import { tTwoTailedP } from "../distributions/student-t";
import { neumaierSum } from "../numeric/sum";

/** Coeficiente de correlación con su prueba de significancia (H0: ρ = 0). */
export interface Correlation {
  readonly method: "pearson" | "spearman";
  readonly n: number;
  readonly r: number;
  /** t = r·√((n − 2) / (1 − r²)), con n − 2 grados de libertad. */
  readonly t: number;
  readonly p: number;
}

/** Pearson sobre datos completos; `null` si n < 3 o alguna variable no varía. */
export function pearson(x: readonly number[], y: readonly number[]): Correlation | null {
  return correlate(x, y, "pearson");
}

/**
 * Rangos con empates promediados (el de `JERARQUIA.MEDIA` de Excel): el
 * menor valor recibe rango 1.
 */
export function averageRanks(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]?.value === order[i]?.value) j += 1;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) ranks[order[k]?.index ?? 0] = rank;
    i = j + 1;
  }
  return ranks;
}

/** Spearman: Pearson sobre los rangos (con empates promediados). */
export function spearman(x: readonly number[], y: readonly number[]): Correlation | null {
  return correlate(averageRanks(x), averageRanks(y), "spearman");
}

function correlate(
  x: readonly number[],
  y: readonly number[],
  method: Correlation["method"],
): Correlation | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;
  const mx = neumaierSum(x) / n;
  const my = neumaierSum(y) / n;
  const sxy = neumaierSum(x.map((v, i) => (v - mx) * ((y[i] ?? 0) - my)));
  const sxx = neumaierSum(x.map((v) => (v - mx) ** 2));
  const syy = neumaierSum(y.map((v) => (v - my) ** 2));
  if (sxx <= 0 || syy <= 0) return null;
  const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  const df = n - 2;
  const t =
    Math.abs(r) >= 1 ? Math.sign(r) * Number.POSITIVE_INFINITY : r * Math.sqrt(df / (1 - r * r));
  return { method, n, r, t, p: tTwoTailedP(t, df) };
}
