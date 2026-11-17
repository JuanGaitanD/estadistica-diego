import { chiSquareCdf } from "../distributions/continuous";
import { lnGamma } from "../distributions/special";
import { formatCount, formatShare, formatValue, narrativeDecimals } from "../interpretation/text";
import { averageRanks } from "../regression/correlation";
import {
  chiSquareIndependence,
  effectSentence,
  fiveSteps,
  H1_SIGN,
  p4,
  pFormulaOf,
  SIGNIFICANCE,
  sideText,
  sizeBy,
  TAILS,
  verdict,
  zP,
  type Alternative,
  type EffectSize,
  type HypothesisTest,
  type NamedGroup,
  type TestOptions,
} from "./hypothesis-tests";

/*
 * Pruebas que no suponen datos normales: trabajan con el orden (los rangos)
 * de los datos. Siguen a `wilcox.test`, `kruskal.test` y `fisher.test` de R:
 * con menos de 50 datos por grupo y sin empates el valor p es exacto; si no,
 * aproximación normal con corrección por continuidad y por empates.
 */

const EXACT_LIMIT = 50;

function middle(values: readonly number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const m = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[m]! : (sorted[m - 1]! + sorted[m]!) / 2;
}

/** Σ (t³ − t) de los grupos de empates. */
function tieSum(ranks: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  let sum = 0;
  for (const t of counts.values()) sum += t ** 3 - t;
  return sum;
}

/**
 * Distribución exacta de W de Mann-Whitney: cuántas formas hay de que los
 * rangos de un grupo de `m` sumen cada valor entre `n + m` (`dwilcox`).
 * Devuelve las probabilidades de W = 0 … m·n.
 */
function wilcoxDistribution(m: number, n: number): number[] {
  const total = m + n;
  const maxSum = (m * (2 * total - m + 1)) / 2;
  // ways[k][s]: subconjuntos de k rangos que suman s.
  const ways = Array.from({ length: m + 1 }, () => new Float64Array(maxSum + 1));
  ways[0]![0] = 1;
  for (let r = 1; r <= total; r += 1) {
    for (let k = Math.min(m, r); k >= 1; k -= 1) {
      const from = ways[k - 1]!;
      const to = ways[k]!;
      for (let s = maxSum - r; s >= 0; s -= 1) if (from[s]! > 0) to[s + r]! += from[s]!;
    }
  }
  const offset = (m * (m + 1)) / 2;
  const counts = Array.from({ length: m * n + 1 }, (_, w) => ways[m]![w + offset]!);
  const all = counts.reduce((sum, c) => sum + c, 0);
  return counts.map((c) => c / all);
}

/** Distribución exacta de V de Wilcoxon con signo: sumas de subconjuntos de 1…n (`dsignrank`). */
function signRankDistribution(n: number): number[] {
  const maxSum = (n * (n + 1)) / 2;
  const ways = new Float64Array(maxSum + 1);
  ways[0] = 1;
  for (let r = 1; r <= n; r += 1) {
    for (let s = maxSum - r; s >= 0; s -= 1) ways[s + r]! += ways[s]!;
  }
  const all = 2 ** n;
  return Array.from(ways, (c) => c / all);
}

/** P(X ≤ q) y P(X ≥ q) de una distribución discreta sobre 0, 1, 2… */
const lower = (dist: readonly number[], q: number) =>
  dist.slice(0, Math.max(0, Math.floor(q) + 1)).reduce((s, p) => s + p, 0);
const upper = (dist: readonly number[], q: number) =>
  dist.slice(Math.max(0, Math.ceil(q))).reduce((s, p) => s + p, 0);

/** Valor p exacto como `wilcox.test`: con dos colas, el doble de la cola del lado observado. */
function exactP(
  dist: readonly number[],
  statistic: number,
  center: number,
  alternative: Alternative,
): number {
  if (alternative === "mayor") return upper(dist, statistic);
  if (alternative === "menor") return lower(dist, statistic);
  const tail = statistic > center ? upper(dist, statistic) : lower(dist, statistic);
  return Math.min(1, 2 * tail);
}

/** z con corrección por continuidad de `wilcox.test`. */
function correctedZ(diff: number, sigma: number, alternative: Alternative): number {
  const correction =
    alternative === "mayor" ? 0.5 : alternative === "menor" ? -0.5 : Math.sign(diff) * 0.5;
  return (diff - correction) / sigma;
}

const rankBiserial = (value: number): EffectSize => ({
  name: "correlación biserial de rangos",
  value,
  size: sizeBy(value, [0.1, 0.3, 0.5]),
});

const methodNote = (exact: boolean, ties: boolean) =>
  exact
    ? "El valor p es exacto: se cuentan todas las formas posibles de repartir los rangos."
    : `El valor p usa la aproximación normal con corrección por continuidad${ties ? " y por empates" : ""}, como R.`;

/**
 * Mann-Whitney (Wilcoxon de rangos para dos grupos independientes): la
 * alternativa a la t cuando los datos no se parecen a una normal.
 */
export function mannWhitney(
  a: NamedGroup,
  b: NamedGroup,
  name: string,
  { alpha = SIGNIFICANCE, alternative = "distinto" }: TestOptions = {},
): HypothesisTest | null {
  const n1 = a.values.length;
  const n2 = b.values.length;
  if (n1 < 1 || n2 < 1 || n1 + n2 < 3) return null;
  const ranks = averageRanks([...a.values, ...b.values]);
  const r1 = ranks.slice(0, n1).reduce((s, r) => s + r, 0);
  const w = r1 - (n1 * (n1 + 1)) / 2;
  const ties = new Set(ranks).size !== ranks.length;
  const exact = n1 < EXACT_LIMIT && n2 < EXACT_LIMIT && !ties;
  const center = (n1 * n2) / 2;
  const n = n1 + n2;
  const sigma = Math.sqrt((n1 * n2 * (n + 1 - tieSum(ranks) / (n * (n - 1)))) / 12);
  if (!exact && !(sigma > 0)) return null;
  const z = exact ? null : correctedZ(w - center, sigma, alternative);
  const p = exact
    ? exactP(wilcoxDistribution(n1, n2), w, center, alternative)
    : zP(z!, alternative);
  const effect = rankBiserial((2 * w) / (n1 * n2) - 1);
  const d = narrativeDecimals([...a.values, ...b.values]);
  const m1 = middle(a.values);
  const m2 = middle(b.values);
  const higher = w >= center ? a.label : b.label;
  const lowerLabel = w >= center ? b.label : a.label;
  const claim = sideText(
    alternative,
    "una diferencia entre los dos grupos en la población",
    `valores más altos en «${a.label}» que en «${b.label}» en la población`,
    `valores más bajos en «${a.label}» que en «${b.label}» en la población`,
  );
  return {
    test: "Mann-Whitney",
    statisticLabel: "W",
    statistic: w,
    reference: null,
    tails: TAILS[alternative],
    pValue: p,
    alpha,
    significant: p < alpha,
    effect,
    interpretation: {
      headline: `${w === center ? `Los valores de ${name} son parecidos en los dos grupos` : `Los valores de ${name} suelen ser más altos en «${higher}» que en «${lowerLabel}»`} (medianas ${formatValue(m1, d)} en «${a.label}» y ${formatValue(m2, d)} en «${b.label}»). ${verdict(p, alpha, n, claim, alternative === "distinto" ? "sean iguales" : "no lo sea")}`,
      details: [
        effectSentence(effect),
        "Se usó Mann-Whitney, que compara el orden de los datos y no supone que se parezcan a una normal.",
        methodNote(exact, ties),
      ],
      caveats: [],
    },
    steps: fiveSteps({
      h0: `los dos grupos tienen la misma distribución de ${name}`,
      h1: sideText(
        alternative,
        "uno tiende a tener valores distintos del otro",
        `«${a.label}» tiende a valores más altos`,
        `«${a.label}» tiende a valores más bajos`,
      ),
      symbols: `H₀: P(X₁ > X₂) = ½    H₁: P(X₁ > X₂) ${H1_SIGN[alternative]} ½`,
      statistic: {
        title: "Estadístico W",
        text: "Se ordenan todos los datos juntos (los empates reciben el rango promedio) y se suman los rangos del primer grupo.",
        formula: `W = R₁ − n₁(n₁ + 1)/2 = ${formatValue(r1, 1)} − ${formatCount((n1 * (n1 + 1)) / 2)} = ${formatValue(w, 1)}${exact ? "" : `\nz = (W − n₁n₂/2 ∓ 0,5) / σ = (${formatValue(w, 1)} − ${formatValue(center, 1)} ∓ 0,5) / ${formatValue(sigma, 3)} = ${formatValue(z!, 3)}`}`,
        table: {
          columns: ["Grupo", "n", "Mediana", "Suma de rangos"],
          rows: [
            [a.label, formatCount(n1), formatValue(m1, d), formatValue(r1, 1)],
            [b.label, formatCount(n2), formatValue(m2, d), formatValue((n * (n + 1)) / 2 - r1, 1)],
          ],
        },
      },
      pFormula: exact
        ? `p exacto ${p4(p)}`
        : `${pFormulaOf("Z", formatValue(z!, 3), alternative)} ${p4(p)}`,
      p,
      alpha,
    }),
  };
}

/**
 * Wilcoxon de rangos con signo sobre diferencias (pareada) o frente a un
 * valor (una muestra). Las diferencias iguales a 0 se descartan, como en R.
 */
function signedRank(
  differences: readonly number[],
  alternative: Alternative,
): {
  v: number;
  p: number;
  n: number;
  zeros: number;
  exact: boolean;
  ties: boolean;
  z: number | null;
  sigma: number;
} | null {
  const nonzero = differences.filter((x) => x !== 0);
  const n = nonzero.length;
  if (n < 1) return null;
  const ranks = averageRanks(nonzero.map(Math.abs));
  const v = ranks.reduce((s, r, i) => (nonzero[i]! > 0 ? s + r : s), 0);
  const zeros = differences.length - n;
  const ties = new Set(ranks).size !== ranks.length;
  const exact = n < EXACT_LIMIT && !ties && zeros === 0;
  const center = (n * (n + 1)) / 4;
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - tieSum(ranks) / 48);
  if (!exact && !(sigma > 0)) return null;
  const z = exact ? null : correctedZ(v - center, sigma, alternative);
  const p = exact ? exactP(signRankDistribution(n), v, center, alternative) : zP(z!, alternative);
  return { v, p, n, zeros, exact, ties, z, sigma };
}

const zerosNote = (zeros: number) =>
  zeros > 0
    ? [
        `${formatCount(zeros)} ${zeros === 1 ? "caso no cambia y se deja" : "casos no cambian y se dejan"} fuera, como hace R.`,
      ]
    : [];

/** Wilcoxon de rangos con signo para datos pareados (antes y después). */
export function wilcoxonSignedRank(
  before: readonly number[],
  after: readonly number[],
  nameBefore: string,
  nameAfter: string,
  { alpha = SIGNIFICANCE, alternative = "distinto" }: TestOptions = {},
): HypothesisTest | null {
  const differences = before.flatMap((x, i) => {
    const y = after[i];
    return y === undefined ? [] : [y - x];
  });
  const r = signedRank(differences, alternative);
  if (r === null) return null;
  const n = r.n;
  const effect = rankBiserial((4 * r.v) / (n * (n + 1)) - 1);
  const md = middle(differences);
  const d = narrativeDecimals([...before, ...after]);
  return {
    test: "Wilcoxon de rangos con signo",
    statisticLabel: "V",
    statistic: r.v,
    reference: null,
    tails: TAILS[alternative],
    pValue: r.p,
    alpha,
    significant: r.p < alpha,
    effect,
    interpretation: {
      headline: `De ${nameBefore} a ${nameAfter} el cambio típico (la mediana de las diferencias) es ${md >= 0 ? "+" : "−"}${formatValue(Math.abs(md), d)}. ${verdict(r.p, alpha, differences.length, sideText(alternative, "un cambio real", "una subida real", "una bajada real"), alternative === "distinto" ? "no haya cambiado nada" : "no lo haya")}`,
      details: [
        effectSentence(effect),
        "Se usó Wilcoxon de rangos con signo, que no supone que las diferencias se parezcan a una normal.",
        methodNote(r.exact, r.ties),
        ...zerosNote(r.zeros),
      ],
      caveats: [],
    },
    steps: fiveSteps({
      h0: "las diferencias se reparten por igual hacia arriba y hacia abajo de 0",
      h1: sideText(alternative, "hay cambio", "el valor sube", "el valor baja"),
      symbols: `H₀: mediana_d = 0    H₁: mediana_d ${H1_SIGN[alternative]} 0`,
      statistic: {
        title: "Estadístico V",
        text: `Se calcula la diferencia de cada par (${nameAfter} − ${nameBefore}), se ordenan por tamaño sin signo y se suman los rangos de las que suben.`,
        formula: `V = Σ rangos de las diferencias positivas = ${formatValue(r.v, 1)} (de ${formatCount(n)} diferencias distintas de 0)${r.z === null ? "" : `\nz = (V − n(n + 1)/4 ∓ 0,5) / σ = ${formatValue(r.z, 3)}`}`,
      },
      pFormula:
        r.z === null
          ? `p exacto ${p4(r.p)}`
          : `${pFormulaOf("Z", formatValue(r.z, 3), alternative)} ${p4(r.p)}`,
      p: r.p,
      alpha,
    }),
  };
}

/** Wilcoxon de rangos con signo de una muestra: ¿la mediana es distinta de μ₀? */
export function wilcoxonOneSample(
  values: readonly number[],
  mu0: number,
  name: string,
  { alpha = SIGNIFICANCE, alternative = "distinto" }: TestOptions = {},
): HypothesisTest | null {
  const r = signedRank(
    values.map((x) => x - mu0),
    alternative,
  );
  if (r === null) return null;
  const n = r.n;
  const effect = rankBiserial((4 * r.v) / (n * (n + 1)) - 1);
  const d = narrativeDecimals(values);
  const f = (x: number) => formatValue(x, d);
  const md = middle(values);
  return {
    test: "Wilcoxon de una muestra",
    statisticLabel: "V",
    statistic: r.v,
    reference: null,
    tails: TAILS[alternative],
    pValue: r.p,
    alpha,
    significant: r.p < alpha,
    effect,
    interpretation: {
      headline: `La mediana de ${name} es ${f(md)}, ${md >= mu0 ? "mayor" : "menor"} que ${f(mu0)}. ${verdict(
        r.p,
        alpha,
        values.length,
        sideText(
          alternative,
          `una diferencia entre el valor típico de la población y ${f(mu0)}`,
          `un valor típico mayor que ${f(mu0)} en la población`,
          `un valor típico menor que ${f(mu0)} en la población`,
        ),
        alternative === "distinto" ? `sea igual a ${f(mu0)}` : "no lo sea",
      )}`,
      details: [
        effectSentence(effect),
        "Se usó Wilcoxon de una muestra, que no supone que los datos se parezcan a una normal.",
        methodNote(r.exact, r.ties),
        ...zerosNote(r.zeros),
      ],
      caveats: [],
    },
    steps: fiveSteps({
      h0: `la mediana de ${name} en la población es ${f(mu0)}`,
      h1: sideText(
        alternative,
        `es distinta de ${f(mu0)}`,
        `es mayor que ${f(mu0)}`,
        `es menor que ${f(mu0)}`,
      ),
      symbols: `H₀: mediana = ${f(mu0)}    H₁: mediana ${H1_SIGN[alternative]} ${f(mu0)}`,
      statistic: {
        title: "Estadístico V",
        text: `A cada dato se le resta ${f(mu0)}, se ordenan las diferencias por tamaño sin signo y se suman los rangos de las positivas.`,
        formula: `V = Σ rangos de (x − ${f(mu0)}) > 0 = ${formatValue(r.v, 1)}${r.z === null ? "" : `\nz = (V − n(n + 1)/4 ∓ 0,5) / σ = ${formatValue(r.z, 3)}`}`,
      },
      pFormula:
        r.z === null
          ? `p exacto ${p4(r.p)}`
          : `${pFormulaOf("Z", formatValue(r.z, 3), alternative)} ${p4(r.p)}`,
      p: r.p,
      alpha,
    }),
  };
}

/** Kruskal-Wallis: la alternativa al ANOVA cuando los datos no son normales. */
export function kruskalWallis(
  groups: readonly NamedGroup[],
  name: string,
  alpha = SIGNIFICANCE,
): HypothesisTest | null {
  const used = groups.filter((g) => g.values.length >= 1);
  const k = used.length;
  const all = used.flatMap((g) => [...g.values]);
  const n = all.length;
  if (k < 2 || n - k < 1) return null;
  const ranks = averageRanks(all);
  let offset = 0;
  const stats = used.map((g) => {
    const sum = ranks.slice(offset, offset + g.values.length).reduce((s, r) => s + r, 0);
    offset += g.values.length;
    return { label: g.label, n: g.values.length, sum, median: middle(g.values) };
  });
  const correction = 1 - tieSum(ranks) / (n ** 3 - n);
  if (!(correction > 0)) return null;
  const raw = (12 / (n * (n + 1))) * stats.reduce((s, g) => s + g.sum ** 2 / g.n, 0) - 3 * (n + 1);
  const h = raw / correction;
  const df = k - 1;
  const p = 1 - chiSquareCdf(h, df);
  const eta = Math.max(0, (h - k + 1) / (n - k));
  const effect: EffectSize = {
    name: "η² de rangos",
    value: eta,
    size: sizeBy(eta, [0.01, 0.06, 0.14]),
  };
  const d = narrativeDecimals(all);
  const sorted = [...stats].sort((x, y) => y.sum / y.n - x.sum / x.n);
  const top = sorted[0]!;
  const bottom = sorted[sorted.length - 1]!;
  return {
    test: "Kruskal-Wallis",
    statisticLabel: "H",
    statistic: h,
    reference: { kind: "chi2", df },
    tails: "derecha",
    pValue: p,
    alpha,
    significant: p < alpha,
    effect,
    interpretation: {
      headline: `Los valores de ${name} tienden a ser más bajos en «${bottom.label}» (mediana ${formatValue(bottom.median, d)}) y más altos en «${top.label}» (mediana ${formatValue(top.median, d)}). ${verdict(p, alpha, n, "una diferencia entre los grupos en la población", "todos sean iguales")}`,
      details: [
        effectSentence(effect),
        "Se usó Kruskal-Wallis, que compara el orden de los datos y no supone que se parezcan a una normal.",
      ],
      caveats: stats.some((g) => g.n < 5)
        ? ["Hay grupos con menos de 5 datos: el valor p del chi-cuadrado es orientativo."]
        : [],
    },
    steps: fiveSteps({
      h0: `todos los grupos tienen la misma distribución de ${name}`,
      h1: "al menos uno tiende a valores distintos",
      symbols: "H₀: misma distribución en todos    H₁: al menos uno distinto",
      statistic: {
        title: "Estadístico H",
        text: "Se ordenan todos los datos juntos y se compara el rango promedio de cada grupo con el de todos; se corrige por los empates.",
        formula: `H = [12 / (n(n + 1)) · Σ Rᵢ²/nᵢ − 3(n + 1)] / C = ${formatValue(raw, 4)} / ${formatValue(correction, 4)} = ${formatValue(h, 3)}, con ${df} gl`,
        table: {
          columns: ["Grupo", "n", "Mediana", "Rango promedio"],
          rows: stats.map((g) => [
            g.label,
            formatCount(g.n),
            formatValue(g.median, d),
            formatValue(g.sum / g.n, 2),
          ]),
        },
      },
      pFormula: `p = P(χ²(${df}) ≥ ${formatValue(h, 3)}) ${p4(p)}`,
      pExcel: `=DISTR.CHICUAD.CD(${formatValue(h, 4)}; ${df})`,
      p,
      alpha,
    }),
  };
}

const lnChoose = (n: number, k: number) => lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);

/**
 * ¿Una tabla 2×2 tiene alguna celda que espera menos de 5 casos? Ahí el
 * chi-cuadrado no es confiable y el selector usa la exacta de Fisher.
 */
export function fisherRecommended(observed: readonly (readonly number[])[]): boolean {
  if (observed.length !== 2 || observed.some((row) => row.length !== 2)) return false;
  const rows = observed.map((row) => row[0]! + row[1]!);
  const cols = [observed[0]![0]! + observed[1]![0]!, observed[0]![1]! + observed[1]![1]!];
  const total = rows[0]! + rows[1]!;
  if (total === 0) return false;
  return rows.some((r) => cols.some((c) => (r * c) / total < 5));
}

/**
 * Prueba exacta de Fisher para una tabla 2×2 (`fisher.test`): suma las
 * probabilidades hipergeométricas de las tablas tan raras o más que la
 * observada, con los totales fijos. «mayor»: la primera fila tiene más de la
 * primera columna que la segunda fila.
 */
export function fisherExact(
  observed: readonly (readonly number[])[],
  labels: {
    readonly rows: readonly [string, string];
    readonly columns: readonly [string, string];
    readonly rowName: string;
    readonly columnName: string;
  },
  { alpha = SIGNIFICANCE, alternative = "distinto" }: TestOptions = {},
): HypothesisTest | null {
  if (observed.length !== 2 || observed.some((row) => row.length !== 2)) return null;
  const [[a, b], [c, dd]] = observed as [[number, number], [number, number]];
  const m = a + c;
  const nn = b + dd;
  const k = a + b;
  if (a + b === 0 || c + dd === 0 || m === 0 || nn === 0) return null;
  const lo = Math.max(0, k - nn);
  const hi = Math.min(k, m);
  const lnDenominator = lnChoose(m + nn, k);
  const support = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const probs = support.map((x) => Math.exp(lnChoose(m, x) + lnChoose(nn, k - x) - lnDenominator));
  const pObs = probs[a - lo]!;
  let p: number;
  if (alternative === "mayor")
    p = probs.filter((_, i) => support[i]! >= a).reduce((s, q) => s + q, 0);
  else if (alternative === "menor")
    p = probs.filter((_, i) => support[i]! <= a).reduce((s, q) => s + q, 0);
  else p = probs.filter((q) => q <= pObs * (1 + 1e-7)).reduce((s, q) => s + q, 0);
  p = Math.min(1, p);
  const n = a + b + c + dd;
  const phi = (a * dd - b * c) / Math.sqrt((a + b) * (c + dd) * m * nn);
  const effect: EffectSize = { name: "φ", value: phi, size: sizeBy(phi, [0.1, 0.3, 0.5]) };
  const p1 = a / (a + b);
  const p2 = c / (c + dd);
  const odds = b * c === 0 ? Number.POSITIVE_INFINITY : (a * dd) / (b * c);
  const { rows, columns, rowName, columnName } = labels;
  const claim = sideText(
    alternative,
    `una relación entre ${rowName} y ${columnName}`,
    `más «${columns[0]}» en «${rows[0]}» que en «${rows[1]}» en la población`,
    `menos «${columns[0]}» en «${rows[0]}» que en «${rows[1]}» en la población`,
  );
  return {
    test: "Exacta de Fisher",
    statisticLabel: "OR",
    statistic: odds,
    reference: null,
    tails: TAILS[alternative],
    pValue: p,
    alpha,
    significant: p < alpha,
    effect,
    interpretation: {
      headline: `En «${rows[0]}» el ${formatShare(p1)} es «${columns[0]}» y en «${rows[1]}» el ${formatShare(p2)}. ${verdict(p, alpha, n, claim, alternative === "distinto" ? "no tengan relación" : "no lo sea")}`,
      details: [
        effectSentence(effect),
        "Se usó la prueba exacta de Fisher porque hay pocos casos: no depende de ninguna aproximación.",
      ],
      caveats: ["Que dos variables estén relacionadas no quiere decir que una cause la otra."],
    },
    steps: fiveSteps({
      h0: `${rowName} y ${columnName} no están relacionadas`,
      h1: sideText(
        alternative,
        "están relacionadas",
        `«${rows[0]}» tiene más «${columns[0]}»`,
        `«${rows[0]}» tiene menos «${columns[0]}»`,
      ),
      symbols: `H₀: OR = 1    H₁: OR ${H1_SIGN[alternative]} 1`,
      statistic: {
        title: "Probabilidad de cada tabla posible",
        text: "Con los totales de filas y columnas fijos, la probabilidad de cada tabla sale de la distribución hipergeométrica.",
        formula: `P(tabla observada) = C(${m}, ${a}) · C(${nn}, ${b}) / C(${n}, ${k}) = ${formatValue(pObs, 4)};  razón de momios de la muestra = ${Number.isFinite(odds) ? formatValue(odds, 3) : "∞"}`,
        table: {
          columns: ["", columns[0], columns[1]],
          rows: [
            [rows[0], formatCount(a), formatCount(b)],
            [rows[1], formatCount(c), formatCount(dd)],
          ],
        },
      },
      pFormula:
        alternative === "distinto"
          ? `p = Σ P(tablas con probabilidad ≤ ${formatValue(pObs, 4)}) ${p4(p)}`
          : `${pFormulaOf("X", formatCount(a), alternative)} ${p4(p)}`,
      p,
      alpha,
    }),
  };
}

/**
 * Prueba de relación entre dos variables de categorías con la regla del
 * selector: exacta de Fisher en una 2×2 con celdas que esperan menos de 5
 * casos y chi-cuadrado en lo demás.
 */
export function independenceTest(
  observed: readonly (readonly number[])[],
  rowLabels: readonly string[],
  columnLabels: readonly string[],
  rowName: string,
  columnName: string,
  alpha = SIGNIFICANCE,
): HypothesisTest | null {
  if (fisherRecommended(observed)) {
    return fisherExact(
      observed,
      {
        rows: [rowLabels[0] ?? "", rowLabels[1] ?? ""],
        columns: [columnLabels[0] ?? "", columnLabels[1] ?? ""],
        rowName,
        columnName,
      },
      { alpha },
    );
  }
  return chiSquareIndependence(observed, rowName, columnName, alpha);
}
