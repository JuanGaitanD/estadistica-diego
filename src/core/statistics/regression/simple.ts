import { tQuantile, tTwoTailedP } from "../distributions/student-t";
import { neumaierSum } from "../numeric/sum";
import { isFiniteNumber } from "../numeric/validate";

/** Una fila de la tabla de trabajo de la regresión (X, Y, X², XY, Ŷ, e, e², (Y − Ȳ)²). */
export interface RegressionRow {
  readonly x: number;
  readonly y: number;
  readonly xx: number;
  readonly xy: number;
  readonly fitted: number;
  readonly residual: number;
  readonly residualSquared: number;
  readonly totalSquared: number;
}

/** Intervalo [inferior, superior]. */
export interface Interval {
  readonly lower: number;
  readonly upper: number;
}

/** Regresión lineal simple por mínimos cuadrados, con todo lo que se enseña de ella. */
export interface SimpleRegression {
  readonly n: number;
  readonly sumX: number;
  readonly sumY: number;
  readonly sumXX: number;
  readonly sumXY: number;
  readonly sumYY: number;
  readonly meanX: number;
  readonly meanY: number;
  /** Intersección b0 (`INTERSECCION.EJE`). */
  readonly b0: number;
  /** Pendiente b1 (`PENDIENTE`). */
  readonly b1: number;
  /** Suma de cuadrados de los errores, SCE = Σe². */
  readonly sce: number;
  /** Suma de cuadrados total, SCT = Σ(Y − Ȳ)². */
  readonly sct: number;
  /** Suma de cuadrados de la regresión, SCR = SCT − SCE. */
  readonly scr: number;
  /** R² = 1 − SCE/SCT (`COEFICIENTE.R2`). */
  readonly r2: number;
  /** r con el signo de b1 (`COEF.DE.CORREL`). */
  readonly r: number;
  /** Grados de libertad de los errores, n − 2. */
  readonly df: number;
  /** Error estándar de la estimación, √(SCE / (n − 2)) (`ERROR.TIPICO.XY`). */
  readonly standardError: number;
  readonly seB0: number;
  readonly seB1: number;
  /** t de la pendiente, b1 / ee(b1), y su valor p de dos colas. */
  readonly tB1: number;
  readonly pB1: number;
  /** Intervalos de confianza del 95 % de b0 y b1. */
  readonly ciB0: Interval;
  readonly ciB1: Interval;
  readonly minX: number;
  readonly maxX: number;
  readonly rows: readonly RegressionRow[];
}

/** Por qué no se pudo ajustar la recta. */
export type RegressionFailure = "pocos-datos" | "x-constante" | "no-numerico";

export const REGRESSION_REASONS: Readonly<Record<RegressionFailure, string>> = {
  "pocos-datos":
    "Se necesitan al menos 3 parejas de datos completas para ajustar y evaluar una recta.",
  "x-constante": "Todos los valores de X son iguales: no hay una recta que explique cambios de Y.",
  "no-numerico": "X e Y tienen que ser números.",
};

/** Nivel de confianza de los intervalos de StatLab. */
export const CONFIDENCE = 0.95;

/**
 * Parejas (x, y) completas: descarta las filas donde falta cualquiera de los
 * dos valores (eliminación por pares).
 */
export function completePairs(
  xs: readonly (number | null)[],
  ys: readonly (number | null)[],
): { x: number[]; y: number[]; dropped: number } {
  const x: number[] = [];
  const y: number[] = [];
  const length = Math.min(xs.length, ys.length);
  for (let i = 0; i < length; i += 1) {
    const a = xs[i];
    const b = ys[i];
    if (isFiniteNumber(a) && isFiniteNumber(b)) {
      x.push(a);
      y.push(b);
    }
  }
  return { x, y, dropped: Math.max(xs.length, ys.length) - x.length };
}

/**
 * Ajusta Ŷ = b0 + b1·X por mínimos cuadrados (minimiza Σe²) resolviendo las
 * ecuaciones normales ΣY = n·b0 + b1·ΣX y ΣXY = b0·ΣX + b1·ΣX².
 *
 * Para estabilidad numérica b1 se calcula con datos centrados,
 * b1 = Σ(X − X̄)(Y − Ȳ) / Σ(X − X̄)², que es algebraicamente lo mismo.
 */
export function simpleRegression(
  x: readonly number[],
  y: readonly number[],
): { ok: true; model: SimpleRegression } | { ok: false; reason: RegressionFailure } {
  if (x.length !== y.length || [...x, ...y].some((v) => !isFiniteNumber(v))) {
    return { ok: false, reason: "no-numerico" };
  }
  const n = x.length;
  if (n < 3) return { ok: false, reason: "pocos-datos" };
  const meanX = neumaierSum(x) / n;
  const meanY = neumaierSum(y) / n;
  const sxx = neumaierSum(x.map((v) => (v - meanX) ** 2));
  if (sxx <= 1e-12 * Math.max(1, meanX * meanX) * n) return { ok: false, reason: "x-constante" };
  const sxy = neumaierSum(x.map((v, i) => (v - meanX) * ((y[i] ?? 0) - meanY)));
  const b1 = sxy / sxx;
  const b0 = meanY - b1 * meanX;

  const rows: RegressionRow[] = x.map((xi, i) => {
    const yi = y[i] ?? 0;
    const fitted = b0 + b1 * xi;
    const residual = yi - fitted;
    return {
      x: xi,
      y: yi,
      xx: xi * xi,
      xy: xi * yi,
      fitted,
      residual,
      residualSquared: residual * residual,
      totalSquared: (yi - meanY) ** 2,
    };
  });
  const sce = neumaierSum(rows.map((row) => row.residualSquared));
  const sct = neumaierSum(rows.map((row) => row.totalSquared));
  const r2 = sct > 0 ? 1 - sce / sct : 1;
  const r = Math.sign(b1) * Math.sqrt(Math.max(0, r2));
  const df = n - 2;
  const standardError = Math.sqrt(sce / df);
  const seB1 = standardError / Math.sqrt(sxx);
  const sumXX = neumaierSum(rows.map((row) => row.xx));
  const seB0 = standardError * Math.sqrt(sumXX / (n * sxx));
  const tB1 = seB1 > 0 ? b1 / seB1 : b1 === 0 ? 0 : Number.POSITIVE_INFINITY * Math.sign(b1);
  const critical = tQuantile(1 - (1 - CONFIDENCE) / 2, df);
  return {
    ok: true,
    model: {
      n,
      sumX: neumaierSum(x),
      sumY: neumaierSum(y),
      sumXX,
      sumXY: neumaierSum(rows.map((row) => row.xy)),
      sumYY: neumaierSum(y.map((v) => v * v)),
      meanX,
      meanY,
      b0,
      b1,
      sce,
      sct,
      scr: sct - sce,
      r2,
      r,
      df,
      standardError,
      seB0,
      seB1,
      tB1,
      pB1: tTwoTailedP(tB1, df),
      ciB0: { lower: b0 - critical * seB0, upper: b0 + critical * seB0 },
      ciB1: { lower: b1 - critical * seB1, upper: b1 + critical * seB1 },
      minX: Math.min(...x),
      maxX: Math.max(...x),
      rows,
    },
  };
}

/** Predicción de Y para un X dado, con su intervalo de predicción del 95 %. */
export interface Prediction {
  readonly x: number;
  readonly y: number;
  /** Intervalo para un caso nuevo (más ancho que el de la media). */
  readonly interval: Interval;
  /** `true` si X cae fuera del rango observado: la recta se estira sin datos. */
  readonly extrapolation: boolean;
}

/**
 * Ŷ = b0 + b1·x0 con el intervalo de predicción
 * Ŷ ± t · s · √(1 + 1/n + (x0 − X̄)² / Σ(X − X̄)²) (`PRONOSTICO.LINEAL`).
 */
export function predict(model: SimpleRegression, x0: number): Prediction {
  const y = model.b0 + model.b1 * x0;
  const sxx = model.sumXX - model.n * model.meanX * model.meanX;
  const spread = model.standardError * Math.sqrt(1 + 1 / model.n + (x0 - model.meanX) ** 2 / sxx);
  const critical = tQuantile(1 - (1 - CONFIDENCE) / 2, model.df);
  return {
    x: x0,
    y,
    interval: { lower: y - critical * spread, upper: y + critical * spread },
    extrapolation: x0 < model.minX || x0 > model.maxX,
  };
}
