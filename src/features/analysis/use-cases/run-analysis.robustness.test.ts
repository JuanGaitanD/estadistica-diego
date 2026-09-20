/**
 * Robustez y rendimiento de `runAnalysis` (revisión senior).
 *
 * Contrato comprobado aquí: con entradas extremas nunca se lanza, nunca sale
 * `NaN` y siempre hay un motivo en español para lo que no se pudo calcular.
 */
import { describe, expect, it } from "vitest";

import { buildDataset, type CellValue, type Dataset } from "@/core/data";

import type { AnalysisRequest, VariableAnalysisRequest } from "../model/types";
import { runAnalysis } from "./run-analysis";

function fullRequest(variableId: string, grouped = false): VariableAnalysisRequest {
  return {
    variableId,
    grouping: { enabled: grouped, rule: "sturges", closure: "cerrado-abierto" },
    frequency: { relativeMode: "porcentaje", showCumulative: true, showClassMark: true },
    central: {
      arithmetic: true,
      weighted: false,
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
      percentiles: [5, 90, 99],
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
  };
}

function request(dataset: Dataset, grouped = false): AnalysisRequest {
  return {
    datasetId: dataset.id,
    missingPolicy: "excluir-por-variable",
    variables: dataset.columns.map((column) => fullRequest(column.variable.id, grouped)),
    contingencies: [],
    charts: [],
  };
}

/** Ninguna métrica calculada puede ser NaN ni infinita. */
function expectNoNaN(dataset: Dataset, grouped = false): void {
  const result = runAnalysis(dataset, request(dataset, grouped));
  for (const variable of result.variables) {
    const metrics = [
      ...variable.analysis.summary,
      ...(variable.analysis.central?.metrics ?? []),
      ...(variable.analysis.position?.quartiles ?? []),
      ...(variable.analysis.position?.deciles ?? []),
      ...(variable.analysis.position?.percentiles ?? []),
      ...(variable.analysis.variability?.metrics ?? []),
    ];
    for (const metric of metrics) {
      if (metric.value === null) {
        expect(metric.unavailableReason, `${metric.key} sin motivo`).toBeTruthy();
      } else {
        expect(Number.isFinite(metric.value), `${metric.key} = ${metric.value}`).toBe(true);
      }
    }
    for (const note of variable.analysis.notes) {
      expect(note).not.toMatch(/NaN|undefined|null/);
    }
  }
  for (const warning of result.warnings) {
    expect(warning.message).not.toMatch(/NaN|undefined|\bnull\b/);
  }
}

function fromRows(rows: readonly (readonly CellValue[])[], headers: readonly string[]): Dataset {
  return buildDataset(rows, { source: "texto", headers: [...headers] });
}

describe("runAnalysis con entradas extremas", () => {
  it("columna completamente vacía", () => {
    expectNoNaN(fromRows([[null], [null], [null]], ["Vacía"]));
  });

  it("todos los valores iguales, con y sin agrupar", () => {
    const dataset = fromRows([[4], [4], [4], [4]], ["Constante"]);
    expectNoNaN(dataset);
    expectNoNaN(dataset, true);
  });

  it("n = 1", () => {
    expectNoNaN(fromRows([[7]], ["Uno"]));
  });

  it("valores negativos y ceros (dominio inválido de geométrica y armónica)", () => {
    expectNoNaN(fromRows([[-3], [0], [2], [5]], ["Mixta"]));
  });

  it("variable cualitativa con faltantes", () => {
    expectNoNaN(fromRows([["a"], [null], ["b"], ["a"]], ["Categoría"]));
  });

  it("una sola fila con texto y número mezclados", () => {
    expectNoNaN(
      fromRows(
        [
          ["a", 1],
          [null, null],
        ],
        ["Texto", "Número"],
      ),
    );
  });
});

describe("runAnalysis con 50 000 filas (RNF-06)", () => {
  it("resuelve 4 variables en un tiempo razonable en el hilo principal", () => {
    const size = 50_000;
    const rows: CellValue[][] = new Array(size);
    for (let index = 0; index < size; index += 1) {
      rows[index] = [
        index % 7,
        Math.sin(index) * 100,
        index % 2 === 0 ? "M" : "F",
        (index % 13) / 4,
      ];
    }
    const dataset = fromRows(rows, ["Discreta", "Continua", "Sexo", "Decimal"]);
    const started = performance.now();
    const result = runAnalysis(dataset, request(dataset, true));
    const elapsed = performance.now() - started;

    expect(result.variables).toHaveLength(4);
    expect(result.totalRows).toBe(size);
    // Presupuesto holgado para no volver el test inestable en CI; el valor
    // medido en esta máquina está muy por debajo (ver README del módulo).
    expect(elapsed).toBeLessThan(3000);
    process.stdout.write(`\n[perf] runAnalysis 50k x 4 variables: ${elapsed.toFixed(0)} ms\n`);
  });
});
