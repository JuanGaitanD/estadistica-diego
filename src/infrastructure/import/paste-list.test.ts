/**
 * Casos de pegado del brief: "una lista de variables separada por coma".
 *
 * Se prueban desde `importPastedText` (y no solo desde el parser puro) porque
 * lo que importa es el `Dataset` que acaba viendo la persona usuaria.
 */
import { describe, expect, it } from "vitest";

import { importPastedText } from "./text-importer";

describe("pegar una lista en una sola línea", () => {
  it("la lee como una variable con N datos, no como N variables con un dato", () => {
    const dataset = importPastedText("4, 7, 2, 9, 5", { hasHeader: false });

    expect(dataset.columns).toHaveLength(1);
    expect(dataset.columns[0]?.variable.name).toBe("Datos");
    expect(dataset.rowCount).toBe(5);
    expect(dataset.columns[0]?.values).toEqual([4, 7, 2, 9, 5]);
    expect(dataset.warnings.some((w) => w.code === "lista-transpuesta")).toBe(true);
  });

  it('avisa de la ambigüedad de "1,5, 2,3, 4, 4, 7" y explica cómo resolverla', () => {
    const dataset = importPastedText("1,5, 2,3, 4, 4, 7", { hasHeader: false });
    const warning = dataset.warnings.find((w) => w.code === "decimal-ambiguo");

    expect(warning).toBeDefined();
    expect(warning?.message).toMatch(/Coma decimal/);
    // Sin decidir nada, cada coma separa: 7 datos enteros.
    expect(dataset.rowCount).toBe(7);
  });

  it('con "Coma decimal" elegido, "1,5, 2,3, 4, 4, 7" son 5 datos', () => {
    const dataset = importPastedText("1,5, 2,3, 4, 4, 7", {
      hasHeader: false,
      numberFormat: "es",
    });

    expect(dataset.columns).toHaveLength(1);
    expect(dataset.rowCount).toBe(5);
    expect(dataset.columns[0]?.values).toEqual([1.5, 2.3, 4, 4, 7]);
    expect(dataset.warnings.some((w) => w.code === "decimal-ambiguo")).toBe(false);
  });

  it("una lista con salto de línea sigue siendo una variable por columna", () => {
    const dataset = importPastedText("4\n7\n2\n9", { hasHeader: false });
    expect(dataset.columns).toHaveLength(1);
    expect(dataset.rowCount).toBe(4);
    expect(dataset.warnings.some((w) => w.code === "lista-transpuesta")).toBe(false);
  });

  it("una tabla de verdad con encabezado no se transpone", () => {
    const dataset = importPastedText("Nota,Genero\n4.5,F\n3.8,M", { hasHeader: true });
    expect(dataset.columns.map((c) => c.variable.name)).toEqual(["Nota", "Genero"]);
    expect(dataset.rowCount).toBe(2);
    expect(dataset.warnings.some((w) => w.code === "lista-transpuesta")).toBe(false);
  });

  it("una tabla sin encabezado y con varias filas no se transpone", () => {
    const dataset = importPastedText("4.5,F\n3.8,M", { hasHeader: false });
    expect(dataset.columns).toHaveLength(2);
    expect(dataset.rowCount).toBe(2);
  });

  it("una sola fila con encabezado activado deja el dataset vacío, sin lanzar", () => {
    const dataset = importPastedText("Nota,Genero", { hasHeader: true });
    expect(dataset.columns).toHaveLength(2);
    expect(dataset.rowCount).toBe(0);
  });

  it("acepta punto y coma como separador", () => {
    const dataset = importPastedText("Nota;Genero\n4,5;F\n3,8;M", {
      hasHeader: true,
      numberFormat: "es",
    });
    expect(dataset.columns.map((c) => c.variable.name)).toEqual(["Nota", "Genero"]);
    expect(dataset.columns[0]?.values).toEqual([4.5, 3.8]);
  });

  it("un solo valor pegado no se transpone y da n = 1", () => {
    const dataset = importPastedText("42", { hasHeader: false });
    expect(dataset.columns).toHaveLength(1);
    expect(dataset.rowCount).toBe(1);
  });
});
