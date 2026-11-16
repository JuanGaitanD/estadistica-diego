import type { CellValue } from "@/core/data";
import { dummyCode, type Predictor } from "@/core/statistics";

/** Columna del análisis con su tipo. */
export interface ModelColumn {
  readonly id: string;
  readonly name: string;
  readonly quantitative: boolean;
  readonly values: readonly CellValue[];
}

export interface Design {
  readonly y: number[];
  readonly predictors: Predictor[];
  /** Filas descartadas porque les faltaba algún valor. */
  readonly dropped: number;
  /** Variables de categorías que quedaron con una sola categoría (no aportan nada). */
  readonly singleCategory: string[];
}

const isNumber = (v: CellValue | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * Filas completas para un modelo: Y convertida con `toY` y cada predictor
 * numérico tal cual o, si es de categorías, como indicadoras.
 */
export function buildDesign(
  target: ModelColumn,
  columns: readonly ModelColumn[],
  toY: (value: CellValue) => number | null,
): Design {
  const rows: number[] = [];
  target.values.forEach((value, i) => {
    if (toY(value) === null) return;
    const complete = columns.every((c) =>
      c.quantitative ? isNumber(c.values[i]) : c.values[i] !== null && c.values[i] !== undefined,
    );
    if (complete) rows.push(i);
  });
  const singleCategory: string[] = [];
  const predictors = columns.flatMap((c): Predictor[] => {
    if (c.quantitative) return [{ name: c.name, values: rows.map((i) => c.values[i] as number) }];
    const dummies = dummyCode(
      c.name,
      rows.map((i) => String(c.values[i])),
    );
    if (dummies.length === 0) singleCategory.push(c.name);
    return dummies;
  });
  return {
    y: rows.map((i) => toY(target.values[i] ?? null)!),
    predictors,
    dropped: target.values.length - rows.length,
    singleCategory,
  };
}

/** Y numérica. */
export const numericY = (value: CellValue): number | null => (isNumber(value) ? value : null);

/** Y de sí/no: 1 si es la categoría elegida, 0 si es otra. */
export const binaryY =
  (yes: string) =>
  (value: CellValue): number | null =>
    value === null ? null : String(value) === yes ? 1 : 0;
