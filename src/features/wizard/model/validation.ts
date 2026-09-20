/**
 * Validación de cada paso del asistente con zod (RF-12).
 *
 * Todos los mensajes están en español y en lenguaje llano: son los que ve la
 * persona usuaria bajo el botón "Continuar" cuando no puede avanzar.
 */
import { z } from "zod";

import type { VariableKind } from "@/core/data";

import type {
  CalculationSelection,
  ColumnConfig,
  StepIndex,
  StepValidation,
  WizardState,
} from "./types";

/** `true` si el tipo admite cálculos numéricos. */
export function isQuantitative(kind: VariableKind): boolean {
  return kind === "discreta" || kind === "continua";
}

/** Columnas marcadas para el análisis. */
export function includedColumns(state: WizardState): readonly ColumnConfig[] {
  return state.columns.filter((column) => column.include);
}

/**
 * Interpreta la lista de percentiles escrita a mano ("10, 90"): devuelve los
 * números válidos y, si algo no se entiende, el motivo en español.
 */
export function parsePercentiles(text: string): { values: number[]; error: string | null } {
  const pieces = text
    .split(/[,;\s]+/)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);

  if (pieces.length === 0) {
    return { values: [], error: "Escribe al menos un percentil, por ejemplo 10, 90." };
  }

  const values: number[] = [];
  for (const piece of pieces) {
    const parsed = Number(piece.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 99) {
      return {
        values: [],
        error: `"${piece}" no es un percentil válido: escribe números entre 1 y 99 separados por comas.`,
      };
    }
    values.push(parsed);
  }
  return { values: [...new Set(values)].sort((a, b) => a - b), error: null };
}

/** `true` si la selección incluye al menos un cálculo o una gráfica. */
export function hasAnySelection(calculation: CalculationSelection): boolean {
  const flags = [
    calculation.frequencies,
    calculation.mode,
    calculation.median,
    calculation.arithmetic,
    calculation.weighted,
    calculation.geometric,
    calculation.harmonic,
    calculation.quartiles,
    calculation.deciles,
    calculation.percentiles,
    calculation.range,
    calculation.variance,
    calculation.standardDeviation,
    calculation.coefficientOfVariation,
    calculation.iqr,
    calculation.contingency,
  ];
  if (flags.some(Boolean)) return true;
  return Object.values(calculation.charts).some((kinds) => kinds.length > 0);
}

const datasetStepSchema = z.object({
  rowCount: z.number().min(1, "Todavía no hay datos cargados. Pega tus valores o sube un archivo."),
  columnCount: z
    .number()
    .min(1, "No encontramos ninguna columna en esos datos. Revisa el texto o el archivo."),
});

const variablesStepSchema = z.object({
  included: z
    .array(
      z.object({
        name: z.string().min(1, "Todas las columnas necesitan un nombre."),
        kind: z.enum(["nominal", "ordinal", "discreta", "continua"]),
        categoryOrder: z.array(z.string()),
      }),
    )
    .min(1, "Marca al menos una columna para incluirla en el análisis."),
});

/**
 * Comprueba si se puede avanzar desde `step`. Es una función pura sobre el
 * estado, lo que permite probarla sin montar ningún componente.
 *
 * @param state - Estado completo del asistente.
 * @param step - Paso desde el que se quiere avanzar.
 */
export function canProceed(state: WizardState, step: StepIndex): StepValidation {
  if (step === 0) {
    if (state.dataset === null) {
      return {
        ok: false,
        message: "Todavía no hay datos cargados. Pega tus valores o sube un archivo.",
      };
    }
    const parsed = datasetStepSchema.safeParse({
      rowCount: state.dataset.rowCount,
      columnCount: state.dataset.columns.length,
    });
    if (!parsed.success) {
      return { ok: false, message: firstMessage(parsed.error) };
    }
    return { ok: true };
  }

  if (step === 1) {
    const included = includedColumns(state);
    const parsed = variablesStepSchema.safeParse({
      included: included.map((column) => ({
        name: column.name,
        kind: column.kind,
        categoryOrder: [...column.categoryOrder],
      })),
    });
    if (!parsed.success) {
      return { ok: false, message: firstMessage(parsed.error) };
    }
    const ordinalSinOrden = included.find(
      (column) => column.kind === "ordinal" && column.categoryOrder.length < 2,
    );
    if (ordinalSinOrden !== undefined) {
      return {
        ok: false,
        message: `La variable "${ordinalSinOrden.name}" es ordinal: necesita al menos dos categorías ordenadas.`,
      };
    }
    return { ok: true };
  }

  if (step === 2) {
    if (!hasAnySelection(state.calculation)) {
      return {
        ok: false,
        message: "No elegiste ningún cálculo. Selecciona al menos uno para ver resultados.",
      };
    }
    const calculation = state.calculation;
    if (calculation.weighted && calculation.weightsVariableId === null) {
      return { ok: false, message: "Elige la columna que trae los pesos del promedio ponderado." };
    }
    if (calculation.percentiles) {
      const { error } = parsePercentiles(calculation.percentilesText);
      if (error !== null) return { ok: false, message: error };
    }
    if (calculation.grouped && calculation.rule === "manual" && calculation.manualK < 2) {
      return { ok: false, message: "El número de intervalos escrito a mano debe ser al menos 2." };
    }
    if (calculation.contingency) {
      if (calculation.contingencyRowId === null || calculation.contingencyColumnId === null) {
        return {
          ok: false,
          message: "Para cruzar dos variables elige cuál va en las filas y cuál en las columnas.",
        };
      }
      if (calculation.contingencyRowId === calculation.contingencyColumnId) {
        return { ok: false, message: "Para cruzar necesitas dos variables distintas." };
      }
    }
    return { ok: true };
  }

  return { ok: true };
}

function firstMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos de este paso antes de continuar.";
}
