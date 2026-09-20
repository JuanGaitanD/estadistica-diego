import { describe, expect, it } from "vitest";
import { importFile, MAX_FILE_SIZE_BYTES } from "./import-file";
import { ImportError } from "./errors";

describe("importFile", () => {
  it("importa un CSV válido eligiendo el adaptador por extensión", async () => {
    const file = new File(["a,b\n1,2"], "datos.csv", { type: "text/csv" });
    const dataset = await importFile(file, { hasHeader: true });
    expect(dataset.source).toBe("csv");
  });

  it("importa un XLSX válido eligiendo el adaptador por extensión", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([["a"], [1], [2]]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Hoja1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([buffer], "datos.xlsx");
    const dataset = await importFile(file, { hasHeader: true });
    expect(dataset.source).toBe("xlsx");
  });

  it("rechaza un archivo vacío con un ImportError tipificado", async () => {
    const file = new File([], "vacio.csv", { type: "text/csv" });
    await expect(importFile(file, { hasHeader: true })).rejects.toMatchObject({
      code: "archivo-vacio",
    });
  });

  it("rechaza un archivo que excede el tamaño máximo", async () => {
    const big = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    const file = new File([big], "grande.csv", { type: "text/csv" });
    await expect(importFile(file, { hasHeader: true })).rejects.toBeInstanceOf(ImportError);
    await expect(importFile(file, { hasHeader: true })).rejects.toMatchObject({
      code: "demasiado-grande",
    });
  });

  it("rechaza un tipo de archivo no soportado", async () => {
    const file = new File(["hola"], "documento.pdf", { type: "application/pdf" });
    await expect(importFile(file, { hasHeader: true })).rejects.toMatchObject({
      code: "tipo-no-soportado",
    });
  });
});
