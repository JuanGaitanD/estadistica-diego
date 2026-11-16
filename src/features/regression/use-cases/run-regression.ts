import type { CellValue } from "@/core/data";
import {
  completePairs,
  interpretCorrelation,
  interpretRegression,
  pearson,
  REGRESSION_REASONS,
  regressionSteps,
  simpleRegression,
  spearman,
  type CalculationStep,
  type Correlation,
  type Interpretation,
  type SimpleRegression,
} from "@/core/statistics";

/** Una columna numérica tal como llega del conjunto de datos. */
export interface NumericColumn {
  readonly id: string;
  readonly name: string;
  readonly values: readonly CellValue[];
}

/** Resultado completo de «¿puedo predecir Y a partir de X?». */
export interface RegressionAnalysis {
  readonly xName: string;
  readonly yName: string;
  /** Filas descartadas porque les faltaba X o Y. */
  readonly dropped: number;
  readonly model: SimpleRegression | null;
  /** Por qué no hay recta, en llano (solo si `model` es `null`). */
  readonly reason?: string;
  readonly interpretation: Interpretation | null;
  readonly steps: readonly CalculationStep[];
  readonly pearson: Correlation | null;
  readonly spearman: Correlation | null;
  readonly correlationInterpretation: Interpretation | null;
}

const asNumber = (value: CellValue): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** Ajusta la recta de Y sobre X con los datos completos de las dos columnas. */
export function runRegression(x: NumericColumn, y: NumericColumn): RegressionAnalysis {
  const pairs = completePairs(x.values.map(asNumber), y.values.map(asNumber));
  const fit = simpleRegression(pairs.x, pairs.y);
  const r = pearson(pairs.x, pairs.y);
  const rho = spearman(pairs.x, pairs.y);
  const base = {
    xName: x.name,
    yName: y.name,
    dropped: pairs.dropped,
    pearson: r,
    spearman: rho,
    correlationInterpretation: r === null ? null : interpretCorrelation(r, x.name, y.name),
  };
  if (!fit.ok) {
    return {
      ...base,
      model: null,
      reason: REGRESSION_REASONS[fit.reason],
      interpretation: null,
      steps: [],
    };
  }
  return {
    ...base,
    model: fit.model,
    interpretation: interpretRegression(fit.model, x.name, y.name),
    steps: regressionSteps(fit.model),
  };
}
