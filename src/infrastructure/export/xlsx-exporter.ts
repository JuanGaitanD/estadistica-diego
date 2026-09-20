import * as XLSX from "xlsx";
import type { Dataset } from "@/core/data";

/** Tabla genérica exportable como una hoja de cálculo. */
export interface ExportableTable {
  readonly title: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly (string | number | null)[])[];
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

export function exportDatasetToXlsx(input: Dataset | readonly ExportableTable[]): Blob {
  const tables: readonly ExportableTable[] = isDataset(input) ? [datasetToTable(input)] : input;
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const table of tables) {
    const sheetName = sanitizeSheetName(table.title, usedNames);
    const aoa: (string | number | null)[][] = [
      [...table.columns],
      ...table.rows.map((r) => [...r]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  const buffer: ArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
