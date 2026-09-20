import { describe, expect, it } from "vitest";
import { runVariableAnalysis } from "./run-variable-analysis";

describe("runVariableAnalysis", () => {
  it("calcula el paquete completo de una variable continua", () => {
    const values = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5];
    const result = runVariableAnalysis({
      variableId: "estatura",
      kind: "continua",
      values,
    });
    expect(result.summary.map((metric) => metric.key)).toEqual(["n-efectivo", "minimo", "maximo"]);
    expect(result.summary[0]?.value).toBe(8);
    expect(result.summary[1]?.value).toBe(1.5);
    expect(result.summary[2]?.value).toBe(8.5);
    expect(result.frequency?.n).toBe(8);
    expect(result.central?.metrics[0]?.value).toBeCloseTo(5, 10);
    expect(result.position?.quartiles).toHaveLength(3);
    expect(result.variability?.metrics.length).toBeGreaterThan(0);
    expect(result.groupedFrequency).toBeUndefined();
  });

  it("excluye faltantes y valores no numéricos de una cuantitativa", () => {
    const result = runVariableAnalysis({
      variableId: "x",
      kind: "discreta",
      values: [1, null, "abc", 3, ""],
    });
    expect(result.summary[0]?.value).toBe(2);
    expect(result.notes.some((note) => note.includes("no numéricos"))).toBe(true);
  });

  it("agrupa en intervalos cuando se pide", () => {
    const values = Array.from({ length: 100 }, (unused, index) => index + 1);
    const result = runVariableAnalysis({
      variableId: "x",
      kind: "continua",
      values,
      grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
    });
    expect(result.groupedFrequency?.k).toBe(8);
    expect(result.central?.groupedMedian?.value).not.toBeNull();
    expect(result.central?.groupedMode?.value).not.toBeNull();
  });

  it("sugiere agrupar una continua con muchos valores distintos", () => {
    const values = Array.from({ length: 30 }, (unused, index) => index + 0.5);
    const result = runVariableAnalysis({ variableId: "x", kind: "continua", values });
    expect(result.notes.some((note) => note.includes("agruparla en intervalos"))).toBe(true);
  });

  it("avisa si se pide agrupar una variable cualitativa", () => {
    const result = runVariableAnalysis({
      variableId: "c",
      kind: "nominal",
      values: ["a", "b"],
      grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
    });
    expect(result.groupedFrequency).toBeUndefined();
    expect(result.notes.some((note) => note.includes("cuantitativas"))).toBe(true);
  });

  it("en una nominal solo aplica frecuencias y moda", () => {
    const result = runVariableAnalysis({
      variableId: "color",
      kind: "nominal",
      values: ["rojo", "azul", "rojo"],
    });
    expect(result.central?.metrics).toHaveLength(0);
    expect(result.central?.mode.kind).toBe("unimodal");
    expect(result.position).toBeUndefined();
    expect(result.variability).toBeUndefined();
    expect(result.summary).toHaveLength(1);
    expect(result.notes.some((note) => note.includes("acumuladas"))).toBe(true);
  });

  it("en una ordinal calcula la mediana posicional", () => {
    const result = runVariableAnalysis({
      variableId: "nivel",
      kind: "ordinal",
      values: ["bajo", "alto", "medio"],
      categoryOrder: ["bajo", "medio", "alto"],
    });
    expect(result.ordinalMedian?.label).toBe("medio");
    expect(result.frequency?.rows.map((row) => row.label)).toEqual(["bajo", "medio", "alto"]);
  });

  it("con n = 0 devuelve todo null y un aviso", () => {
    const result = runVariableAnalysis({ variableId: "x", kind: "continua", values: [null, ""] });
    expect(result.summary[0]?.value).toBe(0);
    expect(result.summary[1]?.value).toBeNull();
    expect(result.notes).toContain("No quedan datos válidos en esta variable.");
    for (const metric of result.variability?.metrics ?? []) {
      expect(metric.value).toBeNull();
    }
  });

  it("con n = 1 la varianza muestral no está definida y el rango es 0", () => {
    const result = runVariableAnalysis({ variableId: "x", kind: "discreta", values: [7] });
    const byKey = new Map(result.variability?.metrics.map((m) => [m.key, m]) ?? []);
    expect(byKey.get("rango")?.value).toBe(0);
    expect(byKey.get("varianza-muestral")?.value).toBeNull();
    expect(result.central?.metrics[0]?.value).toBe(7);
  });

  it("acepta pesos para la media ponderada", () => {
    const result = runVariableAnalysis({
      variableId: "x",
      kind: "discreta",
      values: [4, 3, 5],
      weights: [2, 3, 1],
      central: {
        arithmetic: false,
        weighted: true,
        geometric: false,
        harmonic: false,
        median: false,
        mode: false,
      },
    });
    expect(result.central?.metrics[0]?.value).toBeCloseTo(22 / 6, 10);
  });
});
