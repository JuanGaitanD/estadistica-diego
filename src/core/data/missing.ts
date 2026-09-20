import type { MissingValueConfig } from "./types";

/**
 * Tokens de texto reconocidos por defecto como valor faltante, además de la
 * cadena vacía (que siempre se trata como faltante).
 */
export const DEFAULT_MISSING_TOKENS: readonly string[] = [
  "NA",
  "N/A",
  "NULL",
  "-",
  "#N/A",
  "S/D",
  "SIN DATO",
];

/** Configuración de faltantes por defecto (no distingue mayúsculas/minúsculas). */
export const DEFAULT_MISSING_CONFIG: MissingValueConfig = {
  tokens: DEFAULT_MISSING_TOKENS,
  caseSensitive: false,
};

/**
 * Determina si un valor de texto crudo debe tratarse como faltante según la
 * configuración dada. Recorta espacios en los extremos antes de comparar.
 */
export function isMissingToken(
  raw: string,
  config: MissingValueConfig = DEFAULT_MISSING_CONFIG,
): boolean {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return true;
  const caseSensitive = config.caseSensitive ?? false;
  const candidate = caseSensitive ? trimmed : trimmed.toUpperCase();
  return config.tokens.some((token) => {
    const normalized = caseSensitive ? token : token.toUpperCase();
    return normalized === candidate;
  });
}
