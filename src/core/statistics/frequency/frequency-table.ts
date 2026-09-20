import { explanationFor } from "../explanations/catalog";
import { buildIntervals, classIndexOf } from "../grouping/intervals";
import { ascending, isFiniteNumber } from "../numeric";
import type {
  Explanation,
  FrequencyOptions,
  FrequencyRow,
  FrequencyTableResult,
  GroupingOptions,
  ObservedValue,
} from "../types";

/** Opciones de presentación por defecto de la tabla de frecuencias (RF-15). */
export const DEFAULT_FREQUENCY_OPTIONS: FrequencyOptions = {
  relativeMode: "proporcion",
  showCumulative: true,
  showClassMark: true,
};

function tableExplanation(options: FrequencyOptions, grouped: boolean): Explanation {
  const base = explanationFor("tabla-de-frecuencias");
  const relative = options.relativeMode === "porcentaje" ? "pi = 100 · fi/n" : "hi = fi/n";
  const parts = [`fi = recuento`, relative];
  if (options.showCumulative) parts.push("Fi = suma de f1..fi", "Hi = Fi/n");
  if (grouped && options.showClassMark) parts.push("xi = (Li + Ls)/2");
  return { what: base.what, why: base.why, formula: parts.join("; ") };
}

function keyOf(value: ObservedValue): string {
  return typeof value === "number" ? `n:${value}` : `s:${value}`;
}

function labelOf(value: ObservedValue): string {
  return typeof value === "number" ? String(value) : value;
}

/** Parámetros de la tabla de frecuencias de valores únicos. */
export interface SimpleFrequencyParams {
  readonly variableId: string;
  /** Valores ya limpios; los faltantes deben venir excluidos. */
  readonly values: readonly ObservedValue[];
  readonly options?: FrequencyOptions;
  /** Orden canónico de categorías (obligatorio en variables ordinales). */
  readonly categoryOrder?: readonly string[];
  /** Nº de observaciones descartadas por faltantes, solo informativo. */
  readonly excluded?: number;
}

/**
 * Distribución de frecuencias de valores únicos, para datos categóricos o
 * numéricos sin agrupar (ADR-003 §1).
 *
 * Fórmulas: `fi` recuento, `hi = fi/n`, `pi = 100·hi`, `Fi = suma de f1..fi`,
 * `Hi = Fi/n`. El orden de las filas es el orden declarado de categorías si se
 * proporciona; si no, ascendente para números y de aparición para texto.
 *
 * @param params - Variable, valores y opciones de presentación.
 * @returns La tabla con su `n` efectivo, las exclusiones y su explicación.
 */
export function computeSimpleFrequencyTable(params: SimpleFrequencyParams): FrequencyTableResult {
  const options = params.options ?? DEFAULT_FREQUENCY_OPTIONS;
  const warnings: string[] = [];
  const counts = new Map<string, { value: ObservedValue; count: number }>();
  let invalid = 0;

  for (const value of params.values) {
    if (typeof value === "number" && !isFiniteNumber(value)) {
      invalid += 1;
      continue;
    }
    const key = keyOf(value);
    const entry = counts.get(key);
    if (entry === undefined) counts.set(key, { value, count: 1 });
    else entry.count += 1;
  }

  if (invalid > 0) {
    warnings.push(`Se descartaron ${invalid} valores no numéricos de la variable.`);
  }

  const entries = [...counts.values()];
  const allNumeric = entries.every((entry) => typeof entry.value === "number");
  if (params.categoryOrder !== undefined && params.categoryOrder.length > 0) {
    const order = new Map(params.categoryOrder.map((label, index) => [label, index]));
    entries.sort((a, b) => {
      const ai = order.get(String(a.value)) ?? Number.MAX_SAFE_INTEGER;
      const bi = order.get(String(b.value)) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  } else if (allNumeric) {
    entries.sort((a, b) => ascending(Number(a.value), Number(b.value)));
  }

  const n = entries.reduce((total, entry) => total + entry.count, 0);
  const rows: FrequencyRow[] = [];
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.count;
    rows.push({
      label: labelOf(entry.value),
      absolute: entry.count,
      relative: n === 0 ? 0 : entry.count / n,
      cumulativeAbsolute: cumulative,
      cumulativeRelative: n === 0 ? 0 : cumulative / n,
    });
  }

  if (n === 0) warnings.push("No quedan datos válidos en esta variable.");

  return {
    variableId: params.variableId,
    grouped: false,
    rows,
    n,
    excluded: (params.excluded ?? 0) + invalid,
    warnings,
    explanation: tableExplanation(options, false),
  };
}

/** Parámetros de la tabla de frecuencias agrupada en intervalos. */
export interface GroupedFrequencyParams {
  readonly variableId: string;
  readonly values: readonly number[];
  readonly grouping: GroupingOptions;
  readonly options?: FrequencyOptions;
  readonly excluded?: number;
}

/**
 * Distribución de frecuencias agrupada en intervalos (ADR-003 §2).
 *
 * Calcula K según la regla elegida, `l = redondeoArriba(R/K, d)` y las clases
 * `[Li, Ls)` con la última cerrada, junto con la marca de clase `xi`.
 *
 * @param params - Variable, valores numéricos y opciones de agrupamiento.
 * @returns La tabla agrupada con K, l y su explicación.
 */
export function computeGroupedFrequencyTable(params: GroupedFrequencyParams): FrequencyTableResult {
  const options = params.options ?? DEFAULT_FREQUENCY_OPTIONS;
  const clean: number[] = [];
  let invalid = 0;
  for (const value of params.values) {
    if (isFiniteNumber(value)) clean.push(value);
    else invalid += 1;
  }

  const plan = buildIntervals(clean, params.grouping);
  if (plan === null) {
    return {
      variableId: params.variableId,
      grouped: true,
      rows: [],
      n: 0,
      excluded: (params.excluded ?? 0) + invalid,
      warnings: ["No quedan datos válidos en esta variable."],
      explanation: tableExplanation(options, true),
    };
  }

  const absolute = new Array<number>(plan.classes.length).fill(0);
  for (const value of clean) {
    const index = classIndexOf(plan.classes, value);
    if (index >= 0) {
      absolute[index] = (absolute[index] ?? 0) + 1;
    }
  }

  const n = clean.length;
  const rows: FrequencyRow[] = [];
  let cumulative = 0;
  for (const item of plan.classes) {
    const count = absolute[item.index] ?? 0;
    cumulative += count;
    rows.push({
      label: item.label,
      lowerBound: item.lowerBound,
      upperBound: item.upperBound,
      classMark: item.classMark,
      absolute: count,
      relative: n === 0 ? 0 : count / n,
      cumulativeAbsolute: cumulative,
      cumulativeRelative: n === 0 ? 0 : cumulative / n,
    });
  }

  const warnings = [...plan.warnings];
  if (invalid > 0) {
    warnings.push(`Se descartaron ${invalid} valores no numéricos de la variable.`);
  }

  return {
    variableId: params.variableId,
    grouped: true,
    rule: plan.rule,
    k: plan.k,
    intervalLength: plan.intervalLength,
    rows,
    n,
    excluded: (params.excluded ?? 0) + invalid,
    warnings,
    explanation: tableExplanation(options, true),
  };
}
