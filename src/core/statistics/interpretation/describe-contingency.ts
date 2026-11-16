import type { CalculationStep, ContingencyResult, Interpretation } from "../types";
import { formatCount, formatShare } from "./text";

/** Diferencia en puntos porcentuales entre grupos a partir de la cual se sugiere relación. */
export const ASSOCIATION_GAP = 20;
/** Máximo de grupos descritos uno a uno. */
const DESCRIBED_ROWS = 5;

function quote(label: string): string {
  return `«${label}»`;
}

/**
 * Interpretación en llano de un cruce de dos variables.
 *
 * Reglas: la combinación más común; dónde se concentra cada grupo de la
 * variable de filas; y si los porcentajes por fila de una misma columna
 * difieren en más de 20 puntos se dice que **puede** haber relación (sin
 * afirmarla: eso lo decide la prueba chi-cuadrado).
 *
 * @param table - Tabla de contingencia ya calculada.
 * @param rowName - Nombre de la variable de filas.
 * @param columnName - Nombre de la variable de columnas.
 */
export function interpretContingency(
  table: ContingencyResult,
  rowName: string,
  columnName: string,
): Interpretation {
  const n = table.grandTotal;
  if (n === 0) {
    return {
      headline: `No hay casos con ${rowName} y ${columnName} a la vez.`,
      details: [],
      caveats: [],
    };
  }

  let best = { row: 0, column: 0, count: -1 };
  table.cells.forEach((cells, row) =>
    cells.forEach((cell, column) => {
      if (cell.absolute > best.count) best = { row, column, count: cell.absolute };
    }),
  );
  const headline =
    `La combinación más común es ${quote(table.rowLabels[best.row] ?? "")} con ` +
    `${quote(table.columnLabels[best.column] ?? "")}: ${formatCount(best.count)} de ` +
    `${formatCount(n)} casos (${formatShare(best.count / n)}).`;

  const details: string[] = [];
  table.rowLabels.slice(0, DESCRIBED_ROWS).forEach((label, row) => {
    const cells = table.cells[row] ?? [];
    const total = table.rowTotals[row] ?? 0;
    if (total === 0 || cells.length === 0) return;
    let top = 0;
    cells.forEach((cell, column) => {
      if (cell.absolute > (cells[top]?.absolute ?? 0)) top = column;
    });
    details.push(
      `De ${quote(label)} (${formatCount(total)} casos), la mayor parte está en ${quote(
        table.columnLabels[top] ?? "",
      )} (${formatShare((cells[top]?.absolute ?? 0) / total)}).`,
    );
  });

  let widestGap = 0;
  table.columnLabels.forEach((_label, column) => {
    const percents = table.rowLabels
      .map((_row, row) =>
        (table.rowTotals[row] ?? 0) > 0 ? table.cells[row]?.[column] : undefined,
      )
      .filter((cell) => cell !== undefined)
      .map((cell) => cell.rowPercent);
    if (percents.length < 2) return;
    widestGap = Math.max(widestGap, Math.max(...percents) - Math.min(...percents));
  });
  details.push(
    widestGap > ASSOCIATION_GAP
      ? `Los grupos de ${rowName} se reparten de forma bastante distinta en ${columnName}: puede haber relación entre las dos.`
      : `Los grupos de ${rowName} se reparten de forma parecida en ${columnName}: no se ve una relación clara.`,
  );

  const caveats = [
    "Este cruce describe estos datos; para saber si la relación es real o pudo darse por azar hace falta una prueba de hipótesis (chi-cuadrado).",
  ];
  if (n < 30) {
    caveats.push(`Con solo ${formatCount(n)} casos los porcentajes pueden cambiar mucho.`);
  }
  return { headline, details, caveats };
}

/**
 * Paso a paso de un cruce: contar las combinaciones, sacar los totales y
 * pasar a porcentajes por fila, con el ejemplo de la combinación más común.
 */
export function contingencySteps(
  table: ContingencyResult,
  rowName: string,
  columnName: string,
): CalculationStep[] {
  const n = table.grandTotal;
  if (n === 0) return [];
  let best = { row: 0, column: 0, count: -1 };
  table.cells.forEach((cells, row) =>
    cells.forEach((cell, column) => {
      if (cell.absolute > best.count) best = { row, column, count: cell.absolute };
    }),
  );
  const rowLabel = table.rowLabels[best.row] ?? "";
  const columnLabel = table.columnLabels[best.column] ?? "";
  const rowTotal = table.rowTotals[best.row] ?? 0;
  return [
    {
      title: "1. Contar las combinaciones",
      text: `Para cada pareja de categorías se cuenta cuántos casos tienen las dos a la vez; los totales de fila y de columna suman esos conteos. En total hay ${formatCount(n)} casos.`,
      formula: `${quote(rowLabel)} y ${quote(columnLabel)}: ${formatCount(best.count)} casos`,
      excel: `=CONTAR.SI.CONJUNTO(rango_${rowName}; "${rowLabel}"; rango_${columnName}; "${columnLabel}")`,
    },
    {
      title: "2. Porcentaje dentro de cada grupo",
      text: `Para comparar grupos de distinto tamaño, cada conteo se divide entre el total de su fila (${rowName}).`,
      formula: `${formatCount(best.count)} / ${formatCount(rowTotal)} · 100 = ${formatShare(rowTotal === 0 ? 0 : best.count / rowTotal)} de ${quote(rowLabel)} está en ${quote(columnLabel)}`,
    },
    {
      title: "3. Porcentaje sobre el total",
      formula: `${formatCount(best.count)} / ${formatCount(n)} · 100 = ${formatShare(best.count / n)} de todos los casos`,
    },
  ];
}
