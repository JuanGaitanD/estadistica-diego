import type { Dataset } from "@/core/data";

/**
 * Hoja editable (RF-45): una cuadrícula de texto con nombres de columna. Al
 * usarla se convierte en texto tabulado y pasa por el mismo lector que el
 * texto pegado, así que decimales, faltantes y tipos se resuelven igual.
 */
export interface Grid {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** Filas máximas que se editan a mano; más que eso se corrige en el archivo. */
export const GRID_MAX_ROWS = 1000;

const NUMBER = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 10, useGrouping: false });

/** Hoja vacía para escribir desde cero. */
export function emptyGrid(columns = 2, rows = 5): Grid {
  return {
    headers: Array.from({ length: columns }, (_, index) => `Columna ${index + 1}`),
    rows: Array.from({ length: rows }, () => Array.from({ length: columns }, () => "")),
  };
}

/**
 * Hoja a partir de los datos cargados. Los números se escriben con coma
 * decimal y sin separador de miles (`1234,5`) para que se lean igual al volver.
 */
export function gridFromDataset(dataset: Dataset): Grid {
  const rowCount = Math.min(dataset.rowCount, GRID_MAX_ROWS);
  const rows: string[][] = [];
  for (let row = 0; row < rowCount; row += 1) {
    rows.push(
      dataset.columns.map((column) => {
        const value = column.values[row];
        if (value === null || value === undefined) return "";
        return typeof value === "number" ? NUMBER.format(value) : value;
      }),
    );
  }
  return { headers: dataset.columns.map((column) => column.variable.name), rows };
}

const clean = (cell: string): string => cell.replace(/[\t\r\n]+/g, " ").trim();

/** Texto tabulado con la fila de nombres; omite filas completamente vacías. */
export function gridToTsv(grid: Grid): string {
  const body = grid.rows.filter((row) => row.some((cell) => cell.trim() !== ""));
  return [grid.headers, ...body].map((row) => row.map(clean).join("\t")).join("\n");
}

/** Cambia una celda. */
export function setCell(grid: Grid, row: number, column: number, value: string): Grid {
  return {
    ...grid,
    rows: grid.rows.map((cells, r) =>
      r === row ? cells.map((cell, c) => (c === column ? value : cell)) : cells,
    ),
  };
}

/** Cambia el nombre de una columna. */
export function setHeader(grid: Grid, column: number, value: string): Grid {
  return { ...grid, headers: grid.headers.map((name, c) => (c === column ? value : name)) };
}

export function addRow(grid: Grid): Grid {
  return { ...grid, rows: [...grid.rows, grid.headers.map(() => "")] };
}

export function addColumn(grid: Grid): Grid {
  return {
    headers: [...grid.headers, `Columna ${grid.headers.length + 1}`],
    rows: grid.rows.map((row) => [...row, ""]),
  };
}

export function removeRow(grid: Grid, row: number): Grid {
  return { ...grid, rows: grid.rows.filter((_, r) => r !== row) };
}

export function removeColumn(grid: Grid, column: number): Grid {
  if (grid.headers.length <= 1) return grid;
  return {
    headers: grid.headers.filter((_, c) => c !== column),
    rows: grid.rows.map((row) => row.filter((_, c) => c !== column)),
  };
}

/**
 * Pega un bloque copiado de Excel u Hojas de cálculo (tabuladores y saltos de
 * línea) a partir de una celda; crece en filas y columnas si hace falta.
 */
export function pasteBlock(grid: Grid, row: number, column: number, text: string): Grid {
  const block = text
    .replace(/\r\n?/g, "\n")
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => line.split("\t"));
  const width = Math.max(
    grid.headers.length,
    column + Math.max(...block.map((line) => line.length)),
  );
  const height = Math.max(grid.rows.length, row + block.length);
  const headers = [...grid.headers];
  while (headers.length < width) headers.push(`Columna ${headers.length + 1}`);
  const rows = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      const pasted = block[r - row]?.[c - column];
      return pasted !== undefined ? pasted.trim() : (grid.rows[r]?.[c] ?? "");
    }),
  );
  return { headers, rows };
}
