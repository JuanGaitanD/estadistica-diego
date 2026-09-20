/**
 * Paquete "Cálculos de siempre" (RF-13): la preselección sensata según los
 * tipos de variable que la persona usuaria confirmó en el paso 2.
 */
import { appliesTo, type ChartKind } from "@/components/charts";

import type { CalculationSelection, ColumnConfig } from "./types";
import { isQuantitative } from "./validation";

const ALL_CHART_KINDS: readonly ChartKind[] = ["pie", "bar", "polygon", "ogive"];

/**
 * Devuelve la selección habitual: tabla de frecuencias con porcentajes y
 * acumulados, moda, mediana, promedio aritmético, cuartiles, rango,
 * variabilidad completa y las gráficas que apliquen a cada variable.
 *
 * @param columns - Columnas incluidas en el análisis.
 * @param current - Selección vigente (se conservan las preferencias de formato).
 */
export function usualSelection(
  columns: readonly ColumnConfig[],
  current: CalculationSelection,
): CalculationSelection {
  const included = columns.filter((column) => column.include);
  const hayContinua = included.some((column) => column.kind === "continua");
  const grouped = hayContinua;

  const charts: Record<string, ChartKind[]> = {};
  for (const column of included) {
    const isGrouped = grouped && isQuantitative(column.kind);
    charts[column.id] = ALL_CHART_KINDS.filter(
      (kind) => appliesTo(kind, column.kind, isGrouped).ok,
    );
  }

  const cualitativas = included.filter((column) => !isQuantitative(column.kind));
  const cruzables = [...cualitativas, ...included.filter((column) => column.kind === "discreta")];
  const contingency = cruzables.length >= 2;

  return {
    ...current,
    frequencies: true,
    relativeMode: "porcentaje",
    cumulative: included.some((column) => column.kind !== "nominal"),
    grouped,
    rule: "sturges",

    mode: true,
    median: true,
    arithmetic: included.some((column) => isQuantitative(column.kind)),
    weighted: false,
    weightsVariableId: null,
    geometric: false,
    harmonic: false,

    quartiles: true,
    quartileMethod: "inclusivo",
    deciles: false,
    percentiles: false,

    range: true,
    variance: true,
    standardDeviation: true,
    coefficientOfVariation: true,
    iqr: true,

    contingency,
    contingencyRowId: contingency ? (cruzables[0]?.id ?? null) : null,
    contingencyColumnId: contingency ? (cruzables[1]?.id ?? null) : null,
    contingencyPercentages: contingency ? "total" : "ninguno",

    charts,
  };
}
