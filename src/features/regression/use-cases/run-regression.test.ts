import { describe, expect, it } from "vitest";

import { regressionWorkbook } from "./regression-workbook";
import { runRegression } from "./run-regression";

const horas = { id: "x", name: "Horas", values: [1, 2, 3, 4, 5, null] };
const nota = { id: "y", name: "Nota", values: [3, 3, 4, 5, 5, 4.5] };

describe("runRegression", () => {
  it("ajusta con las filas completas y lo explica", () => {
    const analysis = runRegression(horas, nota);
    expect(analysis.dropped).toBe(1);
    expect(analysis.model?.b1).toBeCloseTo(0.6, 12);
    expect(analysis.interpretation?.headline).toContain("Nota sube 0,6 en promedio");
    expect(analysis.steps).toHaveLength(7);
    expect(analysis.pearson?.r).toBeCloseTo(0.948683, 6);
  });

  it("si no se puede ajustar, dice por qué", () => {
    const analysis = runRegression({ ...horas, values: [2, 2, 2] }, { ...nota, values: [1, 2, 3] });
    expect(analysis.model).toBeNull();
    expect(analysis.reason).toContain("Todos los valores de X son iguales");
  });
});

describe("regressionWorkbook", () => {
  it("lleva fórmulas vivas que apuntan a la tabla de trabajo", () => {
    const model = runRegression(horas, nota).model;
    if (model === null) throw new Error("sin modelo");
    const [sheet] = regressionWorkbook(model, "Horas", "Nota");
    const first = sheet?.rows[0] ?? [];
    expect(first.slice(0, 2)).toEqual([1, 3]);
    expect(first[4]).toEqual({ formula: "$K$3+$K$2*A2", value: expect.closeTo(2.8, 10) });
    expect(first[7]).toMatchObject({ formula: "(B2-AVERAGE($B$2:$B$6))^2" });
    expect(first[10]).toEqual({ formula: "SLOPE(B2:B6,A2:A6)", value: expect.closeTo(0.6, 10) });
    expect(sheet?.rows[1]?.[10]).toMatchObject({ formula: "INTERCEPT(B2:B6,A2:A6)" });
    // Hay más medidas que datos: las filas sobrantes solo llevan medidas.
    expect(sheet?.rows).toHaveLength(12);
  });
});
