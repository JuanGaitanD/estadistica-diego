// SheetJS se carga al exportar, no al abrir la app.
import type { Dataset } from "@/core/data";

/**
 * Celda con fórmula viva. La fórmula va en la sintaxis interna de Excel
 * (nombres en inglés y comas, `SLOPE(B2:B6,A2:A6)`); Excel la muestra
 * traducida (`=PENDIENTE(B2:B6;A2:A6)`). `value` es el resultado ya
 * calculado, para que el libro se lea bien antes de recalcular.
 */
export interface FormulaCell {
  readonly formula: string;
  readonly value?: number;
}

/** Valor de una celda exportable. */
export type ExportCell = string | number | null | FormulaCell;

/** Tabla genérica exportable como una hoja de cálculo. */
export interface ExportableTable {
  readonly title: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly ExportCell[])[];
}

function isFormula(cell: ExportCell): cell is FormulaCell {
  return typeof cell === "object" && cell !== null;
}

function sanitizeSheetName(name: string, used: Set<string>): string {
  // Excel prohíbe : \ / ? * [ ] y limita a 31 caracteres.
  const base =
    name
      .replace(/[:\\/?*[\]]/g, " ")
      .trim()
      .slice(0, 31) || "Hoja";
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${base.slice(0, 28)} (${counter})`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

function datasetToTable(dataset: Dataset): ExportableTable {
  const columns = dataset.columns.map((c) => c.variable.name);
  const rows: (string | number | null)[][] = [];
  for (let row = 0; row < dataset.rowCount; row += 1) {
    rows.push(dataset.columns.map((c) => c.values[row] ?? null));
  }
  return { title: dataset.sourceName ?? "Datos", columns, rows };
}

/**
 * Genera un libro XLSX a partir de un `Dataset` o de una lista de tablas
 * genéricas `{ title, columns, rows }`, con una hoja por tabla.
 */
function isDataset(input: Dataset | readonly ExportableTable[]): input is Dataset {
  return !Array.isArray(input);
}

export async function exportDatasetToXlsx(
  input: Dataset | readonly ExportableTable[],
): Promise<Blob> {
  const XLSX = await import("xlsx");
  const tables: readonly ExportableTable[] = isDataset(input) ? [datasetToTable(input)] : input;
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const table of tables) {
    const sheetName = sanitizeSheetName(table.title, usedNames);
    const aoa: (string | number | null)[][] = [
      [...table.columns],
      ...table.rows.map((r) => r.map((cell) => (isFormula(cell) ? null : cell))),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    table.rows.forEach((row, rowIndex) =>
      row.forEach((cell, columnIndex) => {
        if (!isFormula(cell)) return;
        const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
        sheet[address] = {
          t: "n",
          f: cell.formula,
          ...(cell.value !== undefined ? { v: cell.value } : {}),
        };
      }),
    );
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  const buffer: ArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
