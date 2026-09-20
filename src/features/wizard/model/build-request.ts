/**
 * Traduce la selección del asistente en un `AnalysisRequest` del módulo de
 * análisis. Función pura: misma selección, misma petición.
 */
import type { ChartKind } from "@/components/charts";
import type { AnalysisChartSpec, AnalysisRequest, ChartType } from "@/features/analysis";

import type { CalculationSelection, ColumnConfig, WizardState } from "./types";
import { includedColumns, isQuantitative, parsePercentiles } from "./validation";

/** `true` si esta variable se agrupa en intervalos con la selección actual. */
export function isGroupedVariable(
  column: ColumnConfig,
  calculation: CalculationSelection,
): boolean {
  return calculation.grouped && isQuantitative(column.kind);
}

/** Tipo de gráfica del dominio de análisis a partir de la gráfica elegida en la UI. */
function chartTypeOf(kind: ChartKind, grouped: boolean): ChartType {
  if (kind === "pie") return "pie";
  if (kind === "bar") return grouped ? "histograma" : "barras";
  if (kind === "polygon") return "poligono";
  return "ojiva";
}

const CHART_CAPTIONS: Readonly<Record<ChartKind, string>> = {
  pie: "Reparte un círculo según la participación de cada categoría.",
  bar: "Compara la frecuencia de cada categoría o clase entre sí.",
  polygon: "Une las marcas de clase para mostrar la forma de la distribución.",
  ogive: "Muestra la frecuencia acumulada para leer cuántos datos hay por debajo de un valor.",
};

const CHART_TITLES: Readonly<Record<ChartKind, string>> = {
  pie: "Gráfico circular",
  bar: "Gráfico de barras",
  polygon: "Polígono de frecuencias",
  ogive: "Ojiva",
};

/** Id estable del contenedor de una gráfica en el DOM (usado al exportar). */
export function chartElementId(variableId: string, kind: ChartKind): string {
  return `chart-${variableId}-${kind}`;
}

/** Gráficas elegidas para una variable, sin duplicados y en orden estable. */
export function chartsFor(
  calculation: CalculationSelection,
  variableId: string,
): readonly ChartKind[] {
  return calculation.charts[variableId] ?? [];
}

/** Construye las especificaciones de gráfica de todas las variables incluidas. */
export function buildChartSpecs(state: WizardState): AnalysisChartSpec[] {
  const specs: AnalysisChartSpec[] = [];
  for (const column of includedColumns(state)) {
    const grouped = isGroupedVariable(column, state.calculation);
    for (const kind of chartsFor(state.calculation, column.id)) {
      specs.push({
        id: chartElementId(column.id, kind),
        type: chartTypeOf(kind, grouped),
        title: `${CHART_TITLES[kind]} de ${column.name}`,
        variableId: column.id,
        source: kind === "ogive" ? "frecuencia-acumulada" : "frecuencia",
        labels: { showValue: true, showPercent: true, showCategory: true },
        paletteKey: column.id,
        caption: CHART_CAPTIONS[kind],
      });
    }
  }
  return specs;
}

/**
 * Construye la petición de análisis a partir del estado del asistente.
 *
 * @param state - Estado del asistente con dataset, tipos y selección.
 * @returns La petición lista para `runAnalysis`, o `null` si aún no hay datos.
 */
export function buildAnalysisRequest(state: WizardState): AnalysisRequest | null {
  if (state.dataset === null) return null;
  const calculation = state.calculation;
  const columns = includedColumns(state);
  if (columns.length === 0) return null;

  const percentiles = calculation.percentiles
    ? parsePercentiles(calculation.percentilesText).values
    : [];

  const variables = columns.map((column) => {
    const grouped = isGroupedVariable(column, calculation);
    const quantitative = isQuantitative(column.kind);
    return {
      variableId: column.id,
      grouping: {
        enabled: grouped,
        rule: calculation.rule,
        ...(calculation.rule === "manual" ? { manualK: calculation.manualK } : {}),
        closure: "cerrado-abierto" as const,
      },
      frequency: {
        relativeMode: calculation.relativeMode,
        showCumulative: calculation.cumulative,
        showClassMark: grouped,
      },
      central: {
        arithmetic: calculation.arithmetic,
        weighted: calculation.weighted,
        ...(calculation.weighted && calculation.weightsVariableId !== null
          ? {
              weightsSource: {
                kind: "columna" as const,
                variableId: calculation.weightsVariableId,
              },
            }
          : {}),
        geometric: calculation.geometric,
        harmonic: calculation.harmonic,
        median: calculation.median,
        mode: calculation.mode,
      },
      position: {
        quartiles: calculation.quartiles,
        quartileMethod: calculation.quartileMethod,
        includeQ2: true,
        deciles: calculation.deciles,
        percentiles,
      },
      variability: {
        range: calculation.range && quantitative,
        sampleVariance: calculation.variance,
        populationVariance: false,
        standardDeviation: calculation.standardDeviation,
        coefficientOfVariation: calculation.coefficientOfVariation,
        iqr: calculation.iqr,
        outliers: calculation.iqr,
      },
    };
  });

  const contingencies =
    calculation.contingency &&
    calculation.contingencyRowId !== null &&
    calculation.contingencyColumnId !== null &&
    calculation.contingencyRowId !== calculation.contingencyColumnId
      ? [
          {
            rowVariableId: calculation.contingencyRowId,
            columnVariableId: calculation.contingencyColumnId,
            percentages: calculation.contingencyPercentages,
          },
        ]
      : [];

  return {
    datasetId: state.dataset.id,
    missingPolicy: "excluir-por-variable",
    variables,
    contingencies,
    charts: buildChartSpecs(state),
  };
}
