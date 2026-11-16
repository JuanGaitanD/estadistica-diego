import { describe, expect, it } from "vitest";

import { sampleInsights } from "./sample-insights";

describe("sampleInsights", () => {
  it("saca de los datos de ejemplo la interpretación real del motor", () => {
    const insights = sampleInsights();
    expect(insights.rowCount).toBe(24);
    expect(insights.variable).toBe("Nota");
    expect(insights.pastedPreview[0]).toBe("Nota,Genero,Ciudad,Edad");
    expect(insights.interpretation.headline).toContain("El valor típico es 3,74");
    expect(insights.steps.map((step) => step.title)).toContain("2. Promedio (media aritmética)");
    expect(insights.crossInterpretation.headline).toContain("La combinación más común es");
  });
});
