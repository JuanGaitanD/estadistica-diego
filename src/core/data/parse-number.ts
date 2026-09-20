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

/**
 * Interpreta una cadena de texto como número, admitiendo formato español
 * (coma decimal, punto de miles: `1.234,56`) o inglés (punto decimal, coma
 * de miles: `1,234.56`).
 *
 * Heurística de desambiguación cuando `format` es `undefined` ("auto"):
 * 1. Si aparecen `,` y `.`, el símbolo que aparece **más a la derecha** es el
 *    separador decimal; el otro se trata como separador de miles y se elimina.
 * 2. Si solo aparece uno de los dos símbolos una vez y le siguen exactamente
 *    3 dígitos hasta el final (p. ej. `1.234` o `1,234`), es ambiguo: podría
 *    ser un separador de miles (número entero) o un decimal con 3 cifras.
 *    En ese caso se asume separador de miles (formato inglés con `,` o
 *    formato es con `.`) y se marca `ambiguous: true` para que la capa
 *    superior pueda avisar a la persona usuaria.
 * 3. Si el símbolo aparece seguido de 1, 2 o más de 3 dígitos, se interpreta
 *    como separador decimal (no es un grupo de miles válido).
 * 4. Si se indica `format` explícitamente, se fuerza esa interpretación sin
 *    ambigüedad.
 *
 * @param raw cadena a interpretar (puede incluir espacios en los extremos).
 * @param format fuerza el formato "es" o "en"; si se omite, se autodetecta.
 */
export function parseLocaleNumber(raw: string, format?: NumberFormat): NumberParseResult {
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

  if (hasComma && hasDot) {
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    const decimalIsComma = lastComma > lastDot;
    return interpretAs(decimalIsComma ? "es" : "en", trimmed);
  }

  // Solo uno de los dos símbolos presente.
  const symbol = hasComma ? "," : ".";
  const parts = trimmed.split(symbol);
  const lastPart = parts[parts.length - 1] ?? "";
  const onlyOneSeparator = parts.length === 2;
  const looksLikeThousands = onlyOneSeparator && lastPart.length === 3;

  if (looksLikeThousands) {
    // Ambiguo: 3 dígitos tras el separador podría ser miles o decimales.
    const asThousands = interpretAs(symbol === "," ? "en" : "es", trimmed);
    return { ...asThousands, ambiguous: true };
  }

  return interpretAs(symbol === "," ? "es" : "en", trimmed);
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
