import Papa from "papaparse";
import { buildDataset } from "@/core/data";
import type { Dataset, MissingValueConfig, NumberFormat } from "@/core/data";

/** Opciones para importar un archivo o texto CSV. */
export interface ImportCsvOptions {
  readonly hasHeader: boolean;
  readonly sourceName?: string;
  readonly missing?: MissingValueConfig;
  readonly numberFormat?: NumberFormat;
}

/** Elimina el BOM (marca de orden de bytes) UTF-8 si está presente. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Convierte un texto en formato CSV (con detección automática de delimitador
 * mediante PapaParse) en un `Dataset`.
 */
export function parseCsvText(text: string, options: ImportCsvOptions): Dataset {
  const clean = stripBom(text);
  const result = Papa.parse<string[]>(clean, {
    delimiter: "", // autodetección de PapaParse
    skipEmptyLines: true,
  });

  const rows = result.data.filter((row) => row.length > 0);
  const headerRow = options.hasHeader ? rows[0] : undefined;
  const dataRows = options.hasHeader ? rows.slice(1) : rows;
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headers = options.hasHeader
    ? (headerRow ?? []).map((h, i) => (h && h.trim().length > 0 ? h.trim() : `Columna ${i + 1}`))
    : Array.from({ length: columnCount }, (_, i) => `Columna ${i + 1}`);

  return buildDataset(dataRows, {
    source: "csv",
    headers,
    ...(options.sourceName ? { sourceName: options.sourceName } : {}),
    ...(options.missing ? { missing: options.missing } : {}),
    ...(options.numberFormat ? { numberFormat: options.numberFormat } : {}),
  });
}

/** Lee un `File` de tipo CSV como texto UTF-8 y lo convierte en `Dataset`. */
export async function importCsvFile(file: File, options: ImportCsvOptions): Promise<Dataset> {
  const text = await file.text();
  return parseCsvText(text, { ...options, sourceName: options.sourceName ?? file.name });
}
