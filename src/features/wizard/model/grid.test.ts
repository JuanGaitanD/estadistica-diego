import { describe, expect, it } from "vitest";

import { buildDataset } from "@/core/data";

import {
  addColumn,
  addRow,
  emptyGrid,
  GRID_MAX_ROWS,
  gridFromDataset,
  gridToTsv,
  pasteBlock,
  removeColumn,
  removeRow,
  setCell,
  setHeader,
} from "./grid";

describe("hoja editable", () => {
  it("empieza vacía con nombres de columna", () => {
    const grid = emptyGrid(2, 3);
    expect(grid.headers).toEqual(["Columna 1", "Columna 2"]);
    expect(grid.rows).toHaveLength(3);
  });

  it("edita, añade y quita filas y columnas", () => {
    let grid = emptyGrid(1, 1);
    grid = setHeader(grid, 0, "Horas");
    grid = setCell(grid, 0, 0, "3,5");
    grid = addColumn(grid);
    grid = addRow(grid);
    expect(grid).toEqual({
      headers: ["Horas", "Columna 2"],
      rows: [
        ["3,5", ""],
        ["", ""],
      ],
    });
    expect(removeRow(grid, 1).rows).toHaveLength(1);
    expect(removeColumn(grid, 1).headers).toEqual(["Horas"]);
    expect(removeColumn(removeColumn(grid, 1), 0).headers).toEqual(["Horas"]);
  });

  it("convierte a texto tabulado sin filas vacías ni tabuladores dentro de celdas", () => {
    const grid = {
      headers: ["X", "Y"],
      rows: [
        ["1", "a\tb"],
        ["", " "],
        ["2", "c"],
      ],
    };
    expect(gridToTsv(grid)).toBe("X\tY\n1\ta b\n2\tc");
  });

  it("lee los datos cargados con coma decimal y sin miles, y deja vacíos los faltantes", () => {
    const dataset = buildDataset(
      [
        ["1234.5", "a"],
        ["", "b"],
      ],
      {
        source: "texto",
        headers: ["Peso", "Grupo"],
        numberFormat: "en",
      },
    );
    const grid = gridFromDataset(dataset);
    expect(grid.headers).toEqual(["Peso", "Grupo"]);
    expect(grid.rows).toEqual([
      ["1234,5", "a"],
      ["", "b"],
    ]);
    expect(GRID_MAX_ROWS).toBeGreaterThan(100);
  });

  it("pega un bloque de Excel y crece si hace falta", () => {
    const grid = pasteBlock(emptyGrid(1, 1), 0, 0, "1\t2\r\n3\t4\r\n");
    expect(grid).toEqual({
      headers: ["Columna 1", "Columna 2"],
      rows: [
        ["1", "2"],
        ["3", "4"],
      ],
    });
  });
});
