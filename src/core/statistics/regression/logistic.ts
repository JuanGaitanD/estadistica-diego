import { standardNormalCdf } from "../distributions/continuous";
import { formatP, SIGNIFICANCE } from "../inference/hypothesis-tests";
import { formatCount, formatShare, formatValue } from "../interpretation/text";
import type { CalculationStep, Interpretation } from "../types";
import { leastSquares } from "./least-squares";
import type { DummyInfo, Predictor } from "./multiple";

export interface LogisticCoefficient {
  readonly name: string;
  readonly estimate: number;
  readonly se: number;
  readonly z: number;
  readonly p: number;
  /** Razón de momios e^b y su IC del 95 %. */
  readonly oddsRatio: number;
  readonly lower: number;
  readonly upper: number;
  readonly dummy?: DummyInfo;
}

export interface LogisticIteration {
  readonly iteration: number;
  readonly logLik: number;
  readonly coefficients: readonly number[];
}

export interface LogisticRegression {
  readonly n: number;
  readonly k: number;
  readonly coefficients: readonly LogisticCoefficient[];
  readonly logLik: number;
  readonly nullLogLik: number;
  /** Pseudo-R² de McFadden: 1 − LL/LL₀. */
  readonly mcFadden: number;
  readonly iterations: readonly LogisticIteration[];
  readonly converged: boolean;
  /** Algún predictor separa casi perfectamente los sí de los no. */
  readonly separation: boolean;
  readonly y: readonly number[];
  readonly probabilities: readonly number[];
}

export type LogisticFailure = "pocos-datos" | "sin-variacion" | "colinealidad";

export const LOGISTIC_REASONS: Readonly<Record<LogisticFailure, string>> = {
  "pocos-datos": "Hacen falta más filas completas que variables más dos.",
  "sin-variacion": "Todos los casos tienen la misma respuesta: hacen falta sí y no para comparar.",
  colinealidad: "Alguna variable es una combinación exacta de otras: quita una.",
};

const sigmoid = (eta: number): number => 1 / (1 + Math.exp(-eta));

function logLikelihood(y: readonly number[], p: readonly number[]): number {
  return y.reduce((sum, yi, i) => {
    const pi = Math.min(1 - 1e-15, Math.max(1e-15, p[i]!));
    return sum + (yi === 1 ? Math.log(pi) : Math.log(1 - pi));
  }, 0);
}

/**
 * Regresión logística binaria por mínimos cuadrados reponderados (IRLS), el
 * método de `glm(…, family = binomial)` de R. `y` vale 1 (sí) o 0 (no).
 */
export function logisticRegression(
  predictors: readonly Predictor[],
  y: readonly number[],
): { ok: true; model: LogisticRegression } | { ok: false; reason: LogisticFailure } {
  const n = y.length;
  const k = predictors.length;
  if (k === 0 || n < k + 2) return { ok: false, reason: "pocos-datos" };
  const yes = y.filter((v) => v === 1).length;
  if (yes === 0 || yes === n) return { ok: false, reason: "sin-variacion" };
  const X = y.map((_, i) => [1, ...predictors.map((p) => p.values[i] ?? 0)]);
  let b = new Array<number>(k + 1).fill(0);
  let inverse: readonly (readonly number[])[] = [];
  const iterations: LogisticIteration[] = [];
  let converged = false;
  const linear = (coefficients: readonly number[]) =>
    X.map((row) => row.reduce((sum, v, j) => sum + v * coefficients[j]!, 0));

  for (let iteration = 1; iteration <= 25; iteration += 1) {
    const eta = linear(b);
    const p = eta.map(sigmoid);
    const w = p.map((pi) => Math.max(pi * (1 - pi), 1e-10));
    const z = eta.map((e, i) => e + (y[i]! - p[i]!) / w[i]!);
    const solution = leastSquares(X, z, w);
    if (solution === null) return { ok: false, reason: "colinealidad" };
    const next = solution.coefficients;
    inverse = solution.inverse;
    const change = Math.max(...next.map((v, j) => Math.abs(v - b[j]!)));
    b = [...next];
    iterations.push({
      iteration,
      logLik: logLikelihood(y, linear(b).map(sigmoid)),
      coefficients: b,
    });
    if (change < 1e-8) {
      converged = true;
      break;
    }
  }
  // Errores estándar con los pesos en la solución final.
  const finalEta = linear(b);
  const probabilities = finalEta.map(sigmoid);
  const finalW = probabilities.map((pi) => Math.max(pi * (1 - pi), 1e-10));
  const finalSolution = leastSquares(X, finalEta, finalW);
  if (finalSolution !== null) inverse = finalSolution.inverse;
  const logLik = logLikelihood(y, probabilities);
  const share = yes / n;
  const nullLogLik = n * (share * Math.log(share) + (1 - share) * Math.log(1 - share));
  const separation =
    !converged || Math.max(...finalEta.map(Math.abs)) > 30 || b.some((v) => Math.abs(v) > 20);
  const names = ["Intersección", ...predictors.map((p) => p.name)];
  const coefficients = b.map((estimate, j): LogisticCoefficient => {
    const se = Math.sqrt(inverse[j]?.[j] ?? NaN);
    const z = estimate / se;
    const dummy = j > 0 ? predictors[j - 1]!.dummy : undefined;
    return {
      name: names[j]!,
      estimate,
      se,
      z,
      p: 2 * (1 - standardNormalCdf(Math.abs(z))),
      oddsRatio: Math.exp(estimate),
      lower: Math.exp(estimate - 1.959964 * se),
      upper: Math.exp(estimate + 1.959964 * se),
      ...(dummy !== undefined ? { dummy } : {}),
    };
  });
  return {
    ok: true,
    model: {
      n,
      k,
      coefficients,
      logLik,
      nullLogLik,
      mcFadden: 1 - logLik / nullLogLik,
      iterations,
      converged,
      separation,
      y,
      probabilities,
    },
  };
}

/** Probabilidad de «sí» para una fila de predictores. */
export function predictLogistic(model: LogisticRegression, row: readonly number[]): number {
  return sigmoid(
    model.coefficients.reduce(
      (sum, c, j) => sum + c.estimate * (j === 0 ? 1 : (row[j - 1] ?? 0)),
      0,
    ),
  );
}

export interface Confusion {
  readonly threshold: number;
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly trueNegative: number;
  readonly falseNegative: number;
  readonly accuracy: number;
  /** De los sí reales, cuántos acierta. */
  readonly sensitivity: number;
  /** De los no reales, cuántos acierta. */
  readonly specificity: number;
}

/** Matriz de confusión: se predice «sí» cuando la probabilidad llega al umbral. */
export function confusionMatrix(model: LogisticRegression, threshold = 0.5): Confusion {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  model.probabilities.forEach((p, i) => {
    const predicted = p >= threshold;
    const actual = model.y[i] === 1;
    if (predicted && actual) tp += 1;
    else if (predicted) fp += 1;
    else if (actual) fn += 1;
    else tn += 1;
  });
  return {
    threshold,
    truePositive: tp,
    falsePositive: fp,
    trueNegative: tn,
    falseNegative: fn,
    accuracy: (tp + tn) / model.n,
    sensitivity: tp + fn === 0 ? 0 : tp / (tp + fn),
    specificity: tn + fp === 0 ? 0 : tn / (tn + fp),
  };
}

const times = (or: number, yes: string): string =>
  or >= 1
    ? `multiplica por ${formatValue(or, 2)} los momios de «${yes}» (las probabilidades a favor)`
    : `reduce los momios de «${yes}» al ${formatValue(or * 100, 0)} % de lo que eran`;

/** e^b legible: los valores enormes no se leen como cifra. */
export function formatOdds(value: number): string {
  if (!Number.isFinite(value) || value > 10000) return "más de 10.000";
  if (value < 0.0001) return "casi 0";
  return formatValue(value, 3);
}

/** Lectura en llano de la logística. */
export function interpretLogistic(
  model: LogisticRegression,
  yesLabel: string,
  confusion: Confusion,
): Interpretation {
  const details = model.coefficients.slice(1).map((c) => {
    const p = c.p < SIGNIFICANCE ? `p = ${formatP(c.p)}` : `p = ${formatP(c.p)}; podría ser azar`;
    return c.dummy !== undefined
      ? `Ser «${c.dummy.category}» en lugar de «${c.dummy.reference}» ${times(c.oddsRatio, yesLabel)} (${p}).`
      : `Cada unidad más de ${c.name} ${times(c.oddsRatio, yesLabel)} (${p}).`;
  });
  details.push(
    `Con el umbral de ${formatShare(confusion.threshold)}, acierta el ${formatShare(confusion.accuracy)} de los casos: reconoce el ${formatShare(confusion.sensitivity)} de los «${yesLabel}» reales (sensibilidad) y el ${formatShare(confusion.specificity)} de los demás (especificidad).`,
    `Pseudo-R² de McFadden = ${formatValue(model.mcFadden, 3)}: entre 0,2 y 0,4 ya es un ajuste muy bueno (no se lee como el R² de la recta).`,
  );
  const caveats: string[] = [];
  if (model.separation) {
    caveats.push(
      "Alguna variable separa casi perfectamente los sí de los no: los coeficientes se disparan y sus valores p no son confiables. Revisa esa variable o junta más datos.",
    );
  }
  const minority = Math.min(...[1, 0].map((v) => model.y.filter((y) => y === v).length));
  if (minority < 10 * model.k) {
    caveats.push(
      `La respuesta menos frecuente tiene ${formatCount(minority)} casos para ${formatCount(model.k)} términos: lo recomendable es al menos 10 por término; el modelo puede ser inestable.`,
    );
  }
  caveats.push(
    "La exactitud se mide con los mismos datos con que se ajustó el modelo: con datos nuevos suele ser algo menor.",
  );
  const best = [...model.coefficients.slice(1)].sort((a, b) => a.p - b.p)[0];
  const headline =
    best === undefined
      ? `El modelo estima la probabilidad de «${yesLabel}».`
      : best.p < SIGNIFICANCE
        ? `${best.dummy ? `Ser «${best.dummy.category}»` : `Cada unidad más de ${best.name}`} ${times(best.oddsRatio, yesLabel)}; el modelo acierta el ${formatShare(confusion.accuracy)} de los casos.`
        : `Ninguna variable cambia de forma clara la probabilidad de «${yesLabel}» (el efecto más claro tiene p = ${formatP(best.p)}); el modelo acierta el ${formatShare(confusion.accuracy)} de los casos.`;
  return { headline, details, caveats };
}

/** Paso a paso de la logística: el modelo, las iteraciones y la evaluación. */
export function logisticSteps(model: LogisticRegression, confusion: Confusion): CalculationStep[] {
  const f4 = (v: number) => formatValue(v, 4);
  return [
    {
      title: "1. El modelo",
      text: "La recta no sirve para un sí/no: daría probabilidades menores que 0 o mayores que 1. Se modela el logaritmo de los momios, que sí puede tomar cualquier valor:",
      formula: "ln(p / (1 − p)) = b0 + b1·X1 + … + bk·Xk   ⇔   p = 1 / (1 + e^−(b0 + b1·X1 + …))",
    },
    {
      title: "2. Aproximaciones sucesivas",
      text: `No hay ecuaciones normales con solución directa. Se parte de b = 0 y se mejora en cada vuelta (mínimos cuadrados reponderados) hasta que los coeficientes dejan de cambiar${model.converged ? "" : "; aquí no llegó a estabilizarse"}. La verosimilitud (ln L) sube en cada vuelta:`,
      table: {
        columns: ["Vuelta", "ln L", ...model.coefficients.map((c) => c.name)],
        rows: model.iterations.map((it) => [
          String(it.iteration),
          f4(it.logLik),
          ...it.coefficients.map(f4),
        ]),
      },
    },
    {
      title: "3. Coeficientes y razones de momios",
      text: "La razón de momios e^b dice por cuánto se multiplican los momios de «sí» por cada unidad más de la variable; 1 significa «no cambia».",
      table: {
        columns: ["Término", "b", "Error estándar", "z", "Valor p", "e^b", "IC 95 % de e^b"],
        rows: model.coefficients.map((c, j) => [
          c.name,
          f4(c.estimate),
          f4(c.se),
          formatValue(c.z, 3),
          formatP(c.p),
          j === 0 ? "—" : formatOdds(c.oddsRatio),
          j === 0 ? "—" : `${formatOdds(c.lower)} a ${formatOdds(c.upper)}`,
        ]),
      },
    },
    {
      title: "4. Qué tanto explica",
      formula: `McFadden = 1 − ln L / ln L₀ = 1 − (${f4(model.logLik)}) / (${f4(model.nullLogLik)}) = ${f4(model.mcFadden)}`,
      text: "ln L₀ es la verosimilitud del modelo sin variables (solo el porcentaje de sí).",
    },
    {
      title: "5. Matriz de confusión",
      text: `Se predice «sí» si la probabilidad es al menos ${formatShare(confusion.threshold)}.`,
      table: {
        columns: ["", "Predicho sí", "Predicho no"],
        rows: [
          ["Real sí", formatCount(confusion.truePositive), formatCount(confusion.falseNegative)],
          ["Real no", formatCount(confusion.falsePositive), formatCount(confusion.trueNegative)],
        ],
      },
      formula: `Exactitud = (VP + VN)/n = ${formatShare(confusion.accuracy)};  sensibilidad = VP/(VP + FN) = ${formatShare(confusion.sensitivity)};  especificidad = VN/(VN + FP) = ${formatShare(confusion.specificity)}`,
    },
  ];
}
