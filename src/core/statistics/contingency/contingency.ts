import { explanationFor } from "../explanations/catalog";
import type { ContingencyCell, ContingencyResult, ExtremeIndexes, ObservedValue } from "../types";

/** Parámetros de la tabla de contingencia de dos variables. */
export interface ContingencyParams {
  readonly rowVariableId: string;
  readonly columnVariableId: string;
  /** Valores de la variable de fila; `null` = faltante. */
  readonly rowValues: readonly (ObservedValue | null)[];
  /** Valores de la variable de columna; `null` = faltante. */
  readonly columnValues: readonly (ObservedValue | null)[];
  /** Orden canónico de las categorías de fila. */
  readonly rowOrder?: readonly string[];
  /** Orden canónico de las categorías de columna. */
  readonly columnOrder?: readonly string[];
}

function extremesOf(counts: readonly number[]): ExtremeIndexes {
  if (counts.length === 0) {
    return { maxIndex: -1, minIndex: -1, maxIndexes: [], minIndexes: [] };
  }
  let max = Number.NEGATIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (const count of counts) {
    if (count > max) max = count;
    if (count < min) min = count;
  }
  const maxIndexes: number[] = [];
  const minIndexes: number[] = [];
  counts.forEach((count, index) => {
    if (count === max) maxIndexes.push(index);
    if (count === min) minIndexes.push(index);
  });
  return {
    maxIndex: maxIndexes[0] ?? -1,
    minIndex: minIndexes[0] ?? -1,
    maxIndexes,
    minIndexes,
  };
}

function orderedLabels(seen: readonly string[], declared: readonly string[] | undefined): string[] {
  if (declared === undefined || declared.length === 0) return [...seen];
  const inDeclared = declared.filter((label) => seen.includes(label));
  const rest = seen.filter((label) => !declared.includes(label));
  return [...inDeclared, ...rest];
}

/**
 * Tabla de contingencia de dos variables categóricas (ADR-003 §6).
 *
 * Fórmulas: `n_ij` es el recuento de observaciones con categoría `i` en la fila
 * y `j` en la columna, excluyendo las filas donde falte cualquiera de las dos.
 * Marginales `n_i. = suma_j n_ij`, `n_.j = suma_i n_ij`, `N = suma n_ij`.
 * Porcentajes: por fila `100·n_ij/n_i.`, por columna `100·n_ij/n_.j`, sobre el
 * total `100·n_ij/N`. Se precalculan los índices del máximo y del mínimo de cada
 * fila y de cada columna, con todos los empates.
 *
 * @param params - Las dos variables cruzadas y sus órdenes de categorías.
 * @returns La tabla con marginales, porcentajes, extremos y su explicación.
 */
export function computeContingencyTable(params: ContingencyParams): ContingencyResult {
  const pairs: { row: string; column: string }[] = [];
  const length = Math.min(params.rowValues.length, params.columnValues.length);
  let excluded = Math.abs(params.rowValues.length - params.columnValues.length);
  for (let index = 0; index < length; index += 1) {
    const rowValue = params.rowValues[index];
    const columnValue = params.columnValues[index];
    if (rowValue === null || rowValue === undefined) {
      excluded += 1;
      continue;
    }
    if (columnValue === null || columnValue === undefined) {
      excluded += 1;
      continue;
    }
    pairs.push({ row: String(rowValue), column: String(columnValue) });
  }

  const seenRows: string[] = [];
  const seenColumns: string[] = [];
  for (const pair of pairs) {
    if (!seenRows.includes(pair.row)) seenRows.push(pair.row);
    if (!seenColumns.includes(pair.column)) seenColumns.push(pair.column);
  }
  const rowLabels = orderedLabels(seenRows, params.rowOrder);
  const columnLabels = orderedLabels(seenColumns, params.columnOrder);

  const counts = rowLabels.map(() => columnLabels.map(() => 0));
  for (const pair of pairs) {
    const i = rowLabels.indexOf(pair.row);
    const j = columnLabels.indexOf(pair.column);
    const row = counts[i];
    if (row !== undefined && j >= 0) row[j] = (row[j] ?? 0) + 1;
  }

  const rowTotals = counts.map((row) => row.reduce((total, value) => total + value, 0));
  const columnTotals = columnLabels.map((unused, j) =>
    counts.reduce((total, row) => total + (row[j] ?? 0), 0),
  );
  const grandTotal = rowTotals.reduce((total, value) => total + value, 0);

  const cells: ContingencyCell[][] = counts.map((row, i) =>
    row.map((absolute, j) => {
      const rowTotal = rowTotals[i] ?? 0;
      const columnTotal = columnTotals[j] ?? 0;
      return {
        absolute,
        rowPercent: rowTotal === 0 ? 0 : (100 * absolute) / rowTotal,
        columnPercent: columnTotal === 0 ? 0 : (100 * absolute) / columnTotal,
        totalPercent: grandTotal === 0 ? 0 : (100 * absolute) / grandTotal,
      };
    }),
  );

  return {
    rowVariableId: params.rowVariableId,
    columnVariableId: params.columnVariableId,
    rowLabels,
    columnLabels,
    cells,
    rowTotals,
    columnTotals,
    grandTotal,
    excluded,
    rowExtremes: counts.map((row) => extremesOf(row)),
    columnExtremes: columnLabels.map((unused, j) => extremesOf(counts.map((row) => row[j] ?? 0))),
    explanation: explanationFor("tabla-de-contingencia"),
  };
}
