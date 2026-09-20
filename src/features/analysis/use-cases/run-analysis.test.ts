import { describe, expect, it } from "vitest";

import { buildDataset, type CellValue, type Dataset } from "@/core/data";

import type { AnalysisRequest, VariableAnalysisRequest, WeightsSource } from "../model/types";
import { getApplicability } from "./applicability";
import { runAnalysis } from "./run-analysis";
import { RESULT_SECTIONS } from "./sections";

const ROWS: readonly (readonly CellValue[])[] = [
  ["M", 1, 1.5],
  ["F", 2, 1.62],
  ["M", 2, 1.71],
  ["F", 3, 1.55],
  ["M", 1, 1.8],
  ["F", 2, 1.66],
  ["M", 4, 1.59],
  ["F", null, 1.74],
];

function dataset(): Dataset {
  return buildDataset(ROWS, { source: "texto", headers: ["Sexo", "Hijos", "Estatura"] });
}

function variableRequest(
  variableId: string,
  overrides: Partial<VariableAnalysisRequest> = {},
): VariableAnalysisRequest {
  return {
    variableId,
    grouping: { enabled: false, rule: "sturges", closure: "cerrado-abierto" },
    frequency: { relativeMode: "porcentaje", showCumulative: true, showClassMark: true },
    central: {
      arithmetic: true,
      weighted: false,
      geometric: false,
      harmonic: false,
      median: true,
      mode: true,
    },
    position: {
      quartiles: true,
      quartileMethod: "inclusivo",
      includeQ2: true,
      deciles: false,
      percentiles: [90],
    },
    variability: {
      range: true,
      sampleVariance: true,
      populationVariance: false,
      standardDeviation: true,
      coefficientOfVariation: true,
      iqr: true,
      outliers: true,
    },
    ...overrides,
  };
}

function request(overrides: Partial<AnalysisRequest> = {}): AnalysisRequest {
  return {
    datasetId: "ds-1",
    missingPolicy: "excluir-por-variable",
    variables: [variableRequest("sexo"), variableRequest("hijos"), variableRequest("estatura")],
    contingencies: [],
    charts: [],
    ...overrides,
  };
}

const FIXED = { requestId: "req-1", computedAt: "2026-01-01T00:00:00.000Z" };

describe("getApplicability", () => {
  it("bloquea los promedios en una variable nominal y explica por qué", () => {
    const matrix = getApplicability("nominal");
    expect(matrix["media-aritmetica"].ok).toBe(false);
    expect(matrix["media-aritmetica"].reason).toMatch(/cuantitativas/i);
    expect(matrix["frecuencia-acumulada"].ok).toBe(false);
    expect(matrix.moda.ok).toBe(true);
  });

  it("permite estadísticos posicionales en ordinal, con advertencia", () => {
    const matrix = getApplicability("ordinal");
    expect(matrix.cuantiles).toMatchObject({ ok: true, level: "advertencia" });
    expect(matrix.mediana.ok).toBe(true);
    expect(matrix["media-aritmetica"].ok).toBe(false);
  });

  it("advierte sobre la tabla de valores únicos en una continua sin agrupar", () => {
    expect(getApplicability("continua").frecuencias.level).toBe("advertencia");
    expect(getApplicability("continua", true).frecuencias.level).toBe("ok");
    expect(getApplicability("continua").contingencia.level).toBe("advertencia");
    expect(getApplicability("continua", true).contingencia.level).toBe("ok");
  });

  it("no deja agrupar una variable cualitativa", () => {
    expect(getApplicability("nominal")["frecuencias-agrupadas"].ok).toBe(false);
    expect(getApplicability("discreta")["frecuencias-agrupadas"].level).toBe("advertencia");
  });
});

describe("runAnalysis", () => {
  it("clasifica las tres variables del dataset", () => {
    const result = runAnalysis(dataset(), request(), FIXED);
    expect(result.variables.map((variable) => variable.kind)).toEqual([
      "nominal",
      "discreta",
      "continua",
    ]);
    expect(result.requestId).toBe("req-1");
    expect(result.totalRows).toBe(8);
  });

  it("devuelve como no disponible lo que no aplica a una nominal, sin lanzar", () => {
    const result = runAnalysis(dataset(), request(), FIXED);
    const sexo = result.variables[0];
    const keys = sexo?.unavailable.map((entry) => entry.key) ?? [];
    expect(keys).toContain("media-aritmetica");
    expect(keys).toContain("mediana");
    expect(keys).toContain("frecuencia-acumulada");
    expect(keys).toContain("cuantiles");
    expect(keys).toContain("varianza");
    for (const entry of sexo?.unavailable ?? []) {
      expect(entry.reason.length).toBeGreaterThan(10);
    }
    // La tabla de frecuencias sí se calcula y la moda también.
    expect(sexo?.analysis.frequency?.n).toBe(8);
    // Con 4 "M" y 4 "F" todas las categorías empatan: la variable es amodal.
    expect(sexo?.analysis.central?.mode.kind).toBe("amodal");
    expect(sexo?.analysis.central?.mode.values).toHaveLength(0);
    expect(sexo?.analysis.position).toBeUndefined();
  });

  it("calcula el resumen y los promedios de la variable discreta", () => {
    const result = runAnalysis(dataset(), request(), FIXED);
    const hijos = result.variables[1];
    const summary = Object.fromEntries(
      (hijos?.analysis.summary ?? []).map((metric) => [metric.key, metric.value]),
    );
    expect(summary["n-efectivo"]).toBe(7);
    expect(summary.minimo).toBe(1);
    expect(summary.maximo).toBe(4);

    const mean = hijos?.analysis.central?.metrics.find(
      (metric) => metric.key === "media-aritmetica",
    );
    expect(mean?.value).toBeCloseTo(15 / 7, 10);
    expect(hijos?.analysis.central?.mode.kind).toBe("unimodal");
    expect(hijos?.analysis.position?.quartiles).not.toHaveLength(0);
    expect(hijos?.unavailable).toHaveLength(0);
  });

  it("agrupa en intervalos la variable continua y expone K y l", () => {
    const result = runAnalysis(
      dataset(),
      request({
        variables: [
          variableRequest("estatura", {
            grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
          }),
        ],
      }),
      FIXED,
    );
    const estatura = result.variables[0];
    expect(estatura?.grouped).toBe(true);
    expect(estatura?.analysis.groupedFrequency?.k).toBeGreaterThan(1);
    expect(estatura?.analysis.groupedFrequency?.intervalLength).toBeGreaterThan(0);
    expect(estatura?.analysis.groupedFrequency?.rule).toBe("sturges");
  });

  it("ignora el agrupamiento pedido sobre una variable nominal y lo avisa", () => {
    const result = runAnalysis(
      dataset(),
      request({
        variables: [
          variableRequest("sexo", {
            grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
          }),
        ],
      }),
      FIXED,
    );
    expect(result.variables[0]?.grouped).toBe(false);
    expect(
      result.variables[0]?.unavailable.some((entry) => entry.key === "frecuencias-agrupadas"),
    ).toBe(true);
  });

  it("apaga la marca de clase cuando no hay intervalos", () => {
    const result = runAnalysis(dataset(), request(), FIXED);
    expect(result.variables[1]?.request.frequency.showClassMark).toBe(false);
  });

  it("recoge los avisos del dataset y los de aplicabilidad", () => {
    const result = runAnalysis(dataset(), request(), FIXED);
    expect(result.warnings.some((warning) => warning.code === "faltantes")).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "no-aplicable")).toBe(true);
    expect(result.warnings.every((warning) => warning.message.length > 0)).toBe(true);
  });

  it("excluye filas completas cuando esa es la política", () => {
    const result = runAnalysis(
      dataset(),
      request({ missingPolicy: "excluir-fila-completa" }),
      FIXED,
    );
    const sexo = result.variables[0];
    expect(sexo?.analysis.frequency?.n).toBe(7);
    expect(result.warnings.some((warning) => warning.message.includes("1 fila(s) completas"))).toBe(
      true,
    );
  });

  it("cruza dos variables con sus totales marginales", () => {
    const result = runAnalysis(
      dataset(),
      request({
        variables: [variableRequest("sexo")],
        contingencies: [{ rowVariableId: "sexo", columnVariableId: "hijos", percentages: "fila" }],
      }),
      FIXED,
    );
    const cross = result.contingencies[0];
    expect(cross?.table?.grandTotal).toBe(7);
    expect(cross?.table?.excluded).toBe(1);
    expect(cross?.rowVariableName).toBe("Sexo");
  });

  it("avisa cuando se cruza una continua sin agrupar", () => {
    const result = runAnalysis(
      dataset(),
      request({
        variables: [],
        contingencies: [
          { rowVariableId: "sexo", columnVariableId: "estatura", percentages: "ninguno" },
        ],
      }),
      FIXED,
    );
    expect(
      result.warnings.some((warning) => warning.message.includes("se cruzó sin agrupar")),
    ).toBe(true);
  });

  it("usa las clases de la continua agrupada al cruzarla", () => {
    const result = runAnalysis(
      dataset(),
      request({
        variables: [
          variableRequest("estatura", {
            grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
          }),
        ],
        contingencies: [
          { rowVariableId: "sexo", columnVariableId: "estatura", percentages: "ninguno" },
        ],
      }),
      FIXED,
    );
    const labels = result.contingencies[0]?.table?.columnLabels ?? [];
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((label) => label.includes("["))).toBe(true);
  });

  it("no lanza cuando la variable o la gráfica ya no existen", () => {
    const result = runAnalysis(
      dataset(),
      request({
        variables: [variableRequest("inexistente")],
        contingencies: [
          { rowVariableId: "sexo", columnVariableId: "inexistente", percentages: "ninguno" },
        ],
        charts: [
          {
            id: "g1",
            type: "barras",
            title: "Gráfica fantasma",
            variableId: "inexistente",
            source: "frecuencia",
            labels: { showValue: true, showPercent: true, showCategory: true },
            paletteKey: "inexistente",
            caption: "",
          },
        ],
      }),
      FIXED,
    );
    expect(result.variables).toHaveLength(0);
    expect(result.charts).toHaveLength(0);
    expect(result.contingencies[0]?.table).toBeNull();
    expect(
      result.warnings.filter((warning) => warning.code === "variable-inexistente").length,
    ).toBe(3);
  });

  it("conserva las gráficas cuyas variables existen", () => {
    const result = runAnalysis(
      dataset(),
      request({
        charts: [
          {
            id: "g1",
            type: "barras",
            title: "Hijos por frecuencia",
            variableId: "hijos",
            source: "frecuencia",
            labels: { showValue: true, showPercent: true, showCategory: true },
            paletteKey: "hijos",
            caption: "Frecuencia de cada número de hijos",
          },
        ],
      }),
      FIXED,
    );
    expect(result.charts).toHaveLength(1);
  });

  describe("media ponderada", () => {
    const weighted = (weightsSource: WeightsSource | undefined) =>
      runAnalysis(
        dataset(),
        request({
          variables: [
            variableRequest("hijos", {
              central: {
                arithmetic: false,
                weighted: true,
                geometric: false,
                harmonic: false,
                median: false,
                mode: false,
                ...(weightsSource !== undefined ? { weightsSource } : {}),
              },
            }),
          ],
        }),
        FIXED,
      );

    it("calcula con pesos manuales de la longitud correcta", () => {
      const result = weighted({ kind: "manual", weights: [1, 1, 1, 1, 1, 1, 1] });
      const metric = result.variables[0]?.analysis.central?.metrics[0];
      expect(metric?.value).toBeCloseTo(15 / 7, 10);
    });

    it("explica cuándo los pesos manuales no cuadran", () => {
      const result = weighted({ kind: "manual", weights: [1, 2] });
      expect(result.variables[0]?.unavailable[0]?.reason).toMatch(/7 pesos/);
    });

    it("usa una columna numérica como pesos", () => {
      const result = weighted({ kind: "columna", variableId: "estatura" });
      expect(result.variables[0]?.analysis.central?.metrics[0]?.value).toBeGreaterThan(0);
      expect(result.variables[0]?.unavailable).toHaveLength(0);
    });

    it("explica cuándo la columna de pesos no sirve", () => {
      const result = weighted({ kind: "columna", variableId: "sexo" });
      expect(result.variables[0]?.unavailable[0]?.reason).toMatch(/peso numérico/);
    });

    it("pide elegir el origen de los pesos", () => {
      const result = weighted(undefined);
      expect(result.variables[0]?.unavailable[0]?.reason).toMatch(/Elige de dónde salen los pesos/);
    });

    it("remite a la media de datos agrupados cuando los pesos son frecuencias", () => {
      const result = weighted({ kind: "frecuencias" });
      expect(result.variables[0]?.unavailable[0]?.reason).toMatch(/datos agrupados/);
    });
  });

  it("genera identificador y fecha cuando no se fijan", () => {
    const result = runAnalysis(dataset(), request());
    expect(result.requestId.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(result.computedAt))).toBe(false);
  });
});

describe("RESULT_SECTIONS", () => {
  it("describe las secciones con ids estables", () => {
    const result = runAnalysis(
      dataset(),
      request({
        contingencies: [
          { rowVariableId: "sexo", columnVariableId: "hijos", percentages: "ninguno" },
        ],
      }),
      FIXED,
    );
    const sections = RESULT_SECTIONS(result);
    const ids = sections.map((section) => section.id);
    expect(ids[0]).toBe("section-resumen-general");
    expect(ids).toContain("section-sexo-resumen");
    expect(ids).toContain("section-sexo-frecuencias");
    expect(ids).toContain("section-hijos-posicion");
    expect(ids).toContain("section-hijos-variabilidad");
    expect(ids).toContain("section-contingencia-sexo-hijos");
    expect(ids).not.toContain("section-sexo-posicion");
    expect(sections.every((section) => section.title.length > 0)).toBe(true);
  });

  it("omite los cruces que no se pudieron calcular", () => {
    const result = runAnalysis(
      dataset(),
      request({
        variables: [],
        contingencies: [
          { rowVariableId: "sexo", columnVariableId: "inexistente", percentages: "ninguno" },
        ],
      }),
      FIXED,
    );
    expect(RESULT_SECTIONS(result)).toHaveLength(1);
  });
});

describe("rendimiento (RNF-06)", () => {
  it("resuelve 50.000 valores en el hilo principal sin bloquearlo", () => {
    const rows: CellValue[][] = [];
    for (let index = 0; index < 50_000; index += 1) {
      rows.push([Math.round((index % 997) * 100) / 100]);
    }
    const big = buildDataset(rows, { source: "texto", headers: ["Medida"] });
    const started = performance.now();
    const result = runAnalysis(
      big,
      {
        datasetId: big.id,
        missingPolicy: "excluir-por-variable",
        variables: [
          variableRequest("medida", {
            grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
          }),
        ],
        contingencies: [],
        charts: [],
      },
      FIXED,
    );
    const elapsed = performance.now() - started;
    expect(result.variables[0]?.analysis.summary[0]?.value).toBe(50_000);
    // Umbral holgado para no depender de la máquina de CI; en un portátil de gama
    // media la medida real queda por debajo de 200 ms (ver comentario de run-analysis).
    expect(elapsed).toBeLessThan(1000);
  });
});
