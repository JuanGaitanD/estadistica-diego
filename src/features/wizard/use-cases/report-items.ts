import {
  contingencyTestOf,
  type AnalyzedContingency,
  type AnalyzedVariable,
} from "@/features/analysis";
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
  const test = contingencyTestOf(cross);
  return {
    title,
    interpretation:
      test === null
        ? cross.interpretation
        : {
            ...cross.interpretation,
            details: [
              ...cross.interpretation.details,
              `${test.test}: ${test.interpretation.headline}`,
              ...test.interpretation.details,
            ],
            caveats: [
              ...cross.interpretation.caveats,
              ...test.interpretation.caveats.filter(
                (caveat) => !cross.interpretation!.caveats.includes(caveat),
              ),
            ],
          },
    steps: [
      ...(cross.steps ?? []),
      ...(test?.steps.map((step) => ({ ...step, title: `${test.test} · ${step.title}` })) ?? []),
    ],
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

/** Id del contenedor de las barras agrupadas de un cruce. */
export function crossChartElementId(cross: AnalyzedContingency): string {
  return `chart-${cross.request.rowVariableId}-${cross.request.columnVariableId}-grouped`;
}

/**
 * El cruce con la imagen de sus barras agrupadas. Si la gráfica no se puede
 * capturar (no está en pantalla), el cruce entra igual, sin imagen.
 */
export async function crossReportItem(
  cross: AnalyzedContingency,
  capture: (elementId: string) => Promise<string>,
): Promise<ReportItemInput | null> {
  const item = contingencyReportItem(cross);
  if (item === null) return null;
  try {
    const dataUrl = await capture(crossChartElementId(cross));
    return { ...item, images: [{ title: `Barras agrupadas · ${item.title}`, dataUrl }] };
  } catch {
    return item;
  }
}
