import { chiSquareCdf, fCdf, standardNormalCdf } from "../distributions/continuous";
import type { DistributionSpec } from "../distributions/probability";
import { tCdf, tTwoTailedP } from "../distributions/student-t";
import { studentizedRangeCdf } from "../distributions/studentized-range";
import { formatCount, formatShare, formatValue, narrativeDecimals } from "../interpretation/text";
import { negligibleSpread } from "../numeric/compare";
import { neumaierSum } from "../numeric/sum";
import { skewness } from "../shape/shape";
import type { CalculationStep, Interpretation, StepTable } from "../types";

/** Nivel de significancia por defecto. */
export const SIGNIFICANCE = 0.05;

/** Tamaño del efecto: cuánto importa la diferencia, no solo si existe. */
export interface EffectSize {
  readonly name: string;
  readonly value: number;
  readonly size: "muy pequeño" | "pequeño" | "mediano" | "grande";
}

/**
 * Hipótesis alternativa: «distinto» (dos colas) o una cola. En las pruebas de
 * dos grupos, «mayor» quiere decir que el primero es mayor que el segundo.
 */
export type Alternative = "distinto" | "mayor" | "menor";

/** Opciones comunes de las pruebas. */
export interface TestOptions {
  readonly alpha?: number;
  readonly alternative?: Alternative;
}

/** Resultado de una prueba de hipótesis. */
export interface HypothesisTest {
  readonly test: string;
  readonly statisticLabel: "t" | "z" | "F" | "χ²" | "W" | "V" | "H" | "S" | "OR";
  readonly statistic: number;
  /**
   * Distribución del estadístico si H₀ es cierta, para sombrear el valor p;
   * `null` en las pruebas exactas o de rangos, que no se dibujan así.
   */
  readonly reference: DistributionSpec | null;
  /** `dos`: |x| ≥ |estadístico|; `derecha`: x ≥ estadístico; `izquierda`: x ≤ estadístico. */
  readonly tails: "dos" | "derecha" | "izquierda";
  readonly pValue: number;
  readonly alpha: number;
  readonly significant: boolean;
  readonly effect: EffectSize | null;
  readonly interpretation: Interpretation;
  readonly steps: readonly CalculationStep[];
}

/** Par de grupos comparado con Tukey HSD. */
export interface TukeyPair {
  readonly a: string;
  readonly b: string;
  readonly difference: number;
  readonly pValue: number;
  readonly significant: boolean;
}

export interface AnovaTest extends HypothesisTest {
  readonly table: StepTable;
  readonly tukey: readonly TukeyPair[];
}

/** Grupo de datos con su nombre (ANOVA). */
export interface NamedGroup {
  readonly label: string;
  readonly values: readonly number[];
}

/** Valor p legible: `0,018` o `menos de 0,001`. */
export function formatP(p: number): string {
  return p < 0.001 ? "menos de 0,001" : formatValue(p, 3);
}

export const pText = (p: number): string => (p < 0.001 ? "p < 0,001" : `p = ${formatValue(p, 3)}`);

/** Valor p con 4 decimales para el paso a paso, sin «0,0000». */
export const p4 = (p: number): string => (p < 0.0001 ? "< 0,0001" : `= ${formatValue(p, 4)}`);

export const TAILS: Readonly<Record<Alternative, HypothesisTest["tails"]>> = {
  distinto: "dos",
  mayor: "derecha",
  menor: "izquierda",
};

/** Signo de H₁: ≠, > o <. */
export const H1_SIGN: Readonly<Record<Alternative, string>> = {
  distinto: "≠",
  mayor: ">",
  menor: "<",
};

/** Valor p de un estadístico t según la cola. */
function tP(t: number, df: number, alternative: Alternative): number {
  if (alternative === "mayor") return tCdf(-t, df);
  if (alternative === "menor") return tCdf(t, df);
  return tTwoTailedP(t, df);
}

/** Valor p de un estadístico z según la cola. */
export function zP(z: number, alternative: Alternative): number {
  if (alternative === "mayor") return standardNormalCdf(-z);
  if (alternative === "menor") return standardNormalCdf(z);
  return 2 * standardNormalCdf(-Math.abs(z));
}

/** «2 · P(T ≥ |t|)», «P(T ≥ t)» o «P(T ≤ t)» para el paso a paso. */
export function pFormulaOf(letter: string, value: string, alternative: Alternative): string {
  if (alternative === "mayor") return `p = P(${letter} ≥ ${value})`;
  if (alternative === "menor") return `p = P(${letter} ≤ ${value})`;
  return `p = 2 · P(${letter} ≥ |${value}|)`;
}

/** Fórmula de Excel de la cola de una t. */
function tExcel(t: number, df: number, alternative: Alternative): string {
  const v = formatValue(t, 4);
  if (alternative === "mayor") return `=DISTR.T.CD(${v}; ${df})`;
  if (alternative === "menor") return `=DISTR.T.N(${v}; ${df}; VERDADERO)`;
  return `=DISTR.T.2C(${formatValue(Math.abs(t), 4)}; ${df})`;
}

/** Fórmula de Excel de la cola de una z. */
function zExcel(z: number, alternative: Alternative): string {
  const v = formatValue(z, 4);
  if (alternative === "mayor") return `=1-DISTR.NORM.ESTAND.N(${v}; VERDADERO)`;
  if (alternative === "menor") return `=DISTR.NORM.ESTAND.N(${v}; VERDADERO)`;
  return `=2*(1-DISTR.NORM.ESTAND.N(${formatValue(Math.abs(z), 4)}; VERDADERO))`;
}

/** Texto de H₁ en llano según la cola. */
export function sideText(alternative: Alternative, two: string, greater: string, less: string) {
  return alternative === "mayor" ? greater : alternative === "menor" ? less : two;
}

export function sizeBy(value: number, cuts: readonly [number, number, number]): EffectSize["size"] {
  const v = Math.abs(value);
  if (v < cuts[0]) return "muy pequeño";
  if (v < cuts[1]) return "pequeño";
  if (v < cuts[2]) return "mediano";
  return "grande";
}

const cohenD = (value: number): EffectSize => ({
  name: "d de Cohen",
  value,
  size: sizeBy(value, [0.2, 0.5, 0.8]),
});

function meanSd(values: readonly number[]): { mean: number; sd: number } {
  const mean = neumaierSum(values) / values.length;
  const ss = neumaierSum(values.map((v) => (v - mean) ** 2));
  return { mean, sd: Math.sqrt(ss / (values.length - 1)) };
}

/** Grupos con pocos datos (menos de 30) y una forma muy cargada (|asimetría| ≥ 1). */
function doubtfulGroups(groups: readonly NamedGroup[]): NamedGroup[] {
  return groups.filter((g) => {
    const s = skewness(g.values).value;
    return g.values.length < 30 && s !== null && Math.abs(s) >= 1;
  });
}

/**
 * ¿Falla el supuesto de normalidad? El selector usa entonces la prueba de
 * rangos, que no lo necesita.
 */
export function normalityDoubtful(groups: readonly NamedGroup[]): boolean {
  return doubtfulGroups(groups).length > 0;
}

function normalityCaveat(groups: readonly NamedGroup[], alternative: string): string[] {
  const doubtful = doubtfulGroups(groups);
  if (doubtful.length > 0) {
    return [
      `${doubtful.map((g) => g.label).join(" y ")} tiene${doubtful.length > 1 ? "n" : ""} pocos datos y una forma muy cargada hacia un lado: la prueba supone datos parecidos a una normal. ${alternative}`,
    ];
  }
  if (groups.some((g) => g.values.length < 30)) {
    return [
      "Con menos de 30 datos por grupo la prueba supone que los datos se parecen a una normal.",
    ];
  }
  return [];
}

export interface Script {
  readonly h0: string;
  readonly h1: string;
  readonly symbols: string;
  readonly statistic: CalculationStep;
  readonly pFormula: string;
  readonly pExcel?: string;
  readonly p: number;
  readonly alpha: number;
}

/** Guion de 5 pasos de la clase: hipótesis, α, estadístico, valor p, decisión. */
export function fiveSteps(script: Script): CalculationStep[] {
  const a = formatValue(script.alpha, 2);
  const reject = script.p < script.alpha;
  return [
    {
      title: "1. Hipótesis",
      text: `H₀ (no pasa nada): ${script.h0}. H₁ (lo que se quiere probar): ${script.h1}.`,
      formula: script.symbols,
    },
    {
      title: "2. Nivel de significancia",
      text: "El riesgo que se acepta de ver una diferencia que en realidad no existe.",
      formula: `α = ${a}`,
    },
    { ...script.statistic, title: `3. ${script.statistic.title}` },
    {
      title: "4. Valor p",
      text: "La probabilidad de obtener un resultado tan extremo o más si H₀ fuera cierta.",
      formula: script.pFormula,
      ...(script.pExcel !== undefined ? { excel: script.pExcel } : {}),
    },
    {
      title: "5. Decisión",
      text: reject
        ? "El valor p es menor que α: se rechaza H₀."
        : "El valor p no es menor que α: no se rechaza H₀ (lo que no prueba que H₀ sea cierta).",
      formula: `${pText(script.p)} y α = ${a} → ${reject ? "p < α: se rechaza H₀" : "p ≥ α: no se rechaza H₀"}`,
    },
  ];
}

/** Frase de decisión en llano. */
export function verdict(
  p: number,
  alpha: number,
  n: number,
  claim: string,
  notMeaning: string,
): string {
  return p < alpha
    ? `Con ${pText(p)}, es poco probable que sea casualidad: hay evidencia de ${claim}.`
    : `Con ${pText(p)}, eso podría deberse al azar: con estos ${formatCount(n)} datos no hay evidencia suficiente de ${claim}. No significa que ${notMeaning}.`;
}

export const effectSentence = (effect: EffectSize): string =>
  `Tamaño del efecto: ${effect.name} = ${formatValue(effect.value, 2)} (${effect.size}). Que sea significativo no quiere decir que sea importante; esto mide cuánto.`;

/** t de una muestra: ¿el promedio es distinto de μ₀? (`PRUEBA.T` contra un valor). */
export function oneSampleT(
  values: readonly number[],
  mu0: number,
  name: string,
  { alpha = SIGNIFICANCE, alternative = "distinto" }: TestOptions = {},
): HypothesisTest | null {
  const n = values.length;
  if (n < 2) return null;
  const { mean, sd } = meanSd(values);
  const se = sd / Math.sqrt(n);
  if (negligibleSpread(se, mean, mu0)) return null;
  const t = (mean - mu0) / se;
  const df = n - 1;
  const p = tP(t, df, alternative);
  const d = narrativeDecimals(values);
  const f = (v: number) => formatValue(v, d);
  const effect = cohenD((mean - mu0) / sd);
  const direction = mean > mu0 ? "mayor" : "menor";
  const claim = sideText(
    alternative,
    `una diferencia entre el promedio de la población y ${f(mu0)}`,
    `un promedio mayor que ${f(mu0)} en la población`,
    `un promedio menor que ${f(mu0)} en la población`,
  );
  return {
    test: "t de una muestra",
    statisticLabel: "t",
    statistic: t,
    reference: { kind: "t", df },
    tails: TAILS[alternative],
    pValue: p,
    alpha,
    significant: p < alpha,
    effect,
    interpretation: {
      headline: `El promedio de ${name} es ${f(mean)}, ${direction} que ${f(mu0)}. ${verdict(p, alpha, n, claim, alternative === "distinto" ? `sea igual a ${f(mu0)}` : "no lo sea")}`,
      details: [effectSentence(effect)],
      caveats: normalityCaveat([{ label: name, values }], "La prueba del signo sería más segura."),
    },
    steps: fiveSteps({
      h0: `el promedio de ${name} en la población es ${f(mu0)}`,
      h1: sideText(
        alternative,
        `es distinto de ${f(mu0)}`,
        `es mayor que ${f(mu0)}`,
        `es menor que ${f(mu0)}`,
      ),
      symbols: `H₀: μ = ${f(mu0)}    H₁: μ ${H1_SIGN[alternative]} ${f(mu0)}`,
      statistic: {
        title: "Estadístico t",
        text: `Cuántos errores estándar separan el promedio de la muestra del valor de H₀, con n − 1 = ${formatCount(df)} grados de libertad.`,
        formula: `t = (x̄ − μ₀) / (s / √n) = (${f(mean)} − ${f(mu0)}) / (${formatValue(sd, d + 1)} / √${formatCount(n)}) = ${formatValue(t, 3)}`,
      },
      pFormula: `${pFormulaOf("T", formatValue(t, 3), alternative)} ${p4(p)}`,
      pExcel: tExcel(t, df, alternative),
      p,
      alpha,
    }),
  };
}

/**
 * Dos grupos independientes: t de Welch (por defecto, no supone varianzas
 * iguales) o de Student con varianza combinada (`PRUEBA.T(…; 2; 3|2)`).
 */
export function twoSampleT(
  a: NamedGroup,
  b: NamedGroup,
  name: string,
  {
    alpha = SIGNIFICANCE,
    alternative = "distinto",
    equalVariances = false,
  }: TestOptions & { readonly equalVariances?: boolean } = {},
): HypothesisTest | null {
  const n1 = a.values.length;
  const n2 = b.values.length;
  if (n1 < 2 || n2 < 2) return null;
  const s1 = meanSd(a.values);
  const s2 = meanSd(b.values);
  const v1 = s1.sd ** 2 / n1;
  const v2 = s2.sd ** 2 / n2;
  let se: number;
  let df: number;
  let seFormula: string;
  const all = [...a.values, ...b.values];
  const d = narrativeDecimals(all);
  const f = (v: number) => formatValue(v, d);
  if (equalVariances) {
    const sp2 = ((n1 - 1) * s1.sd ** 2 + (n2 - 1) * s2.sd ** 2) / (n1 + n2 - 2);
    se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    df = n1 + n2 - 2;
    seFormula = `EE = √(s²ₚ · (1/n₁ + 1/n₂)), s²ₚ = ${formatValue(sp2, d + 2)} → EE = ${formatValue(se, d + 2)}`;
  } else {
    se = Math.sqrt(v1 + v2);
    df = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1));
    seFormula = `EE = √(s₁²/n₁ + s₂²/n₂) = √(${formatValue(s1.sd, d + 1)}²/${n1} + ${formatValue(s2.sd, d + 1)}²/${n2}) = ${formatValue(se, d + 2)}; gl de Welch = ${formatValue(df, 2)}`;
  }
  if (negligibleSpread(se, s1.mean, s2.mean)) return null;
  const diff = s1.mean - s2.mean;
  const t = diff / se;
  const p = tP(t, df, alternative);
  const effect = cohenD(diff / Math.sqrt((s1.sd ** 2 + s2.sd ** 2) / 2));
  const higher = diff >= 0 ? a.label : b.label;
  const claim = sideText(
    alternative,
    "una diferencia entre los promedios de los dos grupos en la población",
    `un promedio mayor en «${a.label}» que en «${b.label}» en la población`,
    `un promedio menor en «${a.label}» que en «${b.label}» en la población`,
  );
  return {
    test: equalVariances ? "t de Student (varianzas iguales)" : "t de Welch",
    statisticLabel: "t",
    statistic: t,
    reference: { kind: "t", df },
    tails: TAILS[alternative],
    pValue: p,
    alpha,
    significant: p < alpha,
    effect,
    interpretation: {
      headline: `«${higher}» tiene en promedio ${f(Math.abs(diff))} más de ${name} (${f(s1.mean)} en «${a.label}» y ${f(s2.mean)} en «${b.label}»). ${verdict(p, alpha, n1 + n2, claim, alternative === "distinto" ? "sean iguales" : "no lo sea")}`,
      details: [
        effectSentence(effect),
        equalVariances
          ? "Se usó la t de Student, que supone que los dos grupos varían lo mismo."
          : "Se usó la t de Welch, que no supone que los dos grupos varíen lo mismo (la opción segura).",
      ],
      caveats: normalityCaveat([a, b], "Una prueba de Mann-Whitney sería más segura."),
    },
    steps: fiveSteps({
      h0: `los dos grupos tienen el mismo promedio de ${name}`,
      h1: sideText(
        alternative,
        "los promedios son distintos",
        `el promedio de «${a.label}» es mayor`,
        `el promedio de «${a.label}» es menor`,
      ),
      symbols: `H₀: μ₁ = μ₂    H₁: μ₁ ${H1_SIGN[alternative]} μ₂`,
      statistic: {
        title: "Estadístico t",
        text: "La diferencia de promedios dividida entre su error estándar.",
        formula: `${seFormula}\nt = (x̄₁ − x̄₂) / EE = (${f(s1.mean)} − ${f(s2.mean)}) / ${formatValue(se, d + 2)} = ${formatValue(t, 3)}`,
        table: {
          columns: ["Grupo", "n", "Promedio", "Desviación"],
          rows: [
            [a.label, formatCount(n1), f(s1.mean), formatValue(s1.sd, d + 1)],
            [b.label, formatCount(n2), f(s2.mean), formatValue(s2.sd, d + 1)],
          ],
        },
      },
      pFormula: `${pFormulaOf("T", formatValue(t, 3), alternative)} con ${formatValue(df, 2)} gl ${p4(p)}`,
      // Con una cola, PRUEBA.T da la cola del lado observado: si la diferencia va al revés, p = 1 − ese valor.
      pExcel:
        alternative === "distinto"
          ? `=PRUEBA.T(grupo1; grupo2; 2; ${equalVariances ? 2 : 3})`
          : `=PRUEBA.T(grupo1; grupo2; 1; ${equalVariances ? 2 : 3})${(alternative === "mayor") === t >= 0 ? "" : " (y p = 1 − ese valor, porque la diferencia va al revés)"}`,
      p,
      alpha,
    }),
  };
}

/** t pareada: ¿cambió entre antes y después? (`PRUEBA.T(…; 2; 1)`). */
export function pairedT(
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
  const n = differences.length;
  if (n < 2) return null;
  const { mean, sd } = meanSd(differences);
  const se = sd / Math.sqrt(n);
  const scale = (values: readonly number[]) =>
    values.length === 0 ? 0 : neumaierSum(values) / values.length;
  if (negligibleSpread(se, mean, scale(before), scale(after))) return null;
  const t = mean / se;
  const df = n - 1;
  const p = tP(t, df, alternative);
  const d = narrativeDecimals([...before, ...after]);
  const f = (v: number) => formatValue(v, d);
  const effect = cohenD(mean / sd);
  return {
    test: "t pareada",
    statisticLabel: "t",
    statistic: t,
    reference: { kind: "t", df },
    tails: TAILS[alternative],
    pValue: p,
    alpha,
    significant: p < alpha,
    effect,
    interpretation: {
      headline: `De ${nameBefore} a ${nameAfter} el valor ${mean >= 0 ? "sube" : "baja"} en promedio ${f(Math.abs(mean))}. ${verdict(p, alpha, n, sideText(alternative, "un cambio real", "una subida real", "una bajada real"), alternative === "distinto" ? "no haya cambiado nada" : "no lo haya")}`,
      details: [
        effectSentence(effect),
        `Se comparan ${formatCount(n)} pares: cada caso con él mismo, así lo que varía entre personas no estorba.`,
      ],
      caveats: normalityCaveat(
        [{ label: "Las diferencias", values: differences }],
        "Una prueba de Wilcoxon de rangos con signo sería más segura.",
      ),
    },
    steps: fiveSteps({
      h0: "en promedio no hay cambio (la diferencia media es 0)",
      h1: sideText(alternative, "hay cambio", "el valor sube", "el valor baja"),
      symbols: `H₀: μ_d = 0    H₁: μ_d ${H1_SIGN[alternative]} 0`,
      statistic: {
        title: "Estadístico t de las diferencias",
        text: `Se calcula la diferencia de cada par (${nameAfter} − ${nameBefore}) y se prueba si su promedio es 0.`,
        formula: `t = d̄ / (s_d / √n) = ${f(mean)} / (${formatValue(sd, d + 1)} / √${formatCount(n)}) = ${formatValue(t, 3)}`,
      },
      pFormula: `${pFormulaOf("T", formatValue(t, 3), alternative)} con ${df} gl ${p4(p)}`,
      pExcel:
        alternative === "distinto" ? "=PRUEBA.T(antes; después; 2; 1)" : tExcel(t, df, alternative),
      p,
      alpha,
    }),
  };
}

/**
 * ¿Algún grupo espera menos de 5 «sí» o «no» con la proporción combinada? Ahí
 * la aproximación normal falla y el selector usa la exacta de Fisher.
 */
export function fewExpectedInTwoGroups(
  a: { readonly successes: number; readonly n: number },
  b: { readonly successes: number; readonly n: number },
): boolean {
  const pooled = (a.successes + b.successes) / (a.n + b.n);
  return [a, b].some((g) => g.n * pooled < 5 || g.n * (1 - pooled) < 5);
}

const cohenH = (p1: number, p2: number): EffectSize => {
  const value = 2 * Math.asin(Math.sqrt(p1)) - 2 * Math.asin(Math.sqrt(p2));
  return { name: "h de Cohen", value, size: sizeBy(value, [0.2, 0.5, 0.8]) };
};

/** z de una proporción: ¿el porcentaje es distinto de p₀? */
export function oneProportionZ(
  successes: number,
  n: number,
  p0: number,
  label: string,
  { alpha = SIGNIFICANCE, alternative = "distinto" }: TestOptions = {},
): HypothesisTest | null {
  if (n < 1 || successes < 0 || successes > n || p0 <= 0 || p0 >= 1) return null;
  const p = successes / n;
  const se = Math.sqrt((p0 * (1 - p0)) / n);
  const z = (p - p0) / se;
  const pValue = zP(z, alternative);
  const effect = cohenH(p, p0);
  const caveats =
    n * p0 < 5 || n * (1 - p0) < 5
      ? [
          `Con ${formatCount(n)} datos la aproximación normal no es confiable (n·p₀ o n·(1 − p₀) es menor que 5); una prueba binomial exacta sería mejor.`,
        ]
      : [];
  return {
    test: "z de una proporción",
    statisticLabel: "z",
    statistic: z,
    reference: { kind: "normal", mean: 0, sd: 1 },
    tails: TAILS[alternative],
    pValue,
    alpha,
    significant: pValue < alpha,
    effect,
    interpretation: {
      headline: `El ${formatShare(p)} de la muestra es ${label} (${formatCount(successes)} de ${formatCount(n)}), frente al ${formatShare(p0)} de referencia. ${verdict(
        pValue,
        alpha,
        n,
        sideText(
          alternative,
          `una diferencia entre el porcentaje de la población y el ${formatShare(p0)}`,
          `un porcentaje mayor que el ${formatShare(p0)} en la población`,
          `un porcentaje menor que el ${formatShare(p0)} en la población`,
        ),
        alternative === "distinto" ? "sea igual" : "no lo sea",
      )}`,
      details: [effectSentence(effect)],
      caveats,
    },
    steps: fiveSteps({
      h0: `el porcentaje en la población es ${formatShare(p0)}`,
      h1: sideText(alternative, "es distinto", "es mayor", "es menor"),
      symbols: `H₀: p = ${formatValue(p0, 3)}    H₁: p ${H1_SIGN[alternative]} ${formatValue(p0, 3)}`,
      statistic: {
        title: "Estadístico z",
        formula: `z = (p̂ − p₀) / √(p₀(1 − p₀)/n) = (${formatValue(p, 4)} − ${formatValue(p0, 3)}) / √(${formatValue(p0, 3)} · ${formatValue(1 - p0, 3)} / ${formatCount(n)}) = ${formatValue(z, 3)}`,
      },
      pFormula: `${pFormulaOf("Z", formatValue(z, 3), alternative)} ${p4(pValue)}`,
      pExcel: zExcel(z, alternative),
      p: pValue,
      alpha,
    }),
  };
}

/** z de dos proporciones con proporción combinada. */
export function twoProportionZ(
  a: { readonly label: string; readonly successes: number; readonly n: number },
  b: { readonly label: string; readonly successes: number; readonly n: number },
  outcome: string,
  { alpha = SIGNIFICANCE, alternative = "distinto" }: TestOptions = {},
): HypothesisTest | null {
  if (a.n < 1 || b.n < 1) return null;
  const p1 = a.successes / a.n;
  const p2 = b.successes / b.n;
  const pooled = (a.successes + b.successes) / (a.n + b.n);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.n + 1 / b.n));
  if (se === 0) return null;
  const z = (p1 - p2) / se;
  const pValue = zP(z, alternative);
  const effect = cohenH(p1, p2);
  const small = fewExpectedInTwoGroups(a, b);
  return {
    test: "z de dos proporciones",
    statisticLabel: "z",
    statistic: z,
    reference: { kind: "normal", mean: 0, sd: 1 },
    tails: TAILS[alternative],
    pValue,
    alpha,
    significant: pValue < alpha,
    effect,
    interpretation: {
      headline: `En «${a.label}» el ${formatShare(p1)} es ${outcome} y en «${b.label}» el ${formatShare(p2)}. ${verdict(
        pValue,
        alpha,
        a.n + b.n,
        sideText(
          alternative,
          "una diferencia entre los dos porcentajes en la población",
          `un porcentaje mayor en «${a.label}» que en «${b.label}» en la población`,
          `un porcentaje menor en «${a.label}» que en «${b.label}» en la población`,
        ),
        alternative === "distinto" ? "sean iguales" : "no lo sea",
      )}`,
      details: [effectSentence(effect)],
      caveats: small
        ? [
            "Hay pocos casos en algún grupo: la aproximación normal es orientativa (la prueba exacta de Fisher sería mejor).",
          ]
        : [],
    },
    steps: fiveSteps({
      h0: "los dos grupos tienen el mismo porcentaje",
      h1: sideText(
        alternative,
        "los porcentajes son distintos",
        `el de «${a.label}» es mayor`,
        `el de «${a.label}» es menor`,
      ),
      symbols: `H₀: p₁ = p₂    H₁: p₁ ${H1_SIGN[alternative]} p₂`,
      statistic: {
        title: "Estadístico z",
        text: "Con la proporción combinada de los dos grupos, la que valdría para ambos si H₀ fuera cierta.",
        formula: `p̄ = (${a.successes} + ${b.successes}) / (${a.n} + ${b.n}) = ${formatValue(pooled, 4)}\nz = (p̂₁ − p̂₂) / √(p̄(1 − p̄)(1/n₁ + 1/n₂)) = (${formatValue(p1, 4)} − ${formatValue(p2, 4)}) / ${formatValue(se, 4)} = ${formatValue(z, 3)}`,
      },
      pFormula: `${pFormulaOf("Z", formatValue(z, 3), alternative)} ${p4(pValue)}`,
      pExcel: zExcel(z, alternative),
      p: pValue,
      alpha,
    }),
  };
}

/** ANOVA de un factor con Tukey HSD: ¿tres o más grupos difieren en promedio? */
export function oneWayAnova(
  groups: readonly NamedGroup[],
  name: string,
  alpha = SIGNIFICANCE,
): AnovaTest | null {
  const used = groups.filter((g) => g.values.length >= 1);
  const k = used.length;
  const all = used.flatMap((g) => [...g.values]);
  const n = all.length;
  if (k < 2 || n - k < 1) return null;
  const grand = neumaierSum(all) / n;
  const stats = used.map((g) => {
    const mean = neumaierSum(g.values) / g.values.length;
    const ss = neumaierSum(g.values.map((v) => (v - mean) ** 2));
    return { label: g.label, n: g.values.length, mean, ss };
  });
  const ssb = neumaierSum(stats.map((s) => s.n * (s.mean - grand) ** 2));
  const ssw = neumaierSum(stats.map((s) => s.ss));
  // Grupos sin variación interna (con margen para el redondeo): F no tiene sentido.
  if (ssw <= 1e-24 * neumaierSum(all.map((v) => v * v)) || ssw === 0) return null;
  const dfb = k - 1;
  const dfw = n - k;
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  const F = msb / msw;
  const p = 1 - fCdf(F, dfb, dfw);
  const eta = ssb / (ssb + ssw);
  const effect: EffectSize = { name: "η²", value: eta, size: sizeBy(eta, [0.01, 0.06, 0.14]) };
  const d = narrativeDecimals(all);
  const f = (v: number) => formatValue(v, d);

  const tukey: TukeyPair[] = [];
  for (let i = 0; i < k; i += 1) {
    for (let j = i + 1; j < k; j += 1) {
      const si = stats[i]!;
      const sj = stats[j]!;
      const difference = sj.mean - si.mean;
      const q = Math.abs(difference) / Math.sqrt((msw / 2) * (1 / si.n + 1 / sj.n));
      const pValue = 1 - studentizedRangeCdf(q, k, dfw);
      tukey.push({ a: si.label, b: sj.label, difference, pValue, significant: pValue < alpha });
    }
  }

  const sorted = [...stats].sort((x, y) => y.mean - x.mean);
  const top = sorted[0]!;
  const bottom = sorted[sorted.length - 1]!;
  const realPairs = tukey.filter((pair) => pair.significant);
  const details = [effectSentence(effect)];
  if (p < alpha) {
    details.push(
      realPairs.length > 0
        ? `Comparando de a pares (Tukey), las diferencias claras están entre ${realPairs.map((pair) => `«${pair.a}» y «${pair.b}»`).join("; ")}.`
        : "Comparando de a pares (Tukey) ninguna pareja sale clara por sí sola: la diferencia está repartida.",
    );
  }
  const sds = stats.filter((s) => s.n >= 2).map((s) => Math.sqrt(s.ss / (s.n - 1)));
  const caveats = normalityCaveat(used, "La prueba de Kruskal-Wallis sería más segura.");
  if (sds.length >= 2 && Math.max(...sds) > 2 * Math.min(...sds)) {
    caveats.push(
      "Un grupo varía más del doble que otro: el ANOVA supone variaciones parecidas, así que el valor p es orientativo.",
    );
  }
  const table: StepTable = {
    columns: ["Fuente", "Suma de cuadrados", "gl", "Cuadrado medio", "F"],
    rows: [
      ["Entre grupos", formatValue(ssb, 4), String(dfb), formatValue(msb, 4), formatValue(F, 3)],
      ["Dentro de los grupos", formatValue(ssw, 4), String(dfw), formatValue(msw, 4), ""],
      ["Total", formatValue(ssb + ssw, 4), String(n - 1), "", ""],
    ],
  };
  return {
    test: "ANOVA de un factor",
    statisticLabel: "F",
    statistic: F,
    reference: { kind: "f", d1: dfb, d2: dfw },
    tails: "derecha",
    pValue: p,
    alpha,
    significant: p < alpha,
    effect,
    table,
    tukey,
    interpretation: {
      headline: `El promedio de ${name} va de ${f(bottom.mean)} en «${bottom.label}» a ${f(top.mean)} en «${top.label}». ${verdict(p, alpha, n, "una diferencia entre los promedios de los grupos", "todos sean iguales")}`,
      details,
      caveats,
    },
    steps: fiveSteps({
      h0: `todos los grupos tienen el mismo promedio de ${name}`,
      h1: "al menos uno es distinto",
      symbols: `H₀: μ₁ = … = μ${k === 2 ? "₂" : "ₖ"}    H₁: no todas las medias son iguales`,
      statistic: {
        title: "Estadístico F",
        text: "Compara cuánto se separan los promedios de los grupos con cuánto varían los datos dentro de cada grupo.",
        formula: `SC entre = Σ nᵢ(x̄ᵢ − x̄)² = ${formatValue(ssb, 4)};  SC dentro = Σ Σ (x − x̄ᵢ)² = ${formatValue(ssw, 4)}\nF = (SC entre / ${dfb}) / (SC dentro / ${dfw}) = ${formatValue(msb, 4)} / ${formatValue(msw, 4)} = ${formatValue(F, 3)}`,
        table,
      },
      pFormula: `p = P(F(${dfb}; ${dfw}) ≥ ${formatValue(F, 3)}) ${p4(p)}`,
      pExcel: `=DISTR.F.CD(${formatValue(F, 4)}; ${dfb}; ${dfw})`,
      p,
      alpha,
    }),
  };
}

/** Chi-cuadrado de independencia sobre una tabla de conteos, con V de Cramér. */
export function chiSquareIndependence(
  observed: readonly (readonly number[])[],
  rowName: string,
  columnName: string,
  alpha = SIGNIFICANCE,
): HypothesisTest | null {
  const rowTotals = observed.map((row) => neumaierSum(row));
  const rows = observed.filter((_, i) => rowTotals[i]! > 0);
  const r = rows.length;
  const c0 = observed[0]?.length ?? 0;
  const columnTotalsAll = Array.from({ length: c0 }, (_, j) =>
    neumaierSum(rows.map((row) => row[j] ?? 0)),
  );
  const keep = columnTotalsAll.map((total) => total > 0);
  const table = rows.map((row) => row.filter((_, j) => keep[j]));
  const columnTotals = columnTotalsAll.filter((_, j) => keep[j]);
  const c = columnTotals.length;
  if (r < 2 || c < 2) return null;
  const rt = table.map((row) => neumaierSum(row));
  const total = neumaierSum(rt);
  let chi2 = 0;
  let below5 = 0;
  let below1 = false;
  table.forEach((row, i) =>
    row.forEach((o, j) => {
      const e = (rt[i]! * columnTotals[j]!) / total;
      chi2 += (o - e) ** 2 / e;
      if (e < 5) below5 += 1;
      if (e < 1) below1 = true;
    }),
  );
  const df = (r - 1) * (c - 1);
  const p = 1 - chiSquareCdf(chi2, df);
  const v = Math.sqrt(chi2 / (total * Math.min(r - 1, c - 1)));
  // ponytail: umbrales de Cohen para gl* = 1; con tablas grandes son algo exigentes.
  const effect: EffectSize = { name: "V de Cramér", value: v, size: sizeBy(v, [0.1, 0.3, 0.5]) };
  const caveats: string[] = [];
  if (below1 || below5 / (r * c) > 0.2) {
    caveats.push(
      `${formatCount(below5)} de ${formatCount(r * c)} celdas esperan menos de 5 casos: la prueba no es confiable así. Junta categorías con pocos casos${r === 2 && c === 2 ? " o usa la prueba exacta de Fisher" : ""}.`,
    );
  }
  caveats.push("Que dos variables estén relacionadas no quiere decir que una cause la otra.");
  return {
    test: "Chi-cuadrado de independencia",
    statisticLabel: "χ²",
    statistic: chi2,
    reference: { kind: "chi2", df },
    tails: "derecha",
    pValue: p,
    alpha,
    significant: p < alpha,
    effect,
    interpretation: {
      headline:
        p < alpha
          ? `${rowName} y ${columnName} están relacionadas: con ${pText(p)}, las diferencias entre los porcentajes de la tabla son demasiado grandes para ser casualidad.`
          : `Con ${pText(p)}, las diferencias de la tabla podrían deberse al azar: con estos ${formatCount(total)} datos no hay evidencia de que ${rowName} y ${columnName} estén relacionadas. No significa que sean independientes.`,
      details: [effectSentence(effect)],
      caveats,
    },
    steps: fiveSteps({
      h0: `${rowName} y ${columnName} son independientes`,
      h1: "están relacionadas",
      symbols: "H₀: independientes    H₁: relacionadas",
      statistic: {
        title: "Estadístico chi-cuadrado",
        text: "Para cada celda se compara lo observado (O) con lo esperado si no hubiera relación: E = total de la fila × total de la columna / total.",
        formula: `χ² = Σ (O − E)² / E = ${formatValue(chi2, 3)}, con (${r} − 1)(${c} − 1) = ${df} gl`,
      },
      pFormula: `p = P(χ²(${df}) ≥ ${formatValue(chi2, 3)}) ${p4(p)}`,
      pExcel: "=PRUEBA.CHICUAD(observados; esperados)",
      p,
      alpha,
    }),
  };
}
