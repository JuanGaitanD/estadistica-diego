import type { AnalyzedContingency, AnalyzedVariable } from "@/features/analysis";
import { variableTablesText } from "@/features/analysis";
import type { ReportItemInput } from "@/features/report";

/** Imagen de una gráfica ya dibujada en pantalla. */
export interface ChartCapture {
  readonly elementId: string;
  readonly title: string;
}

/**
 * Copia de una variable para el informe: su interpretación, el paso a paso,
 * sus tablas como texto y las gráficas capturadas tal como se ven.
 *
 * @param capture - Captura una gráfica por id (inyectada para poder probar sin DOM).
 */
export async function variableReportItem(
  variable: AnalyzedVariable,
  charts: readonly ChartCapture[],
  capture: (elementId: string) => Promise<string>,
): Promise<ReportItemInput> {
  const images = [];
  for (const chart of charts) {
    images.push({ title: chart.title, dataUrl: await capture(chart.elementId) });
  }
  return {
    title: variable.variableName,
    interpretation: variable.analysis.interpretation,
    steps: variable.analysis.steps,
    tables: variableTablesText(variable),
    images,
  };
}

/** Copia de un cruce de dos variables para el informe. */
export function contingencyReportItem(cross: AnalyzedContingency): ReportItemInput | null {
  const table = cross.table;
  if (table === null || cross.interpretation === undefined) return null;
  const title = `${cross.rowVariableName} y ${cross.columnVariableName}`;
  return {
    title,
    interpretation: cross.interpretation,
    steps: [],
    tables: [
      {
        title: `Cruce · ${title}`,
        columns: [cross.rowVariableName, ...table.columnLabels, "Total"],
        rows: [
          ...table.rowLabels.map((label, row) => [
            label,
            ...table.columnLabels.map((_column, column) =>
              String(table.cells[row]?.[column]?.absolute ?? 0),
            ),
            String(table.rowTotals[row] ?? 0),
          ]),
          ["Total", ...table.columnTotals.map(String), String(table.grandTotal)],
        ],
      },
    ],
    images: [],
  };
}
