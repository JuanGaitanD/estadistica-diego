import type { NumberFormat } from "./types";

/**
 * Resultado de interpretar una cadena como número, incluyendo si hubo
 * ambigüedad entre el formato español (`1.234,56`) y el inglés (`1,234.56`).
 */
export interface NumberParseResult {
  /** Valor numérico interpretado, o `null` si la cadena no es un número. */
  readonly value: number | null;
  /** `true` cuando el separador no pudo determinarse con certeza. */
  readonly ambiguous: boolean;
  /** Formato aplicado para la interpretación final. */
  readonly formatUsed: NumberFormat | "entero";
  /** Número de decimales del valor interpretado (0 si es entero). */
  readonly decimals: number;
}

const ONLY_DIGITS = /^-?\d+$/;

/** Símbolo separador: `,` o `.`. */
export type Separator = "," | ".";

/** Primer grupo válido de un número con separador de miles: 1 a 3 cifras, sin cero a la izquierda. */
const FIRST_GROUP = /^[1-9]\d{0,2}$/;

/** Número con el mismo separador repetido en grupos de 3 (`1.234.567`, `1,234,567`). */
const REPEATED_GROUPS: Readonly<Record<Separator, RegExp>> = {
  ".": /^[1-9]\d{0,2}(?:\.\d{3})+$/,
  ",": /^[1-9]\d{0,2}(?:,\d{3})+$/,
};

/**
 * Qué dice por sí sola una cadena con separadores sobre el uso de cada símbolo:
 * - `decimal` / `thousands`: ese símbolo hace de decimal o de miles sin duda;
 * - `ambiguous`: un único separador con 3 cifras detrás y una parte entera que sí podría
 *   ser un grupo de miles (`4.125`, `1,234`): puede ser miles o decimal;
 * - `invalid`: no es un número bien escrito.
 */
type Shape =
  | { readonly kind: "decimal" | "thousands" | "ambiguous"; readonly symbol: Separator }
  | { readonly kind: "mixed"; readonly decimal: Separator }
  | { readonly kind: "invalid" };

function shapeOf(trimmed: string): Shape {
  const body = trimmed.startsWith("-") ? trimmed.slice(1) : trimmed;
  const hasComma = body.includes(",");
  const hasDot = body.includes(".");
  if (hasComma && hasDot) {
    return { kind: "mixed", decimal: body.lastIndexOf(",") > body.lastIndexOf(".") ? "," : "." };
  }
  const symbol: Separator = hasComma ? "," : ".";
  const parts = body.split(symbol);
  if (parts.length > 2) {
    return REPEATED_GROUPS[symbol].test(body) ? { kind: "thousands", symbol } : { kind: "invalid" };
  }
  const [integer = "", fraction = ""] = parts;
  // Con 3 cifras detrás solo es dudoso si la parte entera podría ser un primer grupo de miles:
  // `0.125`, `.125` o `1234.567` no pueden ser miles, así que son decimales.
  if (fraction.length === 3 && FIRST_GROUP.test(integer)) return { kind: "ambiguous", symbol };
  return { kind: "decimal", symbol };
}

/**
 * Mira las celdas de una columna que no dejan dudas y devuelve qué símbolo usa de decimal,
 * o `undefined` si no hay pruebas o se contradicen. Sirve para resolver, en la misma columna,
 * las celdas ambiguas como `4.125`.
 *
 * Un símbolo es el decimal de la columna cuando alguna celda lo usa como decimal (`2.5`) o
 * usa el otro como miles (`1,234.5`), y ninguna lo contradice.
 */
export function detectColumnDecimal(rawValues: readonly string[]): Separator | undefined {
  const decimal = new Set<Separator>();
  const thousands = new Set<Separator>();
  for (const raw of rawValues) {
    const trimmed = raw.trim();
    if (ONLY_DIGITS.test(trimmed) || !/^-?[\d.,]+$/.test(trimmed) || !/\d/.test(trimmed)) continue;
    const shape = shapeOf(trimmed);
    if (shape.kind === "decimal") decimal.add(shape.symbol);
    else if (shape.kind === "thousands") thousands.add(shape.symbol);
    else if (shape.kind === "mixed") {
      decimal.add(shape.decimal);
      thousands.add(shape.decimal === "," ? "." : ",");
    }
  }
  const dotIsDecimal = decimal.has(".") || thousands.has(",");
  const commaIsDecimal = decimal.has(",") || thousands.has(".");
  if (dotIsDecimal === commaIsDecimal) return undefined;
  return dotIsDecimal ? "." : ",";
}

/**
 * Interpreta una cadena de texto como número, admitiendo formato español
 * (coma decimal, punto de miles: `1.234,56`) o inglés (punto decimal, coma
 * de miles: `1,234.56`).
 *
 * Heurística de desambiguación cuando `format` es `undefined` ("auto"):
 * 1. Si aparecen `,` y `.`, el símbolo que aparece **más a la derecha** es el
 *    separador decimal; el otro se trata como separador de miles y se elimina.
 * 2. Si un mismo símbolo se repite en grupos de 3 (`1.234.567`), es de miles.
 * 3. Si solo aparece uno de los dos símbolos una vez y le siguen 1, 2 o más
 *    de 3 dígitos, o la parte entera no puede ser un grupo de miles
 *    (`0.125`, `1234.567`), es el separador decimal.
 * 4. Si le siguen exactamente 3 dígitos y la parte entera sí podría ser un
 *    grupo de miles (`4.125`, `1,234`) es ambiguo. Se resuelve con la columna:
 *    si `columnDecimal` dice cuál es el decimal de las demás celdas, se usa;
 *    si no hay pruebas, se asume separador de miles y se marca `ambiguous: true`
 *    para que la capa superior avise a la persona usuaria.
 * 5. Si se indica `format` explícitamente, se fuerza esa interpretación sin
 *    ambigüedad.
 *
 * @param raw cadena a interpretar (puede incluir espacios en los extremos).
 * @param format fuerza el formato "es" o "en"; si se omite, se autodetecta.
 * @param columnDecimal decimal de la columna según `detectColumnDecimal`; solo se usa en "auto".
 */
export function parseLocaleNumber(
  raw: string,
  format?: NumberFormat,
  columnDecimal?: Separator,
): NumberParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { value: null, ambiguous: false, formatUsed: "entero", decimals: 0 };
  }

  if (ONLY_DIGITS.test(trimmed)) {
    return { value: Number(trimmed), ambiguous: false, formatUsed: "entero", decimals: 0 };
  }

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  if (!hasComma && !hasDot) {
    const value = Number(trimmed);
    return Number.isFinite(value)
      ? { value, ambiguous: false, formatUsed: "entero", decimals: 0 }
      : { value: null, ambiguous: false, formatUsed: "entero", decimals: 0 };
  }

  if (format === "es") return interpretAs("es", trimmed);
  if (format === "en") return interpretAs("en", trimmed);

  const shape = shapeOf(trimmed);
  const asDecimal = (symbol: Separator) => interpretAs(symbol === "," ? "es" : "en", trimmed);
  const asThousands = (symbol: Separator) => interpretAs(symbol === "," ? "en" : "es", trimmed);

  switch (shape.kind) {
    case "invalid":
      return { value: null, ambiguous: false, formatUsed: "entero", decimals: 0 };
    case "mixed":
      return asDecimal(shape.decimal);
    case "thousands":
      return asThousands(shape.symbol);
    case "decimal":
      return asDecimal(shape.symbol);
    case "ambiguous": {
      if (columnDecimal === undefined) return { ...asThousands(shape.symbol), ambiguous: true };
      return columnDecimal === shape.symbol ? asDecimal(shape.symbol) : asThousands(shape.symbol);
    }
  }
}

function interpretAs(format: NumberFormat, raw: string): NumberParseResult {
  let normalized: string;
  if (format === "es") {
    normalized = raw.replaceAll(".", "").replace(",", ".");
  } else {
    normalized = raw.replaceAll(",", "");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return { value: null, ambiguous: false, formatUsed: format, decimals: 0 };
  }
  const decimalPart = normalized.split(".")[1];
  const decimals = decimalPart ? decimalPart.length : 0;
  return { value, ambiguous: false, formatUsed: format, decimals };
}
