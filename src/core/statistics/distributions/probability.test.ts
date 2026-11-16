import { describe, expect, it } from "vitest";

import { densityPoints, describeProbability, probabilityOf, validateSpec } from "./probability";

describe("probabilityOf", () => {
  it("normal: menor, mayor y entre", () => {
    const spec = { kind: "normal", mean: 0, sd: 1 } as const;
    expect(probabilityOf(spec, { type: "menor", a: 1.96 })).toBeCloseTo(0.975002, 6);
    expect(probabilityOf(spec, { type: "mayor", a: 1.96 })).toBeCloseTo(0.024998, 6);
    expect(probabilityOf(spec, { type: "entre", a: -1.96, b: 1.96 })).toBeCloseTo(0.950004, 6);
  });

  it("discretas incluyen los extremos", () => {
    const spec = { kind: "binomial", n: 10, p: 0.5 } as const;
    // P(X ≥ 6) = 1 − P(X ≤ 5) = 0,376953125
    expect(probabilityOf(spec, { type: "mayor", a: 6 })).toBeCloseTo(0.376953125, 12);
    // P(4 ≤ X ≤ 6) = F(6) − F(3) = 0,65625
    expect(probabilityOf(spec, { type: "entre", a: 4, b: 6 })).toBeCloseTo(0.65625, 12);
  });
});

describe("describeProbability", () => {
  it("el ejemplo del plan: sacar menos de 3,0", () => {
    const { interpretation, steps } = describeProbability(
      { kind: "normal", mean: 3.74, sd: 0.73 },
      { type: "menor", a: 3 },
    );
    expect(interpretation.headline).toBe(
      "P(X ≤ 3) = 15,5 % (0,1554): más o menos 16 de cada 100 casos.",
    );
    expect(interpretation.details[0]).toBe(
      "Se calculó con una normal con media 3,74 y desviación 0,73.",
    );
    expect(steps[0]?.formula).toContain("z = (3,000 − 3,740) / 0,730 = -1,014");
    expect(steps.at(-1)?.excel).toBe("=DISTR.NORM.N(x; 3,740; 0,730; VERDADERO)");
  });
});

describe("validación y puntos", () => {
  it("explica parámetros inválidos", () => {
    expect(validateSpec({ kind: "normal", mean: 0, sd: 0 })).toContain("mayor que 0");
    expect(validateSpec({ kind: "binomial", n: 2.5, p: 0.5 })).toContain("entero");
  });

  it("la densidad suma ~1", () => {
    const points = densityPoints({ kind: "poisson", lambda: 4 });
    expect(points.reduce((sum, point) => sum + point.y, 0)).toBeCloseTo(1, 4);
  });
});
