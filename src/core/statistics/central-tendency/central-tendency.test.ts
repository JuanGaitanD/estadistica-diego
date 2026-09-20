import { describe, expect, it } from "vitest";
import { computeCentralTendency } from "./central-tendency";
import { arithmeticMean, geometricMean, groupedMean, harmonicMean, weightedMean } from "./means";
import { groupedMedian, median, ordinalMedian } from "./median";
import { groupedMode, mode } from "./mode";
import { computeGroupedFrequencyTable } from "../frequency/frequency-table";
import { quantile } from "../numeric/quantile";
import { REASONS } from "../numeric/validate";
import type { FrequencyRow, GroupingOptions } from "../types";

describe("arithmeticMean", () => {
  it("calcula la media de un conjunto conocido", () => {
    expect(arithmeticMean([2, 4, 4, 4, 5, 5, 7, 9]).value).toBeCloseTo(5, 10);
  });

  it("es precisa en el caso de cancelación", () => {
    expect(arithmeticMean([1e9 + 1, 1e9 + 2, 1e9 + 3]).value).toBeCloseTo(1000000002, 10);
  });

  it("con n = 1 devuelve el valor", () => {
    expect(arithmeticMean([7]).value).toBe(7);
  });

  it("sin datos devuelve null con motivo", () => {
    const metric = arithmeticMean([]);
    expect(metric.value).toBeNull();
    expect(metric.unavailableReason).toBe(REASONS.sinDatos);
  });

  it("rechaza NaN en la entrada", () => {
    expect(arithmeticMean([1, Number.NaN]).unavailableReason).toBe(REASONS.noNumerico);
  });
});

describe("weightedMean", () => {
  it("promedia notas por créditos", () => {
    expect(weightedMean([4, 3, 5], [2, 3, 1]).value).toBeCloseTo((8 + 9 + 5) / 6, 10);
  });

  it("no normaliza los pesos", () => {
    expect(weightedMean([1, 2], [10, 10]).value).toBeCloseTo(1.5, 10);
  });

  it("rechaza pesos negativos", () => {
    expect(weightedMean([1, 2], [-1, 2]).unavailableReason).toBe(REASONS.pesosInvalidos);
  });

  it("rechaza suma de pesos cero", () => {
    expect(weightedMean([1, 2], [0, 0]).unavailableReason).toBe(REASONS.pesosSumaCero);
  });

  it("rechaza longitudes distintas", () => {
    expect(weightedMean([1, 2], [1]).unavailableReason).toBe(REASONS.pesosLongitud);
  });

  it("rechaza pesos no numéricos y datos vacíos", () => {
    expect(weightedMean([1, 2], [1, Number.NaN]).unavailableReason).toBe(REASONS.noNumerico);
    expect(weightedMean([], []).unavailableReason).toBe(REASONS.sinDatos);
  });

  it("acepta las frecuencias como pesos", () => {
    expect(weightedMean([1, 2, 3], [1, 2, 3]).value).toBeCloseTo(14 / 6, 10);
  });
});

describe("geometricMean y harmonicMean", () => {
  it("la media geométrica de 1, 3 y 9 es 3", () => {
    expect(geometricMean([1, 3, 9]).value).toBeCloseTo(3, 10);
  });

  it("la media armónica de 60 y 40 es 48", () => {
    expect(harmonicMean([60, 40]).value).toBeCloseTo(48, 10);
  });

  it("no están definidas con ceros ni negativos", () => {
    expect(geometricMean([1, 0, 3]).unavailableReason).toBe(REASONS.soloPositivos);
    expect(geometricMean([1, -3]).unavailableReason).toBe(REASONS.soloPositivos);
    expect(harmonicMean([1, 0]).unavailableReason).toBe(REASONS.soloPositivos);
    expect(geometricMean([]).unavailableReason).toBe(REASONS.sinDatos);
    expect(harmonicMean([]).unavailableReason).toBe(REASONS.sinDatos);
  });

  it("cumple H < G < media en datos positivos no constantes", () => {
    const values = [2, 4, 8, 16];
    const h = harmonicMean(values).value ?? 0;
    const g = geometricMean(values).value ?? 0;
    const mean = arithmeticMean(values).value ?? 0;
    expect(h).toBeLessThan(g);
    expect(g).toBeLessThan(mean);
  });
});

describe("median", () => {
  it("con n impar devuelve el valor central", () => {
    expect(median([3, 1, 2]).value).toBe(2);
  });

  it("con n par promedia los dos centrales", () => {
    expect(median([4, 1, 3, 2]).value).toBeCloseTo(2.5, 10);
  });

  it("coincide exactamente con el cuantil 0,5 por R-7", () => {
    const values = [6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49];
    expect(median(values).value).toBe(
      quantile(
        [...values].sort((a, b) => a - b),
        0.5,
      ),
    );
  });

  it("sin datos devuelve null con motivo", () => {
    expect(median([]).unavailableReason).toBe(REASONS.sinDatos);
  });
});

describe("mode", () => {
  it("detecta el caso unimodal", () => {
    const result = mode([1, 2, 2, 3]);
    expect(result.kind).toBe("unimodal");
    expect(result.label).toBe("unimodal");
    expect(result.values).toEqual([{ value: 2, count: 2 }]);
  });

  it("detecta el caso bimodal y trimodal", () => {
    expect(mode([1, 1, 2, 2, 3]).label).toBe("bimodal");
    expect(mode([1, 1, 2, 2, 3, 3, 4]).label).toBe("trimodal");
    expect(mode([1, 1, 2, 2, 3, 3, 4, 4, 5]).label).toBe("multimodal");
  });

  it("detecta el caso amodal", () => {
    const result = mode(["a", "b", "c"]);
    expect(result.kind).toBe("amodal");
    expect(result.values).toHaveLength(0);
  });

  it("con un único valor distinto es unimodal", () => {
    expect(mode([5, 5, 5]).kind).toBe("unimodal");
  });

  it("sin datos es amodal", () => {
    expect(mode([]).kind).toBe("amodal");
    expect(mode([Number.NaN]).kind).toBe("amodal");
  });
});

describe("datos agrupados", () => {
  const grouping: GroupingOptions = {
    enabled: true,
    rule: "manual",
    manualK: 4,
    closure: "cerrado-abierto",
  };
  const values = [1, 2, 3, 4, 5, 6, 7, 8];
  const table = computeGroupedFrequencyTable({ variableId: "x", values, grouping });

  it("la media agrupada aproxima la media cruda", () => {
    // Clases [1,3), [3,5), [5,7), [7,9] con marcas 2, 4, 6 y 8 y 2 datos cada una.
    const grouped = groupedMean(table.rows).value ?? 0;
    expect(grouped).toBeCloseTo(5, 10);
  });

  it("la mediana agrupada sigue la fórmula de interpolación", () => {
    const rows: FrequencyRow[] = [
      {
        label: "[0, 10)",
        lowerBound: 0,
        upperBound: 10,
        classMark: 5,
        absolute: 4,
        relative: 0.2,
        cumulativeAbsolute: 4,
        cumulativeRelative: 0.2,
      },
      {
        label: "[10, 20)",
        lowerBound: 10,
        upperBound: 20,
        classMark: 15,
        absolute: 10,
        relative: 0.5,
        cumulativeAbsolute: 14,
        cumulativeRelative: 0.7,
      },
      {
        label: "[20, 30]",
        lowerBound: 20,
        upperBound: 30,
        classMark: 25,
        absolute: 6,
        relative: 0.3,
        cumulativeAbsolute: 20,
        cumulativeRelative: 1,
      },
    ];
    // n = 20, n/2 = 10, clase [10,20): Me = 10 + ((10 - 4)/10)·10 = 16
    expect(groupedMedian(rows, 10).value).toBeCloseTo(16, 10);
    // Mo = 10 + (6 / (6 + 4))·10 = 16
    expect(groupedMode(rows, 10).value).toBeCloseTo(16, 10);
  });

  it("devuelve null sin filas", () => {
    expect(groupedMean([]).unavailableReason).toBe(REASONS.sinDatos);
    expect(groupedMedian([], 1).unavailableReason).toBe(REASONS.sinDatos);
    expect(groupedMode([], 1).unavailableReason).toBe(REASONS.sinDatos);
  });

  it("interpola la moda en la primera clase de frecuencia máxima", () => {
    const rows: FrequencyRow[] = [
      {
        label: "[0, 10)",
        lowerBound: 0,
        upperBound: 10,
        classMark: 5,
        absolute: 5,
        relative: 0.5,
        cumulativeAbsolute: 5,
        cumulativeRelative: 0.5,
      },
      {
        label: "[10, 20]",
        lowerBound: 10,
        upperBound: 20,
        classMark: 15,
        absolute: 5,
        relative: 0.5,
        cumulativeAbsolute: 10,
        cumulativeRelative: 1,
      },
    ];
    // D1 = 5 − 0 = 5, D2 = 5 − 5 = 0: Mo = 0 + (5/5)·10 = 10
    expect(groupedMode(rows, 10).value).toBeCloseTo(10, 10);
  });
});

describe("ordinalMedian", () => {
  const order = ["bajo", "medio", "alto"];

  it("con n impar devuelve la categoría central", () => {
    expect(ordinalMedian(["bajo", "alto", "medio"], order).label).toBe("medio");
  });

  it("con n par devuelve la categoría en la posición n/2 + 1", () => {
    expect(ordinalMedian(["bajo", "bajo", "medio", "alto"], order).label).toBe("medio");
  });

  it("sin categorías reconocidas devuelve null con motivo", () => {
    const result = ordinalMedian(["otro"], order);
    expect(result.label).toBeNull();
    expect(result.unavailableReason).toBe(REASONS.sinDatos);
  });
});

describe("computeCentralTendency", () => {
  it("devuelve solo las métricas pedidas", () => {
    const result = computeCentralTendency({
      variableId: "x",
      values: [1, 2, 3, 4],
      options: {
        arithmetic: true,
        weighted: true,
        geometric: true,
        harmonic: true,
        median: true,
        mode: true,
      },
      weights: [1, 1, 1, 1],
    });
    expect(result.metrics.map((metric) => metric.key)).toEqual([
      "media-aritmetica",
      "media-ponderada",
      "media-geometrica",
      "media-armonica",
      "mediana",
    ]);
    expect(result.mode.kind).toBe("amodal");
    expect(result.groupedMean).toBeUndefined();
  });

  it("añade las versiones agrupadas cuando hay intervalos", () => {
    const grouping: GroupingOptions = {
      enabled: true,
      rule: "sturges",
      closure: "cerrado-abierto",
    };
    const table = computeGroupedFrequencyTable({
      variableId: "x",
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      grouping,
    });
    const result = computeCentralTendency({
      variableId: "x",
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      groupedRows: table.rows,
      intervalLength: table.intervalLength ?? 0,
    });
    expect(result.groupedMean?.value).not.toBeNull();
    expect(result.groupedMedian?.value).not.toBeNull();
    expect(result.groupedMode?.value).not.toBeNull();
  });

  it("usa las opciones por defecto", () => {
    const result = computeCentralTendency({ variableId: "x", values: [1, 2, 3] });
    expect(result.metrics).toHaveLength(2);
  });
});

describe("guardas de los cálculos agrupados", () => {
  const row = (extra: Partial<FrequencyRow>): FrequencyRow => ({
    label: "clase",
    absolute: 4,
    relative: 0.5,
    cumulativeAbsolute: 4,
    cumulativeRelative: 0.5,
    ...extra,
  });

  const rowWithoutLowerBound = (): FrequencyRow => ({
    label: "clase",
    absolute: 4,
    relative: 0.5,
    cumulativeAbsolute: 4,
    cumulativeRelative: 0.5,
  });

  it("la mediana agrupada exige límite inferior y frecuencia no nula", () => {
    expect(groupedMedian([rowWithoutLowerBound()], 10).value).toBeNull();
    expect(
      groupedMedian([row({ lowerBound: 0, upperBound: 10, absolute: 0 })], 10).value,
    ).toBeNull();
  });

  it("la mediana agrupada devuelve null si ninguna clase alcanza n/2", () => {
    const broken = [row({ lowerBound: 0, upperBound: 10, cumulativeAbsolute: 0 })];
    expect(groupedMedian(broken, 10).value).toBeNull();
  });

  it("la mediana agrupada usa la longitud dada si la clase no tiene ancho", () => {
    const single = [row({ lowerBound: 0, absolute: 4, cumulativeAbsolute: 4 })];
    expect(groupedMedian(single, 10).value).toBeCloseTo(5, 10);
  });

  it("la moda agrupada exige límite inferior y frecuencia no nula", () => {
    expect(groupedMode([rowWithoutLowerBound()], 10).value).toBeNull();
    expect(groupedMode([row({ absolute: 0, lowerBound: 0 })], 10).value).toBeNull();
  });

  it("la moda agrupada usa la longitud dada si la clase no tiene ancho", () => {
    // D1 = D2 = 4: Mo = 0 + (4/8)·10 = 5
    expect(groupedMode([row({ lowerBound: 0 })], 10).value).toBeCloseTo(5, 10);
  });
});
