import { standardNormalQuantile } from "../distributions/continuous";
import { tQuantile } from "../distributions/student-t";
import { formatCount, formatShare, formatValue, narrativeDecimals } from "../interpretation/text";
import { negligibleSpread } from "../numeric/compare";
import { neumaierSum } from "../numeric/sum";
import { welford } from "../numeric/welford";
import { skewness } from "../shape/shape";
import type { CalculationStep, Interpretation } from "../types";

/** Un intervalo de confianza con su lectura y su cálculo. */
export interface ConfidenceInterval {
  readonly estimate: number;
  readonly lower: number;
  readonly upper: number;
  readonly level: number;
  readonly interpretation: Interpretation;
  readonly steps: readonly CalculationStep[];
}

const pct = (level: number): string => `${formatValue(level * 100, 0)} %`;

/**
 * IC para la media con la t de Student: x̄ ± t(α/2; n − 1) · s / √n
 * (`INTERVALO.CONFIANZA.T`). Advierte si n < 30 y los datos parecen asimétricos.
 */
export function meanInterval(
  values: readonly number[],
  name: string,
  level = 0.95,
): ConfidenceInterval | null {
  const n = values.length;
  const stats = welford(values);
  if (n < 2 || stats === null) return null;
  const mean = neumaierSum(values) / n;
  const sd = Math.sqrt(stats.m2 / (n - 1));
  const se = sd / Math.sqrt(n);
  // Sin variación no hay incertidumbre que estimar: el intervalo sería un punto.
  if (negligibleSpread(se, mean)) return null;
  const t = tQuantile(1 - (1 - level) / 2, n - 1);
  const margin = t * se;
  const d = narrativeDecimals(values);
  const f = (v: number) => formatValue(v, d);
  const caveats: string[] = [];
  const g = skewness(values).value;
  if (n < 30 && g !== null && Math.abs(g) >= 1) {
    caveats.push(
      `Con ${formatCount(n)} datos y una forma muy cargada hacia un lado (asimetría ${formatValue(g, 2)}), el intervalo puede no ser confiable: el método supone datos parecidos a una normal.`,
    );
  } else if (n < 30) {
    caveats.push(
      `Con menos de 30 datos el método supone que ${name} se parece a una normal en la población.`,
    );
  }
  caveats.push(
    "El intervalo habla del promedio de la población, no de cada caso: muchos datos individuales caen fuera.",
  );
  return {
    estimate: mean,
    lower: mean - margin,
    upper: mean + margin,
    level,
    interpretation: {
      headline: `Con un método que acierta el ${pct(level)} de las veces, el promedio de ${name} en toda la población está entre ${f(mean - margin)} y ${f(mean + margin)}.`,
      details: [
        `El promedio de la muestra es ${f(mean)}; el margen de error es ± ${f(margin)}.`,
        "Más datos lo hacen más angosto: el margen se reduce a la mitad con cuatro veces más datos.",
      ],
      caveats,
    },
    steps: [
      {
        title: "1. Error estándar de la media",
        text: "Cuánto variaría el promedio de una muestra a otra.",
        formula: `EE = s / √n = ${formatValue(sd, d + 1)} / √${formatCount(n)} = ${formatValue(se, d + 2)}`,
      },
      {
        title: "2. Valor crítico t",
        text: `El valor de la t de Student con n − 1 = ${formatCount(n - 1)} grados de libertad que deja ${pct(level)} en el centro.`,
        formula: `t = ${formatValue(t, 4)}`,
        excel: `=INV.T.2C(${formatValue(1 - level, 2)}; ${n - 1})`,
      },
      {
        title: "3. Intervalo",
        formula: `x̄ ± t · EE = ${f(mean)} ± ${formatValue(t, 4)} · ${formatValue(se, d + 2)} = ${f(mean)} ± ${f(margin)} → [${f(mean - margin)}; ${f(mean + margin)}]`,
        excel: `=PROMEDIO(rango) ± INTERVALO.CONFIANZA.T(${formatValue(1 - level, 2)}; DESVEST.M(rango); CONTAR(rango))`,
      },
    ],
  };
}

/** Intervalo de Wilson para una proporción (más estable que Wald con n pequeño). */
export function wilson(
  successes: number,
  n: number,
  level = 0.95,
): { lower: number; upper: number } {
  const z = standardNormalQuantile(1 - (1 - level) / 2);
  const p = successes / n;
  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
  return { lower: Math.max(0, center - half), upper: Math.min(1, center + half) };
}

/** IC de Wilson para la proporción de una categoría. */
export function proportionInterval(
  successes: number,
  n: number,
  label: string,
  level = 0.95,
): ConfidenceInterval | null {
  if (n < 1 || successes < 0 || successes > n) return null;
  const p = successes / n;
  const { lower, upper } = wilson(successes, n, level);
  const z = standardNormalQuantile(1 - (1 - level) / 2);
  const caveats =
    successes < 5 || n - successes < 5
      ? ["Hay muy pocos casos de un lado: el intervalo es orientativo."]
      : [];
  return {
    estimate: p,
    lower,
    upper,
    level,
    interpretation: {
      headline: `Con un método que acierta el ${pct(level)} de las veces, entre el ${formatShare(lower)} y el ${formatShare(upper)} de toda la población es ${label}.`,
      details: [
        `En la muestra es el ${formatShare(p)} (${formatCount(successes)} de ${formatCount(n)}).`,
        "Se usa el intervalo de Wilson: con muestras pequeñas o porcentajes cerca de 0 o 100 no se sale del rango posible, como sí le pasa al método clásico.",
      ],
      caveats,
    },
    steps: [
      {
        title: "1. Proporción de la muestra",
        formula: `p̂ = ${formatCount(successes)} / ${formatCount(n)} = ${formatValue(p, 4)}`,
      },
      {
        title: "2. Intervalo de Wilson",
        text: `Con z = ${formatValue(z, 3)} (el ${pct(level)} central de la normal estándar).`,
        formula: `centro = (p̂ + z²/2n) / (1 + z²/n);  semiancho = z·√(p̂(1 − p̂)/n + z²/4n²) / (1 + z²/n)\n→ [${formatValue(lower, 4)}; ${formatValue(upper, 4)}]`,
      },
    ],
  };
}

/**
 * IC para la diferencia de dos medias (Welch, sin suponer varianzas iguales).
 */
export function meanDifferenceInterval(
  a: readonly number[],
  b: readonly number[],
  nameA: string,
  nameB: string,
  variable: string,
  level = 0.95,
): ConfidenceInterval | null {
  const sa = welford(a);
  const sb = welford(b);
  if (a.length < 2 || b.length < 2 || sa === null || sb === null) return null;
  const va = sa.m2 / (a.length - 1);
  const vb = sb.m2 / (b.length - 1);
  const ma = neumaierSum(a) / a.length;
  const mb = neumaierSum(b) / b.length;
  const qa = va / a.length;
  const qb = vb / b.length;
  const se = Math.sqrt(qa + qb);
  if (negligibleSpread(se, ma, mb)) return null;
  const df = (qa + qb) ** 2 / (qa ** 2 / (a.length - 1) + qb ** 2 / (b.length - 1));
  const t = tQuantile(1 - (1 - level) / 2, df);
  const diff = ma - mb;
  const d = narrativeDecimals([...a, ...b]);
  const f = (v: number) => formatValue(v, d);
  const lower = diff - t * se;
  const upper = diff + t * se;
  const crosses = lower <= 0 && upper >= 0;
  return {
    estimate: diff,
    lower,
    upper,
    level,
    interpretation: {
      headline: `Con un método que acierta el ${pct(level)} de las veces, el promedio de ${variable} en «${nameA}» menos el de «${nameB}» está entre ${f(lower)} y ${f(upper)}.`,
      details: [
        `En la muestra: «${nameA}» ${f(ma)} y «${nameB}» ${f(mb)}; diferencia ${f(diff)}.`,
        crosses
          ? "El intervalo incluye el 0: con estos datos no se puede afirmar que los promedios sean distintos en la población."
          : `El intervalo no incluye el 0: el promedio de «${diff > 0 ? nameA : nameB}» es mayor también en la población.`,
      ],
      caveats: ["Se usa el método de Welch, que no supone que los dos grupos varíen igual."],
    },
    steps: [
      {
        title: "1. Error estándar de la diferencia",
        formula: `EE = √(s₁²/n₁ + s₂²/n₂) = √(${formatValue(va, d + 1)}/${a.length} + ${formatValue(vb, d + 1)}/${b.length}) = ${formatValue(se, d + 2)}`,
      },
      {
        title: "2. Grados de libertad de Welch y valor crítico",
        formula: `gl = ${formatValue(df, 2)};  t = ${formatValue(t, 4)}`,
      },
      {
        title: "3. Intervalo",
        formula: `(x̄₁ − x̄₂) ± t · EE = ${f(diff)} ± ${f(t * se)} → [${f(lower)}; ${f(upper)}]`,
      },
    ],
  };
}

/** IC para la diferencia de dos proporciones (Newcombe, a partir de dos Wilson). */
export function proportionDifferenceInterval(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  nameA: string,
  nameB: string,
  label: string,
  level = 0.95,
): ConfidenceInterval | null {
  if (n1 < 1 || n2 < 1) return null;
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const w1 = wilson(x1, n1, level);
  const w2 = wilson(x2, n2, level);
  const diff = p1 - p2;
  const lower = diff - Math.sqrt((p1 - w1.lower) ** 2 + (w2.upper - p2) ** 2);
  const upper = diff + Math.sqrt((w1.upper - p1) ** 2 + (p2 - w2.lower) ** 2);
  const points = (v: number) => `${formatValue(v * 100, 1)} puntos`;
  return {
    estimate: diff,
    lower,
    upper,
    level,
    interpretation: {
      headline: `Con un método que acierta el ${pct(level)} de las veces, el porcentaje de ${label} en «${nameA}» menos el de «${nameB}» está entre ${points(lower)} y ${points(upper)}.`,
      details: [
        `En la muestra: «${nameA}» ${formatShare(p1)} y «${nameB}» ${formatShare(p2)}.`,
        lower <= 0 && upper >= 0
          ? "El intervalo incluye el 0: no se puede afirmar que los porcentajes sean distintos en la población."
          : "El intervalo no incluye el 0: la diferencia se sostiene en la población.",
      ],
      caveats: [],
    },
    steps: [
      {
        title: "1. Intervalo de Wilson de cada grupo",
        formula: `«${nameA}»: [${formatValue(w1.lower, 4)}; ${formatValue(w1.upper, 4)}];  «${nameB}»: [${formatValue(w2.lower, 4)}; ${formatValue(w2.upper, 4)}]`,
      },
      {
        title: "2. Método de Newcombe",
        formula: `(p₁ − p₂) − √((p₁ − l₁)² + (u₂ − p₂)²) = ${formatValue(lower, 4)};  (p₁ − p₂) + √((u₁ − p₁)² + (p₂ − l₂)²) = ${formatValue(upper, 4)}`,
      },
    ],
  };
}

/** Tamaño de muestra para estimar una media con margen E: n = (z·σ / E)². */
export function sampleSizeForMean(sd: number, margin: number, level = 0.95): number | null {
  if (!(sd > 0) || !(margin > 0)) return null;
  const z = standardNormalQuantile(1 - (1 - level) / 2);
  return Math.ceil(((z * sd) / margin) ** 2);
}

/** Tamaño de muestra para una proporción con margen E: n = z²·p(1 − p) / E² (p = 0,5 si no se sabe). */
export function sampleSizeForProportion(margin: number, p = 0.5, level = 0.95): number | null {
  if (!(margin > 0 && margin < 1) || !(p >= 0 && p <= 1)) return null;
  const z = standardNormalQuantile(1 - (1 - level) / 2);
  return Math.ceil((z * z * p * (1 - p)) / (margin * margin));
}

/**
 * Puntos del gráfico Q-Q normal: cada dato ordenado frente al cuantil normal
 * estándar de su posición, con las posiciones de `ppoints` de R (las mismas
 * de `qqnorm`). Si los datos son normales, quedan sobre una recta.
 */
export function normalQqPoints(
  sorted: readonly number[],
): { theoretical: number; sample: number }[] {
  const n = sorted.length;
  const a = n <= 10 ? 3 / 8 : 0.5;
  return sorted.map((sample, i) => ({
    theoretical: standardNormalQuantile((i + 1 - a) / (n + 1 - 2 * a)),
    sample,
  }));
}
