import { describe, expect, it } from "vitest";
import {
  computeGroupedFrequencyTable,
  computeSimpleFrequencyTable,
  DEFAULT_FREQUENCY_OPTIONS,
} from "./frequency-table";
import type { GroupingOptions } from "../types";

const grouping: GroupingOptions = { enabled: true, rule: "sturges", closure: "cerrado-abierto" };

describe("computeSimpleFrequencyTable", () => {
  it("cuenta categorías y calcula hi, Fi y Hi", () => {
    const table = computeSimpleFrequencyTable({
      variableId: "color",
      values: ["rojo", "azul", "rojo", "verde", "rojo", "azul"],
    });
    expect(table.n).toBe(6);
    expect(table.grouped).toBe(false);
    expect(table.rows.map((row) => row.label)).toEqual(["rojo", "azul", "verde"]);
    expect(table.rows[0]?.absolute).toBe(3);
    expect(table.rows[0]?.relative).toBeCloseTo(0.5, 10);
    expect(table.rows[table.rows.length - 1]?.cumulativeAbsolute).toBe(6);
    expect(table.rows[table.rows.length - 1]?.cumulativeRelative).toBeCloseTo(1, 10);
    expect(table.rows.reduce((total, row) => total + row.absolute, 0)).toBe(table.n);
  });

  it("ordena numéricamente los datos cuantitativos sin agrupar", () => {
    const table = computeSimpleFrequencyTable({ variableId: "x", values: [10, 2, 2, 100] });
    expect(table.rows.map((row) => row.label)).toEqual(["2", "10", "100"]);
  });

  it("respeta el orden declarado de categorías ordinales", () => {
    const table = computeSimpleFrequencyTable({
      variableId: "nivel",
      values: ["alto", "bajo", "medio", "bajo"],
      categoryOrder: ["bajo", "medio", "alto"],
    });
    expect(table.rows.map((row) => row.label)).toEqual(["bajo", "medio", "alto"]);
  });

  it("descarta valores no numéricos y lo advierte", () => {
    const table = computeSimpleFrequencyTable({
      variableId: "x",
      values: [1, Number.NaN, 2],
      excluded: 1,
    });
    expect(table.n).toBe(2);
    expect(table.excluded).toBe(2);
    expect(table.warnings).toHaveLength(1);
  });

  it("con n = 0 devuelve una tabla vacía y un aviso", () => {
    const table = computeSimpleFrequencyTable({ variableId: "x", values: [] });
    expect(table.n).toBe(0);
    expect(table.rows).toHaveLength(0);
    expect(table.warnings).toContain("No quedan datos válidos en esta variable.");
  });

  it("adapta la fórmula de la explicación a las opciones", () => {
    const table = computeSimpleFrequencyTable({
      variableId: "x",
      values: [1, 2],
      options: { relativeMode: "porcentaje", showCumulative: false, showClassMark: false },
    });
    expect(table.explanation.formula).toContain("pi = 100 · fi/n");
    expect(table.explanation.formula).not.toContain("Fi");
  });
});

describe("computeGroupedFrequencyTable", () => {
  const values = Array.from({ length: 100 }, (unused, index) => index + 1);

  it("agrupa en K clases con Sturges y cubre todo el recorrido", () => {
    const table = computeGroupedFrequencyTable({ variableId: "x", values, grouping });
    expect(table.grouped).toBe(true);
    expect(table.k).toBe(8);
    expect(table.rule).toBe("sturges");
    expect(table.n).toBe(100);
    expect(table.rows.reduce((total, row) => total + row.absolute, 0)).toBe(100);
    expect(table.rows[table.rows.length - 1]?.cumulativeRelative).toBeCloseTo(1, 10);
    expect(table.rows[0]?.classMark).toBeCloseTo(7.5, 10);
  });

  it("incluye el máximo en la última clase", () => {
    const table = computeGroupedFrequencyTable({ variableId: "x", values, grouping });
    const last = table.rows[table.rows.length - 1];
    expect(last?.upperBound).toBeGreaterThanOrEqual(100);
    expect(table.rows.reduce((total, row) => total + row.absolute, 0)).toBe(table.n);
  });

  it("descarta valores no numéricos", () => {
    const table = computeGroupedFrequencyTable({
      variableId: "x",
      values: [...values, Number.NaN],
      grouping,
    });
    expect(table.n).toBe(100);
    expect(table.excluded).toBe(1);
  });

  it("con n = 0 devuelve una tabla vacía", () => {
    const table = computeGroupedFrequencyTable({
      variableId: "x",
      values: [],
      grouping,
      options: DEFAULT_FREQUENCY_OPTIONS,
    });
    expect(table.rows).toHaveLength(0);
    expect(table.n).toBe(0);
    expect(table.explanation.what.length).toBeGreaterThan(0);
  });
});
