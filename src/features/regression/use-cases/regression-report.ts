import { formatValue, type SimpleRegression } from "@/core/statistics";
import type { ReportItemInput } from "@/features/report";

import type { RegressionAnalysis } from "./run-regression";

/** Id del contenedor de la gráfica de dispersión (para capturarla). */
export const SCATTER_CHART_ID = "chart-regresion-dispersion";
/** Id del contenedor de la gráfica de residuos. */
export const RESIDUAL_CHART_ID = "chart-regresion-residuos";

const f = (value: number, decimals = 4): string => formatValue(value, decimals);

/** Coeficientes con su error estándar, t, valor p e intervalo, como texto. */
export function coefficientTable(model: SimpleRegression): {
  columns: string[];
  rows: string[][];
} {
  const p = (value: number): string => (value < 0.001 ? "< 0,001" : f(value, 3));
  return {
    columns: ["Coeficiente", "Valor", "Error estándar", "t", "Valor p", "IC 95 %"],
    rows: [
      [
        "b0 (intersección)",
        f(model.b0),
        f(model.seB0),
        f(model.b0 / model.seB0, 3),
        "—",
        `${f(model.ciB0.lower)} a ${f(model.ciB0.upper)}`,
      ],
      [
        "b1 (pendiente)",
        f(model.b1),
        f(model.seB1),
        f(model.tB1, 3),
        p(model.pB1),
        `${f(model.ciB1.lower)} a ${f(model.ciB1.upper)}`,
      ],
    ],
  };
}

/** Bondad del ajuste como texto. */
export function fitTable(model: SimpleRegression): { columns: string[]; rows: string[][] } {
  return {
    columns: ["Medida", "Valor"],
    rows: [
      ["n (parejas completas)", String(model.n)],
      ["SCE = Σe²", f(model.sce)],
      ["SCT = Σ(Y − Ȳ)²", f(model.sct)],
      ["SCR = SCT − SCE", f(model.scr)],
      ["R² = 1 − SCE / SCT", f(model.r2)],
      ["r (con el signo de b1)", f(model.r)],
      ["Error estándar de la estimación", f(model.standardError)],
    ],
  };
}

/**
 * Copia de la regresión para el informe: interpretación, los 5 pasos,
 * coeficientes, ajuste y la gráfica de dispersión tal como se ve.
 */
export async function regressionReportItem(
  analysis: RegressionAnalysis,
  capture: (elementId: string) => Promise<string>,
): Promise<ReportItemInput> {
  const model = analysis.model;
  if (model === null || analysis.interpretation === null) {
    throw new Error("No hay recta que añadir al informe.");
  }
  const title = `Regresión: ${analysis.yName} según ${analysis.xName}`;
  const images = [];
  try {
    images.push({
      title: `Dispersión y recta · ${title}`,
      dataUrl: await capture(SCATTER_CHART_ID),
    });
  } catch {
    // Sin la gráfica en pantalla, la regresión entra igual, sin imagen.
  }
  return {
    title,
    interpretation: analysis.interpretation,
    steps: analysis.steps,
    tables: [
      { title: `Coeficientes · ${title}`, ...coefficientTable(model) },
      { title: `Ajuste · ${title}`, ...fitTable(model) },
    ],
    images,
  };
}
