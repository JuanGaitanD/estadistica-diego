import { fCdf } from "../distributions/continuous";
import { tQuantile, tTwoTailedP } from "../distributions/student-t";
import { formatP, SIGNIFICANCE } from "../inference/hypothesis-tests";
import { formatCount, formatShare, formatValue, narrativeDecimals } from "../interpretation/text";
import { neumaierSum } from "../numeric/sum";
import type { CalculationStep, Interpretation } from "../types";
import { leastSquares } from "./least-squares";

/** Variable indicadora: 1 si la fila es de `category`, 0 si no (la referencia queda en 0). */
export interface DummyInfo {
  readonly variable: string;
  readonly category: string;
  readonly reference: string;
}

/** Predictor numérico (ya sin faltantes, alineado con Y). */
export interface Predictor {
  readonly name: string;
  readonly values: readonly number[];
  readonly dummy?: DummyInfo;
}

export interface Coefficient {
  readonly name: string;
  readonly estimate: number;
  readonly se: number;
  readonly t: number;
  readonly p: number;
  readonly lower: number;
  readonly upper: number;
  /** Factor de inflación de la varianza; `null` en la intersección o con un solo predictor. */
  readonly vif: number | null;
  readonly dummy?: DummyInfo;
}

export interface MultipleRegression {
  readonly n: number;
  /** Número de predictores (sin la intersección). */
  readonly k: number;
  /** Intersección primero y luego un coeficiente por predictor. */
  readonly coefficients: readonly Coefficient[];
  readonly sce: number;
  readonly sct: number;
  readonly r2: number;
  readonly adjustedR2: number;
  readonly f: number;
  readonly pF: number;
  readonly dfResidual: number;
  readonly standardError: number;
  readonly y: readonly number[];
  readonly fitted: readonly number[];
  readonly residuals: readonly number[];
  /** Sumas para mostrar las ecuaciones normales con 2 predictores. */
  readonly predictors: readonly Predictor[];
}

export type MultipleFailure = "pocos-datos" | "colinealidad";

export const MULTIPLE_REASONS: Readonly<Record<MultipleFailure, string>> = {
  "pocos-datos":
    "Hacen falta más filas completas que variables más dos para ajustar y evaluar el modelo.",
  colinealidad:
    "Alguna variable es una combinación exacta de otras (por ejemplo, la misma medida en dos unidades): quita una.",
};

function fit(
  predictors: readonly Predictor[],
  y: readonly number[],
): { b: readonly number[]; inverse: readonly (readonly number[])[]; fitted: number[] } | null {
  const X = y.map((_, i) => [1, ...predictors.map((p) => p.values[i] ?? 0)]);
  const solution = leastSquares(X, y);
  if (solution === null) return null;
  const fitted = X.map((row) => row.reduce((sum, v, j) => sum + v * solution.coefficients[j]!, 0));
  return { b: solution.coefficients, inverse: solution.inverse, fitted };
}

function rSquared(y: readonly number[], fitted: readonly number[]): number {
  const mean = neumaierSum(y) / y.length;
  const sct = neumaierSum(y.map((v) => (v - mean) ** 2));
  const sce = neumaierSum(y.map((v, i) => (v - fitted[i]!) ** 2));
  return sct === 0 ? 0 : 1 - sce / sct;
}

/** Regresión lineal múltiple Ŷ = b0 + b1·X1 + … + bk·Xk (`ESTIMACION.LINEAL`). */
export function multipleRegression(
  predictors: readonly Predictor[],
  y: readonly number[],
  { vif = true } = {},
): { ok: true; model: MultipleRegression } | { ok: false; reason: MultipleFailure } {
  const n = y.length;
  const k = predictors.length;
  if (k === 0 || n < k + 2) return { ok: false, reason: "pocos-datos" };
  const result = fit(predictors, y);
  if (result === null) return { ok: false, reason: "colinealidad" };
  const { b, inverse, fitted } = result;
  const mean = neumaierSum(y) / n;
  const residuals = y.map((v, i) => v - fitted[i]!);
  const sce = neumaierSum(residuals.map((e) => e * e));
  const sct = neumaierSum(y.map((v) => (v - mean) ** 2));
  const dfResidual = n - k - 1;
  const mse = sce / dfResidual;
  const r2 = sct === 0 ? 0 : 1 - sce / sct;
  const adjustedR2 = 1 - ((1 - r2) * (n - 1)) / dfResidual;
  const f = sce === 0 ? Infinity : (sct - sce) / k / mse;
  const pF = sce === 0 ? 0 : 1 - fCdf(f, k, dfResidual);
  const tCrit = tQuantile(0.975, dfResidual);
  const names = ["Intersección", ...predictors.map((p) => p.name)];
  const coefficients = b.map((estimate, j): Coefficient => {
    const se = Math.sqrt(mse * inverse[j]![j]!);
    const t = se === 0 ? 0 : estimate / se;
    let vifValue: number | null = null;
    if (vif && j > 0 && k >= 2) {
      const others = predictors.filter((_, m) => m !== j - 1);
      const target = predictors[j - 1]!.values;
      const aux = fit(others, target);
      vifValue = aux === null ? Infinity : 1 / (1 - rSquared(target, aux.fitted));
    }
    const dummy = j > 0 ? predictors[j - 1]!.dummy : undefined;
    return {
      name: names[j]!,
      estimate,
      se,
      t,
      p: se === 0 ? 0 : tTwoTailedP(t, dfResidual),
      lower: estimate - tCrit * se,
      upper: estimate + tCrit * se,
      vif: vifValue,
      ...(dummy !== undefined ? { dummy } : {}),
    };
  });
  return {
    ok: true,
    model: {
      n,
      k,
      coefficients,
      sce,
      sct,
      r2,
      adjustedR2,
      f,
      pF,
      dfResidual,
      standardError: Math.sqrt(mse),
      y,
      fitted,
      residuals,
      predictors,
    },
  };
}

/** Ŷ para una fila de valores de los predictores, en el mismo orden. */
export function predictMultiple(model: MultipleRegression, row: readonly number[]): number {
  return model.coefficients.reduce(
    (sum, c, j) => sum + c.estimate * (j === 0 ? 1 : (row[j - 1] ?? 0)),
    0,
  );
}

/**
 * Indicadoras de una variable de categorías: una columna por categoría salvo
 * la de referencia (la más frecuente; en empate, la primera alfabética).
 */
export function dummyCode(name: string, values: readonly string[]): Predictor[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const categories = [...counts.keys()].sort((a, b) => a.localeCompare(b, "es"));
  const reference = [...categories].sort((a, b) => counts.get(b)! - counts.get(a)!)[0];
  if (reference === undefined) return [];
  return categories
    .filter((c) => c !== reference)
    .map((category) => ({
      name: `${name}: ${category}`,
      values: values.map((v) => (v === category ? 1 : 0)),
      dummy: { variable: name, category, reference },
    }));
}

const SUPERSCRIPT = ["", "", "²", "³", "⁴", "⁵"];

/**
 * Centro con el que se restan los X antes de elevarlos: 0 si X ya está cerca
 * del cero; si no (años, por ejemplo), su promedio redondeado. Sin centrar,
 * 2019⁴ y 2018⁴ son casi iguales y la curva parece colineal.
 */
export function polynomialCenter(x: readonly number[]): number {
  if (x.length === 0) return 0;
  const mean = neumaierSum(x) / x.length;
  const sd = Math.sqrt(neumaierSum(x.map((v) => (v - mean) ** 2)) / x.length);
  if (Math.abs(mean) <= 3 * sd) return 0;
  return sd >= 1 ? Math.round(mean) : Number(mean.toPrecision(3));
}

/** Valores de los términos (X − c), (X − c)², … de una curva para un x. */
export function polynomialTerms(x: number, degree: number, center: number): number[] {
  return Array.from({ length: degree }, (_, i) => (x - center) ** (i + 1));
}

/** Regresión polinómica: múltiple con X, X², …, Xᵍ (con X centrada si hace falta). */
export function polynomialRegression(
  x: readonly number[],
  y: readonly number[],
  degree: number,
  xName = "X",
): ReturnType<typeof multipleRegression> {
  const center = polynomialCenter(x);
  const base =
    center === 0
      ? xName
      : `(${xName} − ${Number.isInteger(center) ? String(center) : formatValue(center, 3)})`;
  const predictors = Array.from({ length: degree }, (_, i) => ({
    name: `${base}${SUPERSCRIPT[i + 1] ?? `^${i + 1}`}`,
    values: x.map((v) => (v - center) ** (i + 1)),
  }));
  return multipleRegression(predictors, y, { vif: false });
}

/** R² ajustado por grado (1 a `maxDegree`), para elegir la curva más simple que basta. */
export function compareDegrees(
  x: readonly number[],
  y: readonly number[],
  maxDegree = 4,
): { degree: number; adjustedR2: number }[] {
  const rows: { degree: number; adjustedR2: number }[] = [];
  for (let degree = 1; degree <= maxDegree; degree += 1) {
    const result = polynomialRegression(x, y, degree);
    if (result.ok) rows.push({ degree, adjustedR2: result.model.adjustedR2 });
  }
  return rows;
}

/** «A», «A y B», «A, B y C». */
const listOf = (items: readonly string[]): string =>
  items.length === 1
    ? items[0]!
    : `Juntas, ${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

const pPhrase = (p: number): string =>
  p < SIGNIFICANCE ? `p = ${formatP(p)}` : `p = ${formatP(p)}; podría ser azar`;

/** Lectura en llano de la regresión múltiple o polinómica. */
export function interpretMultiple(
  model: MultipleRegression,
  yName: string,
  options: {
    readonly polynomialDegree?: number;
    readonly degrees?: readonly { degree: number; adjustedR2: number }[];
  } = {},
): Interpretation {
  const d = narrativeDecimals(model.y);
  const variables = [...new Set(model.predictors.map((p) => p.dummy?.variable ?? p.name))];
  const fitSentence =
    model.pF < SIGNIFICANCE
      ? `En conjunto predice mejor que el simple promedio (prueba F, p = ${formatP(model.pF)}).`
      : `Con p = ${formatP(model.pF)} no hay evidencia de que prediga mejor que el simple promedio.`;
  const degree = options.polynomialDegree;
  const headline =
    degree !== undefined
      ? `Una curva de grado ${degree} explica el ${formatShare(Math.max(0, model.adjustedR2))} de la variación de ${yName} (R² ajustado). ${fitSentence}`
      : `${listOf(variables)} ${variables.length === 1 ? "explica" : "explican"} el ${formatShare(Math.max(0, model.adjustedR2))} de la variación de ${yName} (R² ajustado). ${fitSentence}`;

  const details: string[] = [];
  if (degree !== undefined) {
    details.push(
      "En una curva los coeficientes no se leen uno por uno (X y X² se mueven juntos): mira la gráfica para ver cómo cambia la predicción.",
    );
    if (options.degrees && options.degrees.length > 1) {
      details.push(
        `R² ajustado según el grado: ${options.degrees.map((row) => `grado ${row.degree}: ${formatShare(Math.max(0, row.adjustedR2))}`).join("; ")}.`,
      );
    }
  } else {
    for (const c of model.coefficients.slice(1)) {
      const amount = formatValue(Math.abs(c.estimate), Math.max(d, 2));
      details.push(
        c.dummy !== undefined
          ? `Con lo demás igual, ser «${c.dummy.category}» en lugar de «${c.dummy.reference}» ${c.estimate >= 0 ? "suma" : "resta"} ${amount} a ${yName} (${pPhrase(c.p)}).`
          : `Manteniendo lo demás constante, cada unidad más de ${c.name} ${c.estimate >= 0 ? "sube" : "baja"} ${yName} en ${amount} (${pPhrase(c.p)}).`,
      );
    }
  }
  details.push(
    `El R² sin ajustar es ${formatShare(model.r2)}; siempre sube al agregar variables, aunque no sirvan. El ajustado descuenta cada variable de más, por eso es el que se compara.`,
  );

  const caveats: string[] = [];
  if (model.n < 10 * model.k) {
    caveats.push(
      `Hay ${formatCount(model.n)} filas para ${formatCount(model.k)} términos: con menos de 10 filas por término el modelo puede estar memorizando los datos.`,
    );
  }
  const collinear = model.coefficients.filter((c) => c.vif !== null && c.vif > 5);
  if (collinear.length > 0) {
    caveats.push(
      `${collinear.map((c) => c.name).join(", ")} se parece${collinear.length > 1 ? "n" : ""} mucho a otras variables (VIF mayor que 5): sus coeficientes individuales son inestables, aunque la predicción en conjunto sirva.`,
    );
  }
  if (degree !== undefined && options.degrees) {
    const previous = options.degrees.find((row) => row.degree === degree - 1);
    if (previous !== undefined && model.adjustedR2 - previous.adjustedR2 < 0.01) {
      caveats.push(
        `Subir de grado ${degree - 1} a ${degree} casi no mejora: quédate con la curva más simple, que se equivoca menos con datos nuevos.`,
      );
    } else if (degree >= 3) {
      caveats.push(
        "Una curva de grado alto puede «memorizar» los datos y fallar fuera de ellos; no la uses para predecir fuera del rango de X.",
      );
    }
  }
  const dummies = model.predictors.filter((p) => p.dummy !== undefined);
  if (dummies.length > 0) {
    const references = [...new Map(dummies.map((p) => [p.dummy!.variable, p.dummy!.reference]))];
    caveats.push(
      `Las categorías se comparan con una de referencia: ${references.map(([variable, reference]) => `«${reference}» en ${variable}`).join("; ")}.`,
    );
  }
  caveats.push("Que una variable prediga a otra no prueba que la cause.");
  return { headline, details, caveats };
}

/** Paso a paso de la regresión múltiple. */
export function multipleSteps(model: MultipleRegression, yName: string): CalculationStep[] {
  const f4 = (v: number) => formatValue(v, 4);
  const steps: CalculationStep[] = [];
  const [p1, p2] = model.predictors;
  if (model.k === 2 && p1 !== undefined && p2 !== undefined) {
    const s = (values: readonly number[]) => neumaierSum(values);
    const x1 = p1.values;
    const x2 = p2.values;
    const y = model.y;
    const n = model.n;
    const sx1 = s(x1);
    const sx2 = s(x2);
    const sy = s(y);
    const sx1x1 = s(x1.map((v) => v * v));
    const sx2x2 = s(x2.map((v) => v * v));
    const sx1x2 = s(x1.map((v, i) => v * x2[i]!));
    const sx1y = s(x1.map((v, i) => v * y[i]!));
    const sx2y = s(x2.map((v, i) => v * y[i]!));
    const g = (v: number) => formatValue(v, 2);
    steps.push({
      title: "Ecuaciones normales",
      text: "Igual que en la simple, se minimiza Σe², ahora con tres incógnitas (b0, b1, b2). Salen tres ecuaciones con las sumas de los datos:",
      formula: [
        `ΣY = n·b0 + b1·ΣX1 + b2·ΣX2  →  ${g(sy)} = ${n}·b0 + ${g(sx1)}·b1 + ${g(sx2)}·b2`,
        `ΣX1Y = b0·ΣX1 + b1·ΣX1² + b2·ΣX1X2  →  ${g(sx1y)} = ${g(sx1)}·b0 + ${g(sx1x1)}·b1 + ${g(sx1x2)}·b2`,
        `ΣX2Y = b0·ΣX2 + b1·ΣX1X2 + b2·ΣX2²  →  ${g(sx2y)} = ${g(sx2)}·b0 + ${g(sx1x2)}·b1 + ${g(sx2x2)}·b2`,
        `X1 = ${p1.name}, X2 = ${p2.name}`,
      ].join("\n"),
    });
  } else {
    steps.push({
      title: "Ecuaciones normales",
      text: `Se minimiza Σe² con ${model.k + 1} incógnitas. Las ecuaciones normales en forma de matriz son (XᵀX)·b = Xᵀy; con tantas incógnitas se resuelven por computador (StatLab usa la descomposición QR, más precisa).`,
    });
  }
  steps.push({
    title: "Coeficientes",
    text: "Cada coeficiente con su error estándar, su t (coeficiente / error) y su valor p: si p < 0,05, esa variable aporta aun teniendo en cuenta las demás.",
    table: {
      columns: ["Término", "Coeficiente", "Error estándar", "t", "Valor p", "VIF"],
      rows: model.coefficients.map((c) => [
        c.name,
        f4(c.estimate),
        f4(c.se),
        formatValue(c.t, 3),
        formatP(c.p),
        c.vif === null ? "—" : Number.isFinite(c.vif) ? formatValue(c.vif, 2) : "∞",
      ]),
    },
    excel: "=ESTIMACION.LINEAL(Y; X1:Xk; VERDADERO; VERDADERO)",
  });
  steps.push({
    title: "Qué tanto explica",
    formula: `R² = 1 − SCE/SCT = 1 − ${f4(model.sce)} / ${f4(model.sct)} = ${f4(model.r2)}\nR² ajustado = 1 − (1 − R²)·(n − 1)/(n − k − 1) = 1 − (1 − ${f4(model.r2)})·${model.n - 1}/${model.dfResidual} = ${f4(model.adjustedR2)}`,
  });
  steps.push({
    title: "Prueba F global",
    text: `H₀: ninguna variable sirve para predecir ${yName} (todas las b son 0).`,
    formula: `F = (SCR/k) / (SCE/(n − k − 1)) = (${f4(model.sct - model.sce)}/${model.k}) / (${f4(model.sce)}/${model.dfResidual}) = ${formatValue(model.f, 3)} → p = ${formatP(model.pF)}`,
    excel: `=DISTR.F.CD(${formatValue(model.f, 4)}; ${model.k}; ${model.dfResidual})`,
  });
  steps.push({
    title: "Error típico de la estimación",
    text: `Cuánto se equivoca en promedio la predicción, en unidades de ${yName}.`,
    formula: `s = √(SCE/(n − k − 1)) = √(${f4(model.sce)}/${model.dfResidual}) = ${f4(model.standardError)}`,
  });
  return steps.map((step, i) => ({ ...step, title: `${i + 1}. ${step.title}` }));
}
