import { buildDataset, parsePastedText, SINGLE_LIST_COLUMN } from "@/core/data";
import type {
  Dataset,
  DatasetWarning,
  MissingValueConfig,
  NumberFormat,
  TextDelimiter,
} from "@/core/data";

/** Opciones para importar texto pegado por la persona usuaria. */
export interface ImportTextOptions {
  readonly hasHeader: boolean;
  readonly delimiter?: TextDelimiter;
  readonly missing?: MissingValueConfig;
  readonly numberFormat?: NumberFormat;
}

/**
 * Convierte texto pegado (una o varias columnas) en un `Dataset`, reutilizando
 * el parser puro de `core/data`.
 */
export function importPastedText(text: string, options: ImportTextOptions): Dataset {
  const parsed = parsePastedText(text, {
    hasHeader: options.hasHeader,
    ...(options.delimiter ? { delimiter: options.delimiter } : {}),
    ...(options.numberFormat === "es" ? { decimalComma: true } : {}),
  });
  const dataset = buildDataset(parsed.rows, {
    source: "texto",
    headers: parsed.headers,
    ...(options.missing ? { missing: options.missing } : {}),
    ...(options.numberFormat ? { numberFormat: options.numberFormat } : {}),
  });

  const extra: DatasetWarning[] = [];
  if (parsed.transposedSingleList) {
    extra.push({
      code: "lista-transpuesta",
      message:
        `Pegaste los datos en una sola línea, así que los leímos como una única variable ` +
        `("${SINGLE_LIST_COLUMN}") con ${dataset.rowCount} dato(s). Si en realidad era una fila ` +
        `de varias variables, ponlas en columnas (una por línea) o sube un archivo.`,
    });
  }
  if (parsed.ambiguousDecimalList) {
    extra.push({
      code: "decimal-ambiguo",
      message:
        "En tu lista hay comas pegadas a los números (como 1,5) y comas que separan datos " +
        '(como "4, 7"). Si 1,5 es un decimal, elige "Coma decimal" en "Formato de los ' +
        'decimales"; si son datos distintos, déjalo en "Automático".',
    });
  }
  if (extra.length === 0) return dataset;
  return { ...dataset, warnings: [...dataset.warnings, ...extra] };
}
