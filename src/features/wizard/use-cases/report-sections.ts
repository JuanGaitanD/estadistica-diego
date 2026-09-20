/**
 * Traduce un `AnalysisResult` en la lista de `AvailableSection` que el módulo
 * de exportación necesita para armar el PDF con selección de secciones (RF-32).
 *
 * Se apoya en `RESULT_SECTIONS` para no duplicar el catálogo de secciones ni
 * sus títulos: aquí solo se aporta el contenido de cada una.
 */
import { formatMetricValue, formatNumber } from "@/components/shared/format";
import type { AnalysisResult, AnalyzedVariable } from "@/features/analysis";
import { RESULT_SECTIONS } from "@/features/analysis";
import type { AvailableSection } from "@/features/export";
import type { Metric } from "@/core/statistics";

function metricItems(metrics: readonly Metric[], decimals = 2) {
  return metrics.map((metric) => ({
    label: metric.label,
    value: formatMetricValue(metric, decimals) ?? "No disponible",
    explanation: metric.explanation.what,
  }));
}

function frequencyTableContent(variable: AnalyzedVariable) {
  const table = variable.analysis.groupedFrequency ?? variable.analysis.frequency;
  const rows = table?.rows ?? [];
  return {
    kind: "table" as const,
    columns: ["Valor o clase", "fi", "hi", "Fi", "Hi"],
    rows: rows.map((row) => [
      row.label,
      row.absolute,
      formatNumber(row.relative, { decimals: 4 }),
      row.cumulativeAbsolute,
      formatNumber(row.cumulativeRelative, { decimals: 4 }),
    ]),
    ...(table?.rule !== undefined ? { note: `Regla usada para K: ${table.rule}.` } : {}),
  };
}

/**
 * Construye las secciones exportables del resultado, más una por gráfica
 * renderizada en pantalla.
 *
 * @param result - Resultado ya calculado.
 * @param chartElementIds - Ids de los contenedores de gráfica en el DOM.
 */
export function buildAvailableSections(
  result: AnalysisResult,
  chartElementIds: readonly string[],
): AvailableSection[] {
  const byId = new Map(result.variables.map((variable) => [variable.variableId, variable]));
  const sections: AvailableSection[] = [];

  for (const section of RESULT_SECTIONS(result)) {
    if (section.kind === "resumen" && section.variableId === undefined) {
      sections.push({
        id: "resumen",
        title: section.title,
        kind: "text",
        getContent: () => ({
          kind: "text",
          paragraphs: [
            `Se analizaron ${result.totalRows} fila(s) y ${result.variables.length} variable(s).`,
            ...result.warnings.map((warning) => warning.message),
          ],
        }),
      });
      continue;
    }

    const variable = section.variableId !== undefined ? byId.get(section.variableId) : undefined;
    if (variable === undefined) continue;

    if (section.kind === "resumen") {
      sections.push({
        id: "tendencia-central",
        title: section.title,
        kind: "metrics",
        getContent: () => ({
          kind: "metrics",
          items: metricItems([
            ...variable.analysis.summary,
            ...(variable.analysis.central?.metrics ?? []),
          ]),
        }),
      });
      continue;
    }

    if (section.kind === "frecuencias") {
      sections.push({
        id: "frecuencias",
        title: section.title,
        kind: "table",
        getContent: () => frequencyTableContent(variable),
      });
      continue;
    }

    if (section.kind === "posicion") {
      sections.push({
        id: "posicion",
        title: section.title,
        kind: "metrics",
        getContent: () => ({
          kind: "metrics",
          items: metricItems([
            ...(variable.analysis.position?.quartiles ?? []),
            ...(variable.analysis.position?.deciles ?? []),
            ...(variable.analysis.position?.percentiles ?? []),
          ]),
        }),
      });
      continue;
    }

    if (section.kind === "variabilidad") {
      sections.push({
        id: "variabilidad",
        title: section.title,
        kind: "metrics",
        getContent: () => ({
          kind: "metrics",
          items: metricItems(variable.analysis.variability?.metrics ?? []),
        }),
      });
    }
  }

  for (const cross of result.contingencies) {
    const table = cross.table;
    if (table === null) continue;
    sections.push({
      id: "contingencia",
      title: `Cruce: ${cross.rowVariableName} y ${cross.columnVariableName}`,
      kind: "table",
      getContent: () => ({
        kind: "table",
        columns: [cross.rowVariableName, ...table.columnLabels, "Total"],
        rows: table.rowLabels.map((label, rowIndex) => [
          label,
          ...table.columnLabels.map(
            (_column, columnIndex) => table.cells[rowIndex]?.[columnIndex]?.absolute ?? 0,
          ),
          table.rowTotals[rowIndex] ?? 0,
        ]),
      }),
    });
  }

  for (const elementId of chartElementIds) {
    sections.push({
      id: "graficas",
      title: "Gráfica",
      kind: "chart",
      getContent: () => ({ kind: "chart", elementId }),
    });
  }

  return sections;
}
