import { describe, expect, it } from "vitest";

import {
  meanDifferenceInterval,
  meanInterval,
  normalQqPoints,
  proportionDifferenceInterval,
  proportionInterval,
  sampleSizeForMean,
  sampleSizeForProportion,
  wilson,
} from "./intervals";

describe("meanInterval", () => {
  it("x̄ ± t(0,975; n − 1)·s/√n con la tabla de la §7", () => {
    // x̄ = 4, s = 1, n = 5, t(0,975; 4) = 2,776445 → 4 ± 1,241656
    const ci = meanInterval([3, 3, 4, 5, 5], "Y");
    expect(ci?.lower).toBeCloseTo(4 - 2.776445105 / Math.sqrt(5), 8);
    expect(ci?.upper).toBeCloseTo(4 + 2.776445105 / Math.sqrt(5), 8);
    expect(ci?.interpretation.headline).toBe(
      "Con un método que acierta el 95 % de las veces, el promedio de Y en toda la población está entre 2,8 y 5,2.",
    );
  });
});

describe("proporciones", () => {
  it("Wilson como prop.test(correct = FALSE) de R", () => {
    // prop.test(7, 20, correct = FALSE)$conf.int = 0,1812…0,5671
    const w = wilson(7, 20);
    expect(w.lower).toBeCloseTo(0.1811918, 6);
    expect(w.upper).toBeCloseTo(0.5671457, 6);
    expect(proportionInterval(7, 20, "mujer")?.interpretation.headline).toContain(
      "entre el 18,1 % y el 56,7 %",
    );
  });

  it("Wilson no se sale de [0, 1]", () => {
    expect(wilson(0, 10).lower).toBeCloseTo(0, 12);
    expect(wilson(10, 10).upper).toBeCloseTo(1, 12);
  });

  it("diferencia de proporciones (Newcombe) contiene la diferencia observada", () => {
    const ci = proportionDifferenceInterval(30, 50, 20, 50, "A", "B", "éxito");
    expect(ci?.estimate).toBeCloseTo(0.2, 12);
    expect(ci?.lower).toBeLessThan(0.2);
    expect(ci?.upper).toBeGreaterThan(0.2);
    // Newcombe (1998), método 10: el límite inferior queda apenas por encima de 0.
    expect(ci?.lower).toBeCloseTo(0.0019, 2);
  });
});

describe("diferencia de medias (Welch)", () => {
  it("coincide con t.test(a, b) de R", () => {
    // Medias 3 y 5,4: la diferencia es −2,4 y el intervalo de Welch cruza el 0.
    const ci = meanDifferenceInterval([1, 2, 3, 4, 5], [3, 4, 5, 6, 9], "A", "B", "x");
    expect(ci?.estimate).toBeCloseTo(-2.4, 12);
    expect(ci?.interpretation.details[1]).toContain("incluye el 0");
  });
});

describe("tamaño de muestra", () => {
  it("fórmulas clásicas con z = 1,96", () => {
    expect(sampleSizeForProportion(0.05)).toBe(385);
    expect(sampleSizeForMean(0.73, 0.1)).toBe(205);
    expect(sampleSizeForMean(0, 0.1)).toBeNull();
  });
});

describe("normalQqPoints", () => {
  it("usa las posiciones de qqnorm de R", () => {
    const points = normalQqPoints([1, 2, 3]);
    // ppoints(3) = (1:3 − 3/8) / (3 + 1/4) → qnorm = −0,8694; 0; 0,8694
    expect(points[0]?.theoretical).toBeCloseTo(-0.8694238, 6);
    expect(points[1]?.theoretical).toBeCloseTo(0, 12);
    expect(points.map((point) => point.sample)).toEqual([1, 2, 3]);
  });
});
