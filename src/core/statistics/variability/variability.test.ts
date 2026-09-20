import { describe, expect, it } from "vitest";
import {
  coefficientOfVariation,
  computeVariability,
  detectOutliers,
  populationVariance,
  range,
  sampleVariance,
  standardDeviation,
} from "./variability";
import { REASONS } from "../numeric/validate";

const sample = [2, 4, 4, 4, 5, 5, 7, 9];

describe("range", () => {
  it("calcula máximo − mínimo", () => {
    expect(range(sample).value).toBe(7);
  });

  it("con n = 1 el rango es 0", () => {
    expect(range([5]).value).toBe(0);
  });

  it("sin datos devuelve null con motivo", () => {
    expect(range([]).unavailableReason).toBe(REASONS.sinDatos);
  });
});

describe("varianzas y desviación estándar", () => {
  it("calcula s² con divisor n−1 y σ² con divisor n", () => {
    expect(sampleVariance(sample).value).toBeCloseTo(32 / 7, 10);
    expect(populationVariance(sample).value).toBeCloseTo(4, 10);
  });

  it("con n = 1 la varianza muestral no está definida", () => {
    expect(sampleVariance([5]).unavailableReason).toBe(REASONS.minimoDos);
    expect(populationVariance([5]).value).toBe(0);
  });

  it("sin datos devuelve null con motivo", () => {
    expect(sampleVariance([]).unavailableReason).toBe(REASONS.sinDatos);
    expect(populationVariance([]).unavailableReason).toBe(REASONS.sinDatos);
  });

  it("es cero cuando todos los valores son iguales", () => {
    expect(sampleVariance([3, 3, 3]).value).toBe(0);
    expect(standardDeviation([3, 3, 3]).value).toBe(0);
  });

  it("la desviación estándar es la raíz de la varianza", () => {
    expect(standardDeviation(sample).value).toBeCloseTo(Math.sqrt(32 / 7), 10);
    expect(standardDeviation(sample, "poblacional").value).toBeCloseTo(2, 10);
    expect(standardDeviation([5]).unavailableReason).toBe(REASONS.minimoDos);
  });

  it("es precisa con datos de media grande y varianza pequeña", () => {
    expect(sampleVariance([1e9 + 1, 1e9 + 2, 1e9 + 3]).value).toBeCloseTo(1, 10);
  });
});

describe("coefficientOfVariation", () => {
  it("se expresa en porcentaje sobre la media", () => {
    expect(coefficientOfVariation(sample).value).toBeCloseTo((100 * Math.sqrt(32 / 7)) / 5, 10);
  });

  it("es 0 cuando todos los valores son iguales", () => {
    expect(coefficientOfVariation([3, 3, 3]).value).toBe(0);
  });

  it("no es interpretable con media cero", () => {
    expect(coefficientOfVariation([0, 0, 0]).unavailableReason).toBe(REASONS.mediaCero);
  });

  it("no es interpretable con signos mixtos", () => {
    expect(coefficientOfVariation([-5, 1, 3]).unavailableReason).toBe(REASONS.signosMixtos);
  });

  it("usa el valor absoluto de la media cuando todos son negativos", () => {
    const cv = coefficientOfVariation([-2, -4, -6]);
    expect(cv.value).not.toBeNull();
    expect(cv.value ?? -1).toBeGreaterThan(0);
  });

  it("sin datos suficientes devuelve null con motivo", () => {
    expect(coefficientOfVariation([5]).unavailableReason).toBe(REASONS.minimoDos);
  });
});

describe("detectOutliers", () => {
  it("aplica el criterio de Tukey", () => {
    const report = detectOutliers([1, 2, 3, 4, 100]);
    expect(report.fences?.lower).toBeCloseTo(-1, 10);
    expect(report.fences?.upper).toBeCloseTo(7, 10);
    expect(report.outliers).toEqual([100]);
    expect(report.lowerFence.value).toBeCloseTo(-1, 10);
    expect(report.upperFence.value).toBeCloseTo(7, 10);
  });

  it("sin atípicos devuelve una lista vacía", () => {
    expect(detectOutliers([1, 2, 3, 4]).outliers).toEqual([]);
  });

  it("sin datos devuelve límites no disponibles", () => {
    const report = detectOutliers([]);
    expect(report.fences).toBeNull();
    expect(report.lowerFence.unavailableReason).toBe(REASONS.sinDatos);
  });

  it("el método exclusivo puede no estar definido", () => {
    const report = detectOutliers([1, 2], "exclusivo");
    expect(report.fences).toBeNull();
    expect(report.upperFence.unavailableReason).toBe(REASONS.fueraDeRango);
  });
});

describe("computeVariability", () => {
  it("devuelve todas las métricas pedidas con sus explicaciones", () => {
    const result = computeVariability({
      variableId: "x",
      values: [1, 2, 3, 4, 100],
      options: {
        range: true,
        sampleVariance: true,
        populationVariance: true,
        standardDeviation: true,
        coefficientOfVariation: true,
        iqr: true,
        outliers: true,
      },
    });
    expect(result.metrics.map((metric) => metric.key)).toEqual([
      "rango",
      "varianza-muestral",
      "varianza-poblacional",
      "desviacion-estandar",
      "desviacion-estandar-poblacional",
      "coeficiente-de-variacion",
      "ric",
      "limite-inferior-tukey",
      "limite-superior-tukey",
    ]);
    expect(result.outliers).toEqual([100]);
    expect(result.fences).not.toBeNull();
  });

  it("puede omitir los atípicos", () => {
    const result = computeVariability({
      variableId: "x",
      values: sample,
      options: {
        range: false,
        sampleVariance: false,
        populationVariance: false,
        standardDeviation: false,
        coefficientOfVariation: false,
        iqr: false,
        outliers: false,
      },
    });
    expect(result.metrics).toHaveLength(0);
    expect(result.fences).toBeNull();
  });

  it("usa las opciones por defecto", () => {
    const result = computeVariability({ variableId: "x", values: sample });
    expect(result.metrics.length).toBeGreaterThan(0);
  });
});
