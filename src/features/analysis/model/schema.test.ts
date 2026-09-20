import { describe, expect, it } from "vitest";

import { parseAnalysisRequest, safeParseAnalysisRequest } from "./schema";
import type { AnalysisRequest } from "./types";

const VALID: AnalysisRequest = {
  datasetId: "ds-1",
  missingPolicy: "excluir-por-variable",
  variables: [
    {
      variableId: "hijos",
      grouping: { enabled: false, rule: "sturges", closure: "cerrado-abierto" },
      frequency: { relativeMode: "porcentaje", showCumulative: true, showClassMark: false },
      central: {
        arithmetic: true,
        weighted: true,
        weightsSource: { kind: "manual", weights: [1, 2] },
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
        outliers: false,
      },
    },
  ],
  contingencies: [{ rowVariableId: "sexo", columnVariableId: "hijos", percentages: "fila" }],
  charts: [
    {
      id: "g1",
      type: "barras",
      title: "Hijos",
      variableId: "hijos",
      source: "frecuencia",
      labels: { showValue: true, showPercent: true, showCategory: true },
      paletteKey: "hijos",
      caption: "Frecuencia por número de hijos",
    },
  ],
};

describe("analysisRequestSchema", () => {
  it("acepta una petición completa", () => {
    expect(parseAnalysisRequest(VALID)).toEqual(VALID);
    const safe = safeParseAnalysisRequest(VALID);
    expect(safe.ok).toBe(true);
  });

  it("exige al menos una variable, con mensaje en español", () => {
    const result = safeParseAnalysisRequest({ ...VALID, variables: [] });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.errors[0]).toBe("Selecciona al menos una variable para analizar");
    }
  });

  it("no deja cruzar una variable consigo misma", () => {
    const result = safeParseAnalysisRequest({
      ...VALID,
      contingencies: [{ rowVariableId: "sexo", columnVariableId: "sexo", percentages: "ninguno" }],
    });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.errors).toContain("Para cruzar necesitas dos variables distintas");
    }
  });

  it("rechaza percentiles fuera del rango 1..99", () => {
    const variable = { ...VALID.variables[0] } as AnalysisRequest["variables"][number];
    const result = safeParseAnalysisRequest({
      ...VALID,
      variables: [{ ...variable, position: { ...variable.position, percentiles: [0, 120] } }],
    });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.errors.some((message) => message.includes("del 1 al 99"))).toBe(true);
    }
  });

  it("lanza cuando la petición no es válida", () => {
    expect(() => parseAnalysisRequest({ datasetId: "" })).toThrow();
  });
});
