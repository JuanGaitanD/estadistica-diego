import { describe, expect, it } from "vitest";
import { EXPLANATIONS, explanationFor } from "./catalog";
import { computeContingencyTable } from "../contingency/contingency";
import { makeKeyedMetric, makeMetric, unavailableMetric } from "../metric";
import { runVariableAnalysis } from "../run-variable-analysis";
import type { Explanation, Metric } from "../types";

function expectExplanation(explanation: Explanation): void {
  expect(explanation.what.trim().length).toBeGreaterThan(0);
  expect(explanation.why.trim().length).toBeGreaterThan(0);
  expect(explanation.formula?.trim().length ?? 1).toBeGreaterThan(0);
}

describe("catálogo de explicaciones", () => {
  it("todas las entradas tienen qué significa, para qué sirve y fórmula", () => {
    for (const explanation of Object.values(EXPLANATIONS)) {
      expectExplanation(explanation);
    }
  });

  it("explanationFor devuelve la entrada del catálogo", () => {
    expect(explanationFor("media-aritmetica")).toBe(EXPLANATIONS["media-aritmetica"]);
  });
});

describe("constructores de métricas", () => {
  it("degrada a null un valor no finito", () => {
    const metric = makeMetric("rango", "Rango", Number.NaN);
    expect(metric.value).toBeNull();
    expect(metric.unavailableReason).toBeDefined();
  });

  it("construye métricas no disponibles con su motivo", () => {
    expect(unavailableMetric("rango", "Rango", "motivo").unavailableReason).toBe("motivo");
  });

  it("makeKeyedMetric conserva la clave propia", () => {
    const available = makeKeyedMetric("Q1", "cuartiles", "Cuartil 1", 3, "motivo");
    expect(available.key).toBe("Q1");
    expect(available.value).toBe(3);
    const missing = makeKeyedMetric("Q1", "cuartiles", "Cuartil 1", Number.NaN, "motivo");
    expect(missing.value).toBeNull();
  });
});

describe("guardia: todo resultado expone su explicación", () => {
  const checkMetrics = (metrics: readonly Metric[]): void => {
    for (const metric of metrics) {
      expectExplanation(metric.explanation);
      expect(metric.label.length).toBeGreaterThan(0);
      if (metric.value === null) {
        expect(metric.unavailableReason?.length ?? 0).toBeGreaterThan(0);
      } else {
        expect(Number.isFinite(metric.value)).toBe(true);
      }
    }
  };

  it("el análisis de una variable cuantitativa", () => {
    const result = runVariableAnalysis({
      variableId: "x",
      kind: "continua",
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
      central: {
        arithmetic: true,
        weighted: true,
        geometric: true,
        harmonic: true,
        median: true,
        mode: true,
      },
      position: {
        quartiles: true,
        quartileMethod: "inclusivo",
        includeQ2: true,
        deciles: true,
        percentiles: "todos",
      },
      variability: {
        range: true,
        sampleVariance: true,
        populationVariance: true,
        standardDeviation: true,
        coefficientOfVariation: true,
        iqr: true,
        outliers: true,
      },
    });
    checkMetrics(result.summary);
    checkMetrics(result.central?.metrics ?? []);
    checkMetrics(result.position?.quartiles ?? []);
    checkMetrics(result.position?.deciles ?? []);
    checkMetrics(result.position?.percentiles ?? []);
    checkMetrics(result.variability?.metrics ?? []);
    expectExplanation(result.frequency?.explanation ?? EXPLANATIONS.moda);
    expectExplanation(result.groupedFrequency?.explanation ?? EXPLANATIONS.moda);
    expectExplanation(result.central?.mode.explanation ?? EXPLANATIONS.moda);
    checkMetrics(
      [
        result.central?.groupedMean,
        result.central?.groupedMedian,
        result.central?.groupedMode,
      ].filter((metric): metric is Metric => metric !== undefined),
    );
  });

  it("el análisis de una variable cualitativa vacía", () => {
    const result = runVariableAnalysis({ variableId: "c", kind: "nominal", values: [] });
    checkMetrics(result.summary);
    expectExplanation(result.frequency?.explanation ?? EXPLANATIONS.moda);
    expectExplanation(result.central?.mode.explanation ?? EXPLANATIONS.moda);
  });

  it("la tabla de contingencia", () => {
    const table = computeContingencyTable({
      rowVariableId: "a",
      columnVariableId: "b",
      rowValues: ["x", "y"],
      columnValues: ["1", "2"],
    });
    expectExplanation(table.explanation);
  });
});
