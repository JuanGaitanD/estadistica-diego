import type { Column } from "./types";

/**
 * Extrae los valores de una columna como vector numérico, descartando
 * faltantes (`null`) y cualquier valor no numérico residual.
 */
export function toNumericVector(column: Column): number[] {
  return column.values.filter((v): v is number => typeof v === "number");
}

/**
 * Extrae los valores de una columna como vector categórico de texto,
 * descartando faltantes. Los números se convierten a su representación en
 * texto para poder tratarlos como categorías cuando corresponda.
 */
export function toCategoricalVector(column: Column): string[] {
  return column.values.filter((v): v is string | number => v !== null).map((v) => String(v));
}
