import { describe, expect, it } from "vitest";

import {
  chiSquareIndependence,
  oneProportionZ,
  oneSampleT,
  oneWayAnova,
  pairedT,
  twoProportionZ,
  twoSampleT,
} from "./hypothesis-tests";

// Datos `sleep` y `PlantGrowth` de R; valores de referencia de t.test, aov y TukeyHSD.
const SLEEP_1 = [0.7, -1.6, -0.2, -1.2, -0.1, 3.4, 3.7, 0.8, 0.0, 2.0];
const SLEEP_2 = [1.9, 0.8, 1.1, 0.1, -0.1, 4.4, 5.5, 1.6, 4.6, 3.4];
const CTRL = [4.17, 5.58, 5.18, 6.11, 4.5, 4.61, 5.17, 4.53, 5.33, 5.14];
const TRT1 = [4.81, 4.17, 4.41, 3.59, 5.87, 3.83, 6.03, 4.89, 4.32, 4.69];
const TRT2 = [6.31, 5.12, 5.54, 5.5, 5.37, 5.29, 4.92, 6.15, 5.8, 5.26];

describe("pruebas t", () => {
  it("t de una muestra: t.test(sleep1, mu = 0)", () => {
    const r = oneSampleT(SLEEP_1, 0, "horas")!;
    expect(r.statistic).toBeCloseTo(1.3257, 3);
    expect(r.pValue).toBeCloseTo(0.2176, 3);
    expect(r.significant).toBe(false);
    expect(r.steps).toHaveLength(5);
    expect(r.interpretation.headline).toContain("podría deberse al azar");
  });

  it("t de Welch: t.test(extra ~ group, sleep)", () => {
    const r = twoSampleT(
      { label: "1", values: SLEEP_1 },
      { label: "2", values: SLEEP_2 },
      "horas",
    )!;
    expect(r.statistic).toBeCloseTo(-1.8608, 3);
    expect(r.reference).toEqual({ kind: "t", df: expect.closeTo(17.776, 2) });
    expect(r.pValue).toBeCloseTo(0.07939, 4);
  });

  it("t de Student con varianzas iguales: gl = 18, p = 0,07919", () => {
    const r = twoSampleT(
      { label: "1", values: SLEEP_1 },
      { label: "2", values: SLEEP_2 },
      "horas",
      { equalVariances: true },
    )!;
    expect(r.pValue).toBeCloseTo(0.07919, 4);
  });

  it("t pareada: t = 4,0621 (después − antes), p = 0,002833", () => {
    const r = pairedT(SLEEP_1, SLEEP_2, "droga 1", "droga 2")!;
    expect(r.statistic).toBeCloseTo(4.0621, 3);
    expect(r.pValue).toBeCloseTo(0.002833, 5);
    expect(r.significant).toBe(true);
    expect(r.effect?.size).toBe("grande");
  });

  it("sin variación no hay prueba", () => {
    expect(oneSampleT([2, 2, 2], 1, "x")).toBeNull();
  });
});

describe("pruebas de proporciones", () => {
  it("z de una proporción: 60 de 100 contra 50 %", () => {
    const r = oneProportionZ(60, 100, 0.5, "sí")!;
    expect(r.statistic).toBeCloseTo(2, 6);
    expect(r.pValue).toBeCloseTo(0.0455, 4);
  });

  it("z de dos proporciones: 45/100 frente a 30/100", () => {
    const r = twoProportionZ(
      { label: "A", successes: 45, n: 100 },
      { label: "B", successes: 30, n: 100 },
      "sí",
    )!;
    expect(r.statistic).toBeCloseTo(2.1909, 3);
    expect(r.pValue).toBeCloseTo(0.02846, 4);
  });
});

describe("ANOVA y Tukey", () => {
  it("PlantGrowth: F = 4,846, p = 0,01591", () => {
    const r = oneWayAnova(
      [
        { label: "ctrl", values: CTRL },
        { label: "trt1", values: TRT1 },
        { label: "trt2", values: TRT2 },
      ],
      "peso",
    )!;
    expect(r.statistic).toBeCloseTo(4.846, 2);
    expect(r.pValue).toBeCloseTo(0.01591, 4);
    const pair = (a: string, b: string) => r.tukey.find((t) => t.a === a && t.b === b)!;
    expect(pair("trt1", "trt2").pValue).toBeCloseTo(0.012, 3);
    expect(pair("ctrl", "trt1").pValue).toBeCloseTo(0.3909, 3);
    expect(pair("ctrl", "trt2").pValue).toBeCloseTo(0.198, 3);
    expect(r.interpretation.details.join(" ")).toContain("«trt1» y «trt2»");
  });
});

describe("chi-cuadrado de independencia", () => {
  it("género y partido (Agresti): χ² = 30,07, gl = 2", () => {
    const r = chiSquareIndependence(
      [
        [762, 327, 468],
        [484, 239, 477],
      ],
      "género",
      "partido",
    )!;
    expect(r.statistic).toBeCloseTo(30.07, 1);
    expect(r.reference).toEqual({ kind: "chi2", df: 2 });
    expect(r.pValue).toBeLessThan(1e-6);
    expect(r.interpretation.headline).toContain("están relacionadas");
  });

  it("avisa cuando hay celdas con menos de 5 esperados", () => {
    const r = chiSquareIndependence(
      [
        [3, 1],
        [1, 3],
      ],
      "a",
      "b",
    )!;
    expect(r.interpretation.caveats[0]).toContain("Fisher");
  });
});

describe("datos sin variación (criterio de t.test de R)", () => {
  it("no prueba ni estima con datos esencialmente constantes", async () => {
    const { meanInterval, meanDifferenceInterval } = await import("./intervals");
    expect(
      twoSampleT(
        { label: "A", values: [0.1, 0.1, 0.1] },
        { label: "B", values: [0.3, 0.3, 0.3] },
        "x",
      ),
    ).toBeNull();
    expect(meanInterval([4, 4, 4], "x")).toBeNull();
    expect(meanDifferenceInterval([5, 5, 5], [3, 3, 3], "A", "B", "x")).toBeNull();
    expect(pairedT([1.1, 2.2, 3.3], [1.2, 2.3, 3.4], "antes", "después")).toBeNull();
    expect(oneSampleT([0.1, 0.1, 0.1], 0, "x")).toBeNull();
  });
});
