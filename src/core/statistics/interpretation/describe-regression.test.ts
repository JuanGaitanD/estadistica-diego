import { describe, expect, it } from "vitest";

import { pearson } from "../regression/correlation";
import { predict, simpleRegression } from "../regression/simple";
import {
  interpretCorrelation,
  interpretPrediction,
  interpretRegression,
  regressionSteps,
} from "./describe-regression";

const result = simpleRegression([1, 2, 3, 4, 5], [3, 3, 4, 5, 5]);
if (!result.ok) throw new Error("no ajusta");
const model = result.model;

describe("interpretRegression · caso de la §7", () => {
  const text = interpretRegression(model, "Horas", "Nota");

  it("dice la pendiente en llano y la recta", () => {
    expect(text.headline).toBe(
      "Por cada unidad más de Horas, Nota sube 0,6 en promedio. La recta es Ŷ = 2,2 + 0,6·X.",
    );
  });

  it("R², fuerza, valor p y error típico", () => {
    expect(text.details[0]).toBe(
      "La recta explica el 90,0 % de la variación de Nota (R² = 0,90); la relación es fuerte y positiva (r = 0,95).",
    );
    expect(text.details[1]).toContain("valor p 0,014");
  });

  it("advierte causalidad, rango y b0 fuera de los datos", () => {
    expect(text.caveats[0]).toContain("no prueba que Horas cause Nota");
    expect(text.caveats[1]).toBe(
      "La recta solo vale entre 1 y 5 de Horas, que es donde hay datos.",
    );
    expect(text.caveats[2]).toContain("b0 = 2,2");
  });
});

describe("regressionSteps · los 5 pasos de la nota", () => {
  const steps = regressionSteps(model);

  it("minimiza, no maximiza", () => {
    expect(steps[0]?.text).toContain("se minimiza, no se maximiza");
  });

  it("ecuaciones normales con los números de la clase", () => {
    expect(steps[2]?.formula?.split("\n")).toEqual([
      "ΣY = n·b0 + b1·ΣX   →   20 = 5·b0 + 15·b1",
      "ΣXY = b0·ΣX + b1·ΣX²   →   66 = 15·b0 + 55·b1",
    ]);
    expect(steps[2]?.table?.footer).toEqual(["ΣX = 15", "ΣY = 20", "ΣX² = 55", "ΣXY = 66"]);
  });

  it("resuelve el sistema hasta b1 = 0,6 y b0 = 2,2", () => {
    const lines = steps[3]?.formula?.split("\n") ?? [];
    expect(lines[1]).toBe(
      "b1 = (ΣXY − ΣX·ΣY/n) / (ΣX² − (ΣX)²/n) = (66 − 15·20/5) / (55 − 15²/5) = 6,00 / 10,00 = 0,60",
    );
    expect(lines[2]).toBe("b0 = (20 − 0,60·15) / 5 = 2,20");
    expect(steps[4]?.formula).toBe("Ŷ = 2,20 + 0,60·X");
  });

  it("bondad del ajuste: SCE, SCT, R² y r con signo", () => {
    expect(steps[5]?.formula).toContain("R² = 1 − SCE / SCT = 1 − 0,40 / 4,00 = 0,9000");
    expect(steps[5]?.formula).toContain("r = +√R² = 0,9487");
  });
});

describe("predicción y correlación", () => {
  it("avisa si se extrapola", () => {
    const inside = interpretPrediction(predict(model, 3), "Horas", "Nota");
    expect(inside.headline).toBe("Para Horas = 3 la recta predice Nota ≈ 4.");
    expect(inside.caveats).toHaveLength(0);
    expect(interpretPrediction(predict(model, 10), "Horas", "Nota").caveats[0]).toContain(
      "fuera de los valores de Horas que hay en los datos",
    );
  });

  it("lee la fuerza y la dirección", () => {
    const corr = pearson([1, 2, 3, 4, 5], [3, 3, 4, 5, 5]);
    if (corr === null) throw new Error("sin correlación");
    expect(interpretCorrelation(corr, "Horas", "Nota").headline).toBe(
      "La relación entre Horas y Nota es fuerte: cuando Horas sube, Nota tiende a subir (r de Pearson = 0,95).",
    );
  });
});
