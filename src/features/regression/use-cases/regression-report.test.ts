import { describe, expect, it } from "vitest";

import { regressionReportItem } from "./regression-report";
import { runRegression } from "./run-regression";

describe("regressionReportItem", () => {
  it("lleva la dispersión, el histograma de residuos y su lectura", async () => {
    const analysis = runRegression(
      { id: "x", name: "Horas", values: [1, 2, 3, 4, 5] },
      { id: "y", name: "Nota", values: [3, 3, 4, 5, 5] },
    );
    const captured: string[] = [];
    const item = await regressionReportItem(analysis, async (id) => {
      captured.push(id);
      return "data:image/png;base64,AA==";
    });
    expect(captured).toEqual([
      "chart-regresion-dispersion",
      "chart-regresion-histograma-residuos-bar",
    ]);
    expect(item.images.map((image) => image.title)).toEqual([
      "Dispersión y recta · Regresión: Nota según Horas",
      "Histograma de los residuos · Regresión: Nota según Horas",
    ]);
    expect(item.interpretation.details.at(-1)).toBe(
      "Con 5 residuos la forma todavía no se puede juzgar.",
    );
  });
});
