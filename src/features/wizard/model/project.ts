import "@/lib/zod-config";
import { z } from "zod";

import { CHART_KINDS } from "@/components/charts";
import { MAX_CLASSES, MIN_CLASSES } from "@/core/statistics";
import type { Dataset } from "@/core/data";

import { DEFAULT_CALCULATION, type CalculationSelection, type ColumnConfig } from "./types";

const kind = z.enum(["nominal", "ordinal", "discreta", "continua"]);

const columnConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind,
  inferredKind: kind,
  inferredReason: z.string(),
  include: z.boolean(),
  categoryOrder: z.array(z.string()),
});

const workspaceSchema = z.object({
  columns: z.array(columnConfigSchema),
  calculation: z.record(z.string(), z.unknown()),
  calculationCustomized: z.boolean(),
});

/** Lo que se guarda del espacio de trabajo en el archivo de proyecto. */
export interface WorkspaceSnapshot {
  readonly columns: readonly ColumnConfig[];
  readonly calculation: CalculationSelection;
  readonly calculationCustomized: boolean;
}

/** Valores válidos de los campos de opciones cerradas. */
const CHOICES: Readonly<Partial<Record<keyof CalculationSelection, readonly string[]>>> = {
  relativeMode: ["proporcion", "porcentaje"],
  rule: ["sturges", "raiz", "rice", "scott", "freedman-diaconis", "manual"],
  quartileMethod: ["inclusivo", "exclusivo"],
  contingencyPercentages: ["ninguno", "fila", "columna", "total"],
};

/** Campos que guardan el id de una columna de los datos. */
const COLUMN_IDS = new Set(["weightsVariableId", "contingencyRowId", "contingencyColumnId"]);

/** Texto escrito a mano: más largo que esto no viene de la app. */
const MAX_TEXT = 500;

/** ¿El valor del archivo cabe en el rango de ese campo? */
function inRange(key: string, value: unknown, columnIds: ReadonlySet<string>): boolean {
  const choices = CHOICES[key as keyof CalculationSelection];
  if (choices !== undefined) return choices.includes(value as string);
  if (key === "manualK") {
    return (
      Number.isInteger(value) &&
      (value as number) >= MIN_CLASSES &&
      (value as number) <= MAX_CLASSES
    );
  }
  if (COLUMN_IDS.has(key)) return value === null || columnIds.has(value as string);
  if (typeof value === "string") return value.length <= MAX_TEXT;
  return true;
}

/**
 * Selección de cálculos leída de un archivo: cada campo se toma solo si tiene
 * el mismo tipo que el valor por defecto y cabe en su rango (opciones
 * conocidas, K entre 2 y 50, ids de columnas que existen); lo demás queda por
 * defecto.
 */
function mergeCalculation(
  raw: Record<string, unknown>,
  columnIds: ReadonlySet<string>,
): CalculationSelection {
  const merged: Record<string, unknown> = { ...DEFAULT_CALCULATION };
  for (const [key, fallback] of Object.entries(DEFAULT_CALCULATION)) {
    const value = raw[key];
    if (value === undefined) continue;
    const sameType =
      fallback === null
        ? typeof value === "string" || value === null
        : typeof value === typeof fallback;
    if (sameType && inRange(key, value, columnIds)) merged[key] = value;
  }
  const charts = raw.charts;
  merged.charts =
    typeof charts === "object" && charts !== null && !Array.isArray(charts)
      ? Object.fromEntries(
          Object.entries(charts)
            .filter(([id]) => columnIds.has(id))
            .map(([id, kinds]) => [
              id,
              Array.isArray(kinds)
                ? kinds.filter((entry) =>
                    (CHART_KINDS as readonly string[]).includes(entry as string),
                  )
                : [],
            ]),
        )
      : {};
  return merged as unknown as CalculationSelection;
}

/**
 * Restaura el espacio de trabajo de un proyecto. Si la configuración no es
 * válida o no corresponde a las columnas de los datos, se vuelve a deducir de
 * los datos (nunca se pierde el proyecto por eso).
 */
export function restoreWorkspace(raw: unknown, dataset: Dataset): WorkspaceSnapshot | null {
  const parsed = workspaceSchema.safeParse(raw);
  if (!parsed.success) return null;
  const ids = new Set(dataset.columns.map((column) => column.variable.id));
  const columns = parsed.data.columns;
  if (columns.length !== ids.size || columns.some((column) => !ids.has(column.id))) return null;
  return {
    columns,
    calculation: mergeCalculation(parsed.data.calculation, ids),
    calculationCustomized: parsed.data.calculationCustomized,
  };
}
