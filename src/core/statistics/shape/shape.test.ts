import { describe, expect, it } from "vitest";

import { quantile, sortAscending } from "../numeric";
import {
  boxPlotSummary,
  kurtosis,
  percentileOfValue,
  SHAPE_REASONS,
  skewness,
  zScores,
} from "./shape";

// Ejemplo de la ayuda de Excel para COEFICIENTE.ASIMETRIA y CURTOSIS.
const EXCEL = [3, 4, 5, 2, 3, 4, 5, 6, 4, 7];

describe("skewness", () => {
  it("coincide con COEFICIENTE.ASIMETRIA de Excel", () => {
    expect(skewness(EXCEL).value).toBeCloseTo(0.359543071, 8);
  });

  it("es 0 en datos simétricos y cambia de signo al reflejarlos", () => {
    expect(skewness([1, 2, 3, 4, 5]).value).toBeCloseTo(0, 12);
    const mirrored = EXCEL.map((x) => -x);
    expect(skewness(mirrored).value).toBeCloseTo(-0.359543071, 8);
  });

  it("explica por qué no se calcula", () => {
    expect(skewness([1, 2]).unavailableReason).toBe(SHAPE_REASONS.minimoTres);
    expect(skewness([2, 2, 2]).unavailableReason).toBe(SHAPE_REASONS.sinVariacion);
  });
});

describe("kurtosis", () => {
  it("coincide con CURTOSIS de Excel", () => {
    expect(kurtosis(EXCEL).value).toBeCloseTo(-0.151799637, 8);
  });

  it("pide al menos 4 datos", () => {
    expect(kurtosis([1, 2, 3]).unavailableReason).toBe(SHAPE_REASONS.minimoCuatro);
  });
});

describe("zScores", () => {
  it("tienen media 0 y desviación 1", () => {
    const z = zScores(EXCEL) ?? [];
    const mean = z.reduce((a, b) => a + b, 0) / z.length;
    const sd = Math.sqrt(z.reduce((a, b) => a + (b - mean) ** 2, 0) / (z.length - 1));
    expect(mean).toBeCloseTo(0, 12);
    expect(sd).toBeCloseTo(1, 12);
  });

  it("no se definen sin variación", () => {
    expect(zScores([3, 3])).toBeNull();
  });
});

describe("percentileOfValue", () => {
  const sorted = sortAscending(EXCEL);

  it("coincide con RANGO.PERCENTIL.INC de Excel", () => {
    // Ejemplo de la ayuda de Excel: {13,12,11,8,4,3,2,1,1,1}, x = 2 → 0,333; x = 8 → 0,666…
    const help = sortAscending([13, 12, 11, 8, 4, 3, 2, 1, 1, 1]);
    expect(percentileOfValue(help, 2)).toBeCloseTo(1 / 3, 10);
    expect(percentileOfValue(help, 4)).toBeCloseTo(5 / 9, 10);
    expect(percentileOfValue(help, 8)).toBeCloseTo(6 / 9, 10);
    expect(percentileOfValue(help, 5)).toBeCloseTo(0.583333, 6);
  });

  it("es el inverso del cuantil R-7", () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.73, 1]) {
      const x = quantile(sorted, p) ?? 0;
      const back = percentileOfValue(sorted, x) ?? -1;
      expect(quantile(sorted, back)).toBeCloseTo(x, 10);
    }
  });

  it("devuelve null fuera de los datos", () => {
    expect(percentileOfValue(sorted, 1)).toBeNull();
    expect(percentileOfValue(sorted, 8)).toBeNull();
  });
});

describe("boxPlotSummary", () => {
  it("lleva los bigotes hasta el último dato que no es atípico", () => {
    const box = boxPlotSummary([1, 2, 3, 4, 5, 6, 7, 8, 30]);
    expect(box).toMatchObject({ min: 1, q1: 3, median: 5, q3: 7, max: 30 });
    expect(box?.lowerWhisker).toBe(1);
    expect(box?.upperWhisker).toBe(8);
    expect(box?.outliers).toEqual([30]);
  });

  it("caso de la §7: Y = 3, 3, 4, 5, 5", () => {
    expect(boxPlotSummary([3, 3, 4, 5, 5])).toEqual({
      min: 3,
      q1: 3,
      median: 4,
      q3: 5,
      max: 5,
      lowerWhisker: 3,
      upperWhisker: 5,
      outliers: [],
    });
  });
});
