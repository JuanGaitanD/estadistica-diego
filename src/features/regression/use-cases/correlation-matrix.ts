import { completePairs, formatValue, pearson } from "@/core/statistics";

import type { NumericColumn } from "./run-regression";

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Matriz de correlación de Pearson entre todas las columnas numéricas, con
 * pares completos en cada celda (RF-50). Devuelve texto listo para mostrar:
 * «—» cuando una pareja no se puede calcular.
 */
export function correlationMatrix(columns: readonly NumericColumn[]): {
  columns: string[];
  rows: string[][];
} {
  const rows = columns.map((a) => [
    a.name,
    ...columns.map((b) => {
      if (a.id === b.id) return "1";
      const pairs = completePairs(a.values.map(asNumber), b.values.map(asNumber));
      const r = pearson(pairs.x, pairs.y);
      return r === null ? "—" : formatValue(r.r, 2);
    }),
  ]);
  return { columns: ["", ...columns.map((column) => column.name)], rows };
}
