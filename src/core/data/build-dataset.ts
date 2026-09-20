import { assertWithinCellLimit } from "./limits";
import { DEFAULT_MISSING_CONFIG, isMissingToken } from "./missing";
import { inferVariableKind } from "./infer-kind";
import { parseLocaleNumber } from "./parse-number";
import type {
  CellValue,
  Column,
  Dataset,
  DatasetSource,
  DatasetWarning,
  MissingValueConfig,
  NumberFormat,
  Variable,
} from "./types";

/** Umbral a partir del cual se avisa que una variable tiene muchas categorías. */
const MANY_CATEGORIES_THRESHOLD = 30;

/** Opciones para construir un `Dataset` a partir de una matriz cruda de celdas. */
export interface BuildDatasetOptions {
  readonly source: DatasetSource;
  readonly sourceName?: string;
  /** Nombres de columna; su longitud determina el número de columnas. */
  readonly headers: readonly string[];
  /** Configuración de detección de valores faltantes. */
  readonly missing?: MissingValueConfig;
  /** Formato numérico a forzar; si se omite, se autodetecta por columna. */
  readonly numberFormat?: NumberFormat;
  /** Orden declarado de categorías por nombre de columna, para variables ordinales. */
  readonly ordinalOrders?: Readonly<Record<string, readonly string[]>>;
}

/** Genera un id de variable estable a partir de su nombre, evitando colisiones. */
function slugify(name: string, usedIds: Set<string>): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "columna";

  let candidate = base;
  let counter = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

/**
 * Construye un `Dataset` a partir de una matriz de filas (cada celda puede
 * ser texto crudo, número ya interpretado o `null`). Se encarga de:
 * detectar faltantes, interpretar números en texto, inferir el tipo de cada
 * variable, y generar advertencias en español (tamaño, tipo mixto, muchas
 * categorías, decimales ambiguos).
 *
 * Es la lógica compartida entre los importadores de texto, CSV y XLSX.
 */
export function buildDataset(
  rows: readonly (readonly CellValue[])[],
  options: BuildDatasetOptions,
): Dataset {
  const columnCount = options.headers.length;
  assertWithinCellLimit(rows.length, columnCount);

  const missingConfig = options.missing ?? DEFAULT_MISSING_CONFIG;
  const usedIds = new Set<string>();
  const warnings: DatasetWarning[] = [];

  const columns: Column[] = options.headers.map((name, colIndex) => {
    const id = slugify(name, usedIds);
    const rawColumn = rows.map((row) => row[colIndex] ?? null);

    let missingCount = 0;
    let ambiguousDecimals = false;

    const values: CellValue[] = rawColumn.map((raw) => {
      if (raw === null) {
        missingCount += 1;
        return null;
      }
      if (typeof raw === "number") return raw;

      if (isMissingToken(raw, missingConfig)) {
        missingCount += 1;
        return null;
      }

      const looksNumeric = /^-?[\d.,]+$/.test(raw.trim()) && /\d/.test(raw);
      if (looksNumeric) {
        const parsed = parseLocaleNumber(raw, options.numberFormat);
        if (parsed.value !== null) {
          if (parsed.ambiguous) ambiguousDecimals = true;
          return parsed.value;
        }
      }
      return raw.trim();
    });

    if (missingCount > 0) {
      warnings.push({
        code: "faltantes",
        variableId: id,
        message: `La variable "${name}" tiene ${missingCount} valor(es) faltante(s).`,
      });
    }

    if (ambiguousDecimals) {
      warnings.push({
        code: "decimal-ambiguo",
        variableId: id,
        message: `No fue posible determinar con certeza el formato decimal de "${name}" (español o inglés); revisa los valores.`,
      });
    }

    const declaredOrder = options.ordinalOrders?.[name];
    const inference = inferVariableKind(values, declaredOrder);

    const nonNull = values.filter((v): v is string | number => v !== null);
    const numericCount = nonNull.filter((v) => typeof v === "number").length;
    if (numericCount > 0 && numericCount < nonNull.length) {
      warnings.push({
        code: "tipo-mixto",
        variableId: id,
        message: `La variable "${name}" mezcla texto y números; revisa sus valores.`,
      });
    }

    const distinctCategories = new Set(nonNull.map(String)).size;
    if (inference.kind === "nominal" || inference.kind === "ordinal") {
      if (distinctCategories > MANY_CATEGORIES_THRESHOLD) {
        warnings.push({
          code: "muchas-categorias",
          variableId: id,
          message: `La variable "${name}" tiene ${distinctCategories} categorías distintas; considera agruparlas.`,
        });
      }
    }

    const numericValues = nonNull.filter((v): v is number => typeof v === "number");
    const decimalsDetected = numericValues.reduce((max, v) => {
      const str = String(v);
      const dot = str.indexOf(".");
      const d = dot === -1 ? 0 : str.length - dot - 1;
      return Math.max(max, d);
    }, 0);

    const variable: Variable = {
      id,
      name,
      kind: inference.kind,
      kindInferred: inference.kind,
      kindConfirmedByUser: false,
      ...(declaredOrder ? { categoryOrder: declaredOrder } : {}),
      ...(decimalsDetected > 0 ? { decimals: decimalsDetected } : {}),
    };

    return { variable, values, missingCount };
  });

  const cellCount = rows.length * columnCount;
  if (cellCount > MAX_CELLS_WARNING_THRESHOLD) {
    warnings.push({
      code: "tamano",
      message: `El dataset es grande (${cellCount.toLocaleString("es-ES")} celdas); el análisis puede tardar más de lo habitual.`,
    });
  }

  return {
    id: crypto.randomUUID(),
    source: options.source,
    ...(options.sourceName ? { sourceName: options.sourceName } : {}),
    columns,
    rowCount: rows.length,
    createdAt: new Date().toISOString(),
    warnings,
  };
}

const MAX_CELLS_WARNING_THRESHOLD = 50_000;
