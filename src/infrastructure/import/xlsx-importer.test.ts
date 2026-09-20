import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { importXlsxFile, listXlsxSheets } from "./xlsx-importer";

function buildWorkbookFile(): File {
  const workbook = XLSX.utils.book_new();
  const sheet1 = XLSX.utils.aoa_to_sheet([
    ["edad", "fecha"],
    [20, new Date(Date.UTC(2024, 0, 15))],
    [30, new Date(Date.UTC(2024, 5, 1))],
  ]);
  const sheet2 = XLSX.utils.aoa_to_sheet([["ciudad"], ["Lima"], ["Cusco"]]);
  XLSX.utils.book_append_sheet(workbook, sheet1, "Personas");
  XLSX.utils.book_append_sheet(workbook, sheet2, "Ciudades");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buffer], "datos.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("listXlsxSheets", () => {
  it("lista los nombres de las hojas disponibles", async () => {
    const file = buildWorkbookFile();
    const sheets = await listXlsxSheets(file);
    expect(sheets).toEqual(["Personas", "Ciudades"]);
  });
});

describe("importXlsxFile", () => {
  it("importa la primera hoja por defecto y convierte fechas a ISO", async () => {
    const file = buildWorkbookFile();
    const dataset = await importXlsxFile(file, { hasHeader: true });
    expect(dataset.source).toBe("xlsx");
    expect(dataset.columns.map((c) => c.variable.name)).toEqual(["edad", "fecha"]);
    expect(dataset.columns[1]?.values[0]).toBe("2024-01-15");
  });

  it("permite elegir una hoja distinta", async () => {
    const file = buildWorkbookFile();
    const dataset = await importXlsxFile(file, { hasHeader: true, sheetName: "Ciudades" });
    expect(dataset.columns.map((c) => c.variable.name)).toEqual(["ciudad"]);
    expect(dataset.columns[0]?.values).toEqual(["Lima", "Cusco"]);
  });
});
