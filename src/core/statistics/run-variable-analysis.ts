import {
  computeCentralTendency,
  DEFAULT_CENTRAL_OPTIONS,
} from "./central-tendency/central-tendency";
import { ordinalMedian } from "./central-tendency/median";
import { mode } from "./central-tendency/mode";
import {
  computeGroupedFrequencyTable,
  computeSimpleFrequencyTable,
  DEFAULT_FREQUENCY_OPTIONS,
} from "./frequency/frequency-table";
import { makeMetric, unavailableMetric } from "./metric";
import { isFiniteNumber, sortAscending, REASONS } from "./numeric";
import { computePosition, DEFAULT_POSITION_OPTIONS } from "./position/position";
import type {
  CentralTendencyOptions,
  FrequencyOptions,
  GroupingOptions,
  Metric,
  ObservedValue,
  PositionOptions,
  VariabilityOptions,
  VariableAnalysisResult,
  VariableKind,
} from "./types";
import { computeVariability, DEFAULT_VARIABILITY_OPTIONS } from "./variability/variability";

/** Umbral de valores distintos a partir del cual se sugiere agrupar (RF-17, nota 1). */
export const DISTINCT_VALUES_THRESHOLD = 15;

/** Opciones de agrupamiento por defecto: Sturges y clases `[a, b)`. */
export const DEFAULT_GROUPING_OPTIONS: GroupingOptions = {
  enabled: false,
  rule: "sturges",
  closure: "cerrado-abierto",
};

/** Entrada del análisis descriptivo de una variable. */
export interface VariableAnalysisInput {
  readonly variableId: string;
  readonly kind: VariableKind;
  /** Valores de la variable; `null` = faltante. */
  readonly values: readonly (ObservedValue | null)[];
  /** Orden declarado de categorías (obligatorio si `kind` es `"ordinal"`). */
  readonly categoryOrder?: readonly string[];
  readonly grouping?: GroupingOptions;
  readonly frequency?: FrequencyOptions;
  readonly central?: CentralTendencyOptions;
  readonly position?: PositionOptions;
  readonly variability?: VariabilityOptions;
  /** Pesos para la media ponderada, uno por dato válido. */
  readonly weights?: readonly number[];
}

function isQuantitative(kind: VariableKind): boolean {
  return kind === "discreta" || kind === "continua";
}

/**
 * Análisis descriptivo completo de una variable: aplica la matriz de
 * aplicabilidad de 01-requisitos §2.1 y devuelve solo los bloques que tienen
 * sentido para el tipo de variable, con una nota explicando cada omisión.
 *
 * @param input - Variable, valores y opciones de cada bloque.
 * @returns Resumen, frecuencias, tendencia central, posición y variabilidad.
 */
export function runVariableAnalysis(input: VariableAnalysisInput): VariableAnalysisResult {
  const notes: string[] = [];
  const quantitative = isQuantitative(input.kind);

  const present: ObservedValue[] = [];
  let excluded = 0;
  for (const value of input.values) {
    if (value === null || value === undefined || value === "") {
      excluded += 1;
      continue;
    }
    present.push(value);
  }

  const numbers: number[] = [];
  const categories: string[] = [];
  let nonNumeric = 0;
  for (const value of present) {
    if (quantitative) {
      if (isFiniteNumber(value)) numbers.push(value);
      else nonNumeric += 1;
    }
    categories.push(String(value));
  }
  if (quantitative && nonNumeric > 0) {
    notes.push(
      `Se descartaron ${nonNumeric} valores no numéricos en una variable marcada como cuantitativa.`,
    );
  }

  // Se ordena una sola vez: `sortAscending` detecta el array ya ordenado, así
  // que reutilizarlo evita repetir el O(n log n) en cada bloque (RNF-06).
  const sortedNumbers = quantitative ? sortAscending(numbers) : [];
  const n = quantitative ? numbers.length : present.length;
  const summary: Metric[] = [makeMetric("n-efectivo", "Datos válidos (n)", n, { integer: true })];
  if (quantitative) {
    if (numbers.length === 0) {
      summary.push(
        unavailableMetric("minimo", "Mínimo", REASONS.sinDatos),
        unavailableMetric("maximo", "Máximo", REASONS.sinDatos),
      );
      notes.push("No quedan datos válidos en esta variable.");
    } else {
      summary.push(
        makeMetric("minimo", "Mínimo", sortedNumbers[0] ?? 0, {
          integer: input.kind === "discreta",
        }),
        makeMetric("maximo", "Máximo", sortedNumbers[sortedNumbers.length - 1] ?? 0, {
          integer: input.kind === "discreta",
        }),
      );
    }
  } else {
    notes.push(
      "En una variable cualitativa, el mínimo y el máximo se leen como la categoría menos y más frecuente.",
    );
  }

  const frequencyOptions = input.frequency ?? DEFAULT_FREQUENCY_OPTIONS;
  const grouping = input.grouping ?? DEFAULT_GROUPING_OPTIONS;
  const groupInIntervals = grouping.enabled && quantitative;

  let groupedTable: VariableAnalysisResult["groupedFrequency"];
  if (groupInIntervals) {
    groupedTable = computeGroupedFrequencyTable({
      variableId: input.variableId,
      values: sortedNumbers,
      grouping,
      options: frequencyOptions,
      excluded,
    });
    notes.push(...groupedTable.warnings);
  } else if (grouping.enabled) {
    notes.push("Solo las variables cuantitativas se pueden agrupar en intervalos.");
  }

  // Rendimiento (RNF-06): cuando la variable se agrupa en intervalos, la tabla
  // de valores únicos no se muestra en ningún sitio y con datos continuos puede
  // tener decenas de miles de filas, así que no se calcula.
  const frequency = groupInIntervals
    ? undefined
    : computeSimpleFrequencyTable({
        variableId: input.variableId,
        values: quantitative ? sortedNumbers : categories,
        options: frequencyOptions,
        ...(input.categoryOrder !== undefined ? { categoryOrder: input.categoryOrder } : {}),
        excluded,
      });

  if (input.kind === "nominal" && frequencyOptions.showCumulative) {
    notes.push(
      "Las frecuencias acumuladas no tienen sentido en una variable nominal: no hay un orden entre las categorías.",
    );
  }

  const distinct = frequency?.rows.length ?? 0;
  if (!grouping.enabled && input.kind === "continua" && distinct > DISTINCT_VALUES_THRESHOLD) {
    notes.push(
      `La variable tiene ${distinct} valores distintos: conviene agruparla en intervalos.`,
    );
  }

  const centralOptions = input.central ?? DEFAULT_CENTRAL_OPTIONS;
  const groupedRows = groupedTable?.rows;
  const central = quantitative
    ? computeCentralTendency({
        variableId: input.variableId,
        values: numbers,
        options: centralOptions,
        ...(input.weights !== undefined ? { weights: input.weights } : {}),
        ...(groupedRows !== undefined && groupedRows.length > 0
          ? { groupedRows, intervalLength: groupedTable?.intervalLength ?? 0 }
          : {}),
      })
    : {
        variableId: input.variableId,
        metrics: [],
        mode: mode(categories),
      };
  if (!quantitative) {
    notes.push("Las medias no se calculan en variables cualitativas; solo la moda aplica.");
  }

  const ordinal =
    input.kind === "ordinal" ? ordinalMedian(categories, input.categoryOrder ?? []) : undefined;

  const position = quantitative
    ? computePosition({
        variableId: input.variableId,
        values: sortedNumbers,
        options: input.position ?? DEFAULT_POSITION_OPTIONS,
      })
    : undefined;

  const variability = quantitative
    ? computeVariability({
        variableId: input.variableId,
        values: sortedNumbers,
        options: input.variability ?? DEFAULT_VARIABILITY_OPTIONS,
        quantileMethod: (input.position ?? DEFAULT_POSITION_OPTIONS).quartileMethod,
      })
    : undefined;
  if (!quantitative) {
    notes.push(
      "La posición y la variabilidad numéricas no aplican a variables cualitativas nominales.",
    );
  }

  return {
    variableId: input.variableId,
    kind: input.kind,
    summary,
    ...(frequency !== undefined ? { frequency } : {}),
    ...(groupedTable !== undefined ? { groupedFrequency: groupedTable } : {}),
    central,
    ...(ordinal !== undefined ? { ordinalMedian: ordinal } : {}),
    ...(position !== undefined ? { position } : {}),
    ...(variability !== undefined ? { variability } : {}),
    notes,
  };
}
