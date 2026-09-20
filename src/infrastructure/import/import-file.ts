import { DatasetSizeError } from "@/core/data";
import type { Dataset } from "@/core/data";
import { ImportError } from "./errors";
import { importFileOptionsSchema, type ImportFileOptionsInput } from "./schemas";

/** Tamaño máximo de archivo admitido (10 MB). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const CSV_MIME_TYPES = new Set(["text/csv", "application/vnd.ms-excel", "text/plain"]);
const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
]);

type SupportedExtension = "csv" | "xlsx" | "xls";

function detectExtension(file: File): SupportedExtension | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".xlsx")) return "xlsx";
  if (name.endsWith(".xls")) return "xls";
  if (CSV_MIME_TYPES.has(file.type) && file.type === "text/csv") return "csv";
  if (XLSX_MIME_TYPES.has(file.type)) return "xlsx";
  return null;
}

/**
 * Importa un archivo CSV o XLSX y produce un `Dataset`, eligiendo el
 * adaptador correcto según su extensión o tipo MIME. Valida tamaño máximo
 * (10 MB) y tipo de archivo antes de procesarlo. Los adaptadores se cargan
 * de forma dinámica (`await import(...)`) para no incluir PapaParse ni
 * SheetJS en el paquete inicial de la aplicación.
 *
 * @throws {ImportError} con un `code` tipificado y mensaje en español si el
 * archivo está vacío, es demasiado grande, tiene un tipo no soportado, o el
 * contenido no puede interpretarse como tabla de datos.
 */
export async function importFile(file: File, options: ImportFileOptionsInput): Promise<Dataset> {
  const parsedOptions = importFileOptionsSchema.parse(options);

  if (file.size === 0) {
    throw new ImportError("archivo-vacio", "El archivo está vacío. Elige un archivo con datos.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImportError(
      "demasiado-grande",
      `El archivo pesa más de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB. Usa un archivo más pequeño.`,
    );
  }

  const extension = detectExtension(file);
  if (extension === null) {
    throw new ImportError(
      "tipo-no-soportado",
      "El tipo de archivo no es compatible. Usa un archivo CSV o Excel (.xlsx).",
    );
  }

  const missing = parsedOptions.missing
    ? {
        tokens: parsedOptions.missing.tokens,
        ...(parsedOptions.missing.caseSensitive !== undefined
          ? { caseSensitive: parsedOptions.missing.caseSensitive }
          : {}),
      }
    : undefined;

  try {
    if (extension === "csv") {
      const { importCsvFile } = await import("./csv-importer");
      return await importCsvFile(file, {
        hasHeader: parsedOptions.hasHeader,
        ...(missing ? { missing } : {}),
        ...(parsedOptions.numberFormat ? { numberFormat: parsedOptions.numberFormat } : {}),
      });
    }

    const { importXlsxFile } = await import("./xlsx-importer");
    return await importXlsxFile(file, {
      hasHeader: parsedOptions.hasHeader,
      ...(parsedOptions.sheetName ? { sheetName: parsedOptions.sheetName } : {}),
      ...(missing ? { missing } : {}),
      ...(parsedOptions.numberFormat ? { numberFormat: parsedOptions.numberFormat } : {}),
    });
  } catch (error) {
    if (error instanceof ImportError) throw error;
    if (error instanceof DatasetSizeError) {
      throw new ImportError("tamano-dataset", error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ImportError(
      "formato-invalido",
      `No se pudo leer el archivo: ${message}. Verifica que el formato sea correcto.`,
    );
  }
}

/** Lista las hojas disponibles de un archivo XLSX, para que la UI permita elegir. */
export async function listAvailableSheets(file: File): Promise<readonly string[]> {
  const { listXlsxSheets } = await import("./xlsx-importer");
  return listXlsxSheets(file);
}
