import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { exportDatasetToXlsx } from "./xlsx-exporter";
import { buildDataset } from "@/core/data";

describe("exportDatasetToXlsx", () => {
  it("genera un libro con una hoja a partir de un Dataset", async () => {
    const dataset = buildDataset(
      [
        ["1", "rojo"],
        ["2", "azul"],
      ],
      { source: "texto", headers: ["n", "color"] },
    );
    const blob = exportDatasetToXlsx(dataset);
    const buffer = await blob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    expect(workbook.SheetNames).toHaveLength(1);
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    const rows = XLSX.utils.sheet_to_json(sheet!, { header: 1 });
    expect(rows[0]).toEqual(["n", "color"]);
  });

  it("genera una hoja por cada tabla genérica", async () => {
    const blob = exportDatasetToXlsx([
      { title: "Frecuencias", columns: ["valor", "fi"], rows: [[1, 3]] },
      { title: "Posición", columns: ["percentil", "valor"], rows: [[50, 10]] },
    ]);
    const buffer = await blob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    expect(workbook.SheetNames).toEqual(["Frecuencias", "Posición"]);
  });

  it("sanea nombres de hoja repetidos o inválidos", async () => {
    const blob = exportDatasetToXlsx([
      { title: "a:b", columns: ["x"], rows: [[1]] },
      { title: "a:b", columns: ["x"], rows: [[2]] },
    ]);
    const buffer = await blob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    expect(workbook.SheetNames[0]).not.toContain(":");
    expect(new Set(workbook.SheetNames).size).toBe(2);
  });
});
