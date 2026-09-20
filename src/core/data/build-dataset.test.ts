import { describe, expect, it } from "vitest";
import { buildDataset } from "./build-dataset";
import { MAX_CELLS, DatasetSizeError } from "./limits";

describe("buildDataset", () => {
  it("construye columnas discretas, continuas y nominales", () => {
    const dataset = buildDataset(
      [
        [1, 2.5, "rojo"],
        [2, 3.5, "azul"],
        [3, 4.5, "rojo"],
      ],
      { source: "texto", headers: ["edad", "altura", "color"] },
    );

    expect(dataset.rowCount).toBe(3);
    expect(dataset.columns).toHaveLength(3);
    expect(dataset.columns[0]?.variable.kind).toBe("discreta");
    expect(dataset.columns[1]?.variable.kind).toBe("continua");
    expect(dataset.columns[2]?.variable.kind).toBe("nominal");
  });

  it("detecta valores faltantes y genera advertencia", () => {
    const dataset = buildDataset([["1"], ["NA"], [""], ["4"]], { source: "texto", headers: ["n"] });
    expect(dataset.columns[0]?.missingCount).toBe(2);
    expect(dataset.warnings.some((w) => w.code === "faltantes")).toBe(true);
  });

  it("interpreta números en formato español dentro de una columna de texto", () => {
    const dataset = buildDataset([["1.234,56"], ["2.000,00"]], {
      source: "texto",
      headers: ["monto"],
      numberFormat: "es",
    });
    expect(dataset.columns[0]?.values[0]).toBeCloseTo(1234.56, 10);
  });

  it("genera ids únicos aunque los nombres se repitan", () => {
    const dataset = buildDataset([["1", "2"]], { source: "texto", headers: ["x", "x"] });
    const ids = dataset.columns.map((c) => c.variable.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("respeta el orden ordinal declarado por columna", () => {
    const dataset = buildDataset([["bajo"], ["alto"], ["medio"]], {
      source: "texto",
      headers: ["nivel"],
      ordinalOrders: { nivel: ["bajo", "medio", "alto"] },
    });
    expect(dataset.columns[0]?.variable.kind).toBe("ordinal");
    expect(dataset.columns[0]?.variable.categoryOrder).toEqual(["bajo", "medio", "alto"]);
  });

  it("lanza DatasetSizeError cuando se excede el límite de celdas", () => {
    const columnCount = 3;
    const rowCount = Math.ceil(MAX_CELLS / columnCount) + 1;
    const rows = Array.from({ length: rowCount }, () => ["1", "2", "3"]);
    expect(() => buildDataset(rows, { source: "csv", headers: ["a", "b", "c"] })).toThrow(
      DatasetSizeError,
    );
  });

  it("produce un dataset vacío (sin filas) sin lanzar", () => {
    const dataset = buildDataset([], { source: "texto", headers: ["a"] });
    expect(dataset.rowCount).toBe(0);
    expect(dataset.columns[0]?.variable.kind).toBe("nominal");
  });
});
