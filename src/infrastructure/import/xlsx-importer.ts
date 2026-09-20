import * as XLSX from "xlsx";
import { buildDataset } from "@/core/data";
import type { CellValue, Dataset, MissingValueConfig, NumberFormat } from "@/core/data";

/** Opciones para importar un archivo XLSX. */
export interface ImportXlsxOptions {
  readonly hasHeader: boolean;
  /** Nombre de la hoja a importar; por defecto la primera. */
  readonly sheetName?: string;
  readonly missing?: MissingValueConfig;
  readonly numberFormat?: NumberFormat;
}

/** Lee los nombres de hoja disponibles en un archivo XLSX, sin importarlo. */
export async function listXlsxSheets(file: File): Promise<readonly string[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames;
}

/**
 * Convierte una hoja de un archivo XLSX en un `Dataset`. Las fechas se
 * convierten a texto en formato ISO-8601 (`YYYY-MM-DD`); la primera hoja se
 * usa por defecto si no se indica `sheetName`.
 */
export async function importXlsxFile(file: File, options: ImportXlsxOptions): Promise<Dataset> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = options.sheetName ?? workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El archivo de Excel no contiene ninguna hoja.");
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`La hoja "${sheetName}" no existe en el archivo.`);
  }

  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const rows: CellValue[][] = matrix
    .filter((row) => row.length > 0)
    .map((row) =>
      row.map((cell): CellValue => {
        if (cell === null || cell === undefined || cell === "") return null;
        if (cell instanceof Date) {
          const iso = cell.toISOString();
          const datePart = iso.split("T")[0];
          return datePart ?? iso;
        }
        if (typeof cell === "number" || typeof cell === "string") return cell;
        return String(cell);
      }),
    );

  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headerRow = options.hasHeader ? rows[0] : undefined;
  const dataRows = options.hasHeader ? rows.slice(1) : rows;
  const headers = options.hasHeader
    ? (headerRow ?? []).map((h, i) =>
        h !== null && String(h).trim().length > 0 ? String(h).trim() : `Columna ${i + 1}`,
      )
    : Array.from({ length: columnCount }, (_, i) => `Columna ${i + 1}`);

  return buildDataset(dataRows, {
    source: "xlsx",
    headers,
    sourceName: `${file.name} · ${sheetName}`,
    ...(options.missing ? { missing: options.missing } : {}),
    ...(options.numberFormat ? { numberFormat: options.numberFormat } : {}),
  });
}
