import { describe, expect, it } from "vitest";
import { computeContingencyTable } from "./contingency";

describe("computeContingencyTable", () => {
  const rowValues = ["M", "F", "M", "F", "M", "F"];
  const columnValues = ["sí", "sí", "no", "no", "sí", "no"];

  it("cuenta las combinaciones y los marginales", () => {
    const table = computeContingencyTable({
      rowVariableId: "sexo",
      columnVariableId: "respuesta",
      rowValues,
      columnValues,
    });
    expect(table.rowLabels).toEqual(["M", "F"]);
    expect(table.columnLabels).toEqual(["sí", "no"]);
    expect(table.cells[0]?.[0]?.absolute).toBe(2);
    expect(table.cells[0]?.[1]?.absolute).toBe(1);
    expect(table.rowTotals).toEqual([3, 3]);
    expect(table.columnTotals).toEqual([3, 3]);
    expect(table.grandTotal).toBe(6);
    expect(table.rowTotals.reduce((a, b) => a + b, 0)).toBe(table.grandTotal);
    expect(table.columnTotals.reduce((a, b) => a + b, 0)).toBe(table.grandTotal);
  });

  it("los porcentajes por fila suman 100", () => {
    const table = computeContingencyTable({
      rowVariableId: "sexo",
      columnVariableId: "respuesta",
      rowValues,
      columnValues,
    });
    for (const row of table.cells) {
      expect(row.reduce((total, cell) => total + cell.rowPercent, 0)).toBeCloseTo(100, 10);
    }
    for (let j = 0; j < table.columnLabels.length; j += 1) {
      const total = table.cells.reduce((sum, row) => sum + (row[j]?.columnPercent ?? 0), 0);
      expect(total).toBeCloseTo(100, 10);
    }
    const totalPercent = table.cells.reduce(
      (sum, row) => sum + row.reduce((inner, cell) => inner + cell.totalPercent, 0),
      0,
    );
    expect(totalPercent).toBeCloseTo(100, 10);
  });

  it("excluye las filas con algún faltante", () => {
    const table = computeContingencyTable({
      rowVariableId: "a",
      columnVariableId: "b",
      rowValues: ["x", null, "x", "y"],
      columnValues: ["1", "1", null, "2"],
    });
    expect(table.grandTotal).toBe(2);
    expect(table.excluded).toBe(2);
  });

  it("resalta todos los índices empatados", () => {
    const table = computeContingencyTable({
      rowVariableId: "a",
      columnVariableId: "b",
      rowValues: ["x", "x"],
      columnValues: ["1", "2"],
    });
    expect(table.rowExtremes[0]?.maxIndexes).toEqual([0, 1]);
    expect(table.rowExtremes[0]?.minIndexes).toEqual([0, 1]);
    expect(table.rowExtremes[0]?.maxIndex).toBe(0);
  });

  it("identifica el máximo y el mínimo por columna", () => {
    const table = computeContingencyTable({
      rowVariableId: "a",
      columnVariableId: "b",
      rowValues: ["x", "x", "y"],
      columnValues: ["1", "1", "1"],
    });
    expect(table.columnExtremes[0]?.maxIndex).toBe(0);
    expect(table.columnExtremes[0]?.minIndex).toBe(1);
  });

  it("respeta el orden declarado de categorías", () => {
    const table = computeContingencyTable({
      rowVariableId: "nivel",
      columnVariableId: "b",
      rowValues: ["alto", "bajo", "otro"],
      columnValues: ["1", "1", "1"],
      rowOrder: ["bajo", "medio", "alto"],
      columnOrder: ["1", "2"],
    });
    expect(table.rowLabels).toEqual(["bajo", "alto", "otro"]);
    expect(table.columnLabels).toEqual(["1"]);
  });

  it("sin datos devuelve una tabla vacía con su explicación", () => {
    const table = computeContingencyTable({
      rowVariableId: "a",
      columnVariableId: "b",
      rowValues: [],
      columnValues: [],
    });
    expect(table.grandTotal).toBe(0);
    expect(table.cells).toHaveLength(0);
    expect(table.explanation.what.length).toBeGreaterThan(0);
  });

  it("cuenta como excluidas las filas sobrantes de la variable más larga", () => {
    const table = computeContingencyTable({
      rowVariableId: "a",
      columnVariableId: "b",
      rowValues: ["x", "y", "z"],
      columnValues: ["1"],
    });
    expect(table.excluded).toBe(2);
    expect(table.grandTotal).toBe(1);
  });
});
