import { describe, expect, it } from "vitest";

import { leastSquares } from "./least-squares";
import { confusionMatrix, interpretLogistic, logisticRegression } from "./logistic";
import {
  compareDegrees,
  dummyCode,
  interpretMultiple,
  multipleRegression,
  multipleSteps,
  polynomialRegression,
} from "./multiple";

// mtcars de R.
const MPG = [
  21, 21, 22.8, 21.4, 18.7, 18.1, 14.3, 24.4, 22.8, 19.2, 17.8, 16.4, 17.3, 15.2, 10.4, 10.4, 14.7,
  32.4, 30.4, 33.9, 21.5, 15.5, 15.2, 13.3, 19.2, 27.3, 26, 30.4, 15.8, 19.7, 15, 21.4,
];
const WT = [
  2.62, 2.875, 2.32, 3.215, 3.44, 3.46, 3.57, 3.19, 3.15, 3.44, 3.44, 4.07, 3.73, 3.78, 5.25, 5.424,
  5.345, 2.2, 1.615, 1.835, 2.465, 3.52, 3.435, 3.84, 3.845, 1.935, 2.14, 1.513, 3.17, 2.77, 3.57,
  2.78,
];
const HP = [
  110, 110, 93, 110, 175, 105, 245, 62, 95, 123, 123, 180, 180, 180, 205, 215, 230, 66, 52, 65, 97,
  150, 150, 245, 175, 66, 91, 113, 264, 175, 335, 109,
];
const AM = [
  1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
];

describe("mínimos cuadrados por QR", () => {
  it("detecta columnas linealmente dependientes", () => {
    const X = [1, 2, 3, 4].map((v) => [1, v, 2 * v]);
    expect(leastSquares(X, [1, 2, 3, 5])).toBeNull();
  });
});

describe("regresión múltiple: lm(mpg ~ wt + hp, mtcars)", () => {
  const result = multipleRegression(
    [
      { name: "wt", values: WT },
      { name: "hp", values: HP },
    ],
    MPG,
  );
  if (!result.ok) throw new Error("no ajustó");
  const model = result.model;

  it("coeficientes y errores estándar", () => {
    const [b0, b1, b2] = model.coefficients;
    expect(b0!.estimate).toBeCloseTo(37.22727, 4);
    expect(b1!.estimate).toBeCloseTo(-3.87783, 4);
    expect(b2!.estimate).toBeCloseTo(-0.03177, 5);
    expect(b0!.se).toBeCloseTo(1.59879, 4);
    expect(b1!.se).toBeCloseTo(0.63273, 4);
    expect(b2!.se).toBeCloseTo(0.00903, 5);
  });

  it("R², R² ajustado, F y error típico", () => {
    expect(model.r2).toBeCloseTo(0.8268, 4);
    expect(model.adjustedR2).toBeCloseTo(0.8148, 4);
    expect(model.f).toBeCloseTo(69.21, 2);
    expect(model.standardError).toBeCloseTo(2.593, 3);
  });

  it("VIF = 1 / (1 − r²(wt, hp)) = 1,766", () => {
    expect(model.coefficients[1]!.vif).toBeCloseTo(1.7666, 4);
  });

  it("interpreta con «manteniendo lo demás constante» y muestra las ecuaciones normales", () => {
    const text = interpretMultiple(model, "mpg");
    expect(text.headline).toContain("explican el 81,5 %");
    expect(text.details[0]).toContain(
      "Manteniendo lo demás constante, cada unidad más de wt baja mpg",
    );
    const steps = multipleSteps(model, "mpg");
    expect(steps[0]!.formula).toContain("ΣY = n·b0 + b1·ΣX1 + b2·ΣX2");
    expect(steps).toHaveLength(5);
  });
});

describe("indicadoras y polinómica", () => {
  it("la categoría más frecuente queda de referencia", () => {
    const columns = dummyCode("Ciudad", ["Cali", "Bogotá", "Bogotá", "Medellín"]);
    expect(columns.map((c) => c.name)).toEqual(["Ciudad: Cali", "Ciudad: Medellín"]);
    expect(columns[0]!.dummy?.reference).toBe("Bogotá");
    expect(columns[0]!.values).toEqual([1, 0, 0, 0]);
  });

  it("recupera una parábola exacta", () => {
    const x = [-2, -1, 0, 1, 2, 3, 4];
    const y = x.map((v) => 1 + 2 * v + 3 * v * v);
    const result = polynomialRegression(x, y, 2);
    if (!result.ok) throw new Error("no ajustó");
    expect(result.model.coefficients.map((c) => c.estimate)).toEqual([
      expect.closeTo(1, 8),
      expect.closeTo(2, 8),
      expect.closeTo(3, 8),
    ]);
    expect(compareDegrees(x, y, 3)[1]!.adjustedR2).toBeCloseTo(1, 8);
  });
});

describe("regresión logística: glm(am ~ wt, binomial, mtcars)", () => {
  const result = logisticRegression([{ name: "wt", values: WT }], AM);
  if (!result.ok) throw new Error("no ajustó");
  const model = result.model;

  it("coeficientes, errores y desviaciones de R", () => {
    expect(model.coefficients[0]!.estimate).toBeCloseTo(12.04, 2);
    expect(model.coefficients[1]!.estimate).toBeCloseTo(-4.024, 3);
    expect(model.coefficients[0]!.se).toBeCloseTo(4.51, 2);
    expect(model.coefficients[1]!.se).toBeCloseTo(1.4365, 4);
    expect(-2 * model.logLik).toBeCloseTo(19.176, 3);
    expect(-2 * model.nullLogLik).toBeCloseTo(43.23, 2);
    expect(model.mcFadden).toBeCloseTo(1 - 19.176 / 43.23, 3);
    expect(model.converged).toBe(true);
  });

  it("matriz de confusión e interpretación con momios", () => {
    const confusion = confusionMatrix(model, 0.5);
    expect(
      confusion.truePositive +
        confusion.falseNegative +
        confusion.trueNegative +
        confusion.falsePositive,
    ).toBe(32);
    const text = interpretLogistic(model, "manual", confusion);
    expect(text.headline).toContain("Cada unidad más de wt reduce los momios");
  });

  it("sin sí y no a la vez no hay modelo", () => {
    expect(logisticRegression([{ name: "x", values: [1, 2, 3] }], [1, 1, 1])).toEqual({
      ok: false,
      reason: "sin-variacion",
    });
  });
});

describe("polinómica con X lejos del cero", () => {
  it("una curva de grado 4 con años no se declara colineal", () => {
    const years = Array.from({ length: 15 }, (_, i) => 2005 + i);
    const y = years.map(
      (t) => 3 + 0.5 * (t - 2012) - 0.02 * (t - 2012) ** 2 + 0.001 * (t - 2012) ** 4,
    );
    const result = polynomialRegression(years, y, 4, "Año");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.coefficients[1]!.name).toBe("(Año − 2012)");
    expect(result.model.r2).toBeCloseTo(1, 8);
  });
});
