import { describe, expect, it } from "vitest";
import { importCsvFile, parseCsvText } from "./csv-importer";

describe("parseCsvText", () => {
  it("parsea CSV con comas", () => {
    const dataset = parseCsvText("edad,ciudad\n20,Lima\n30,Cusco", { hasHeader: true });
    expect(dataset.columns.map((c) => c.variable.name)).toEqual(["edad", "ciudad"]);
    expect(dataset.rowCount).toBe(2);
  });

  it("parsea CSV con punto y coma", () => {
    const dataset = parseCsvText("edad;ciudad\n20;Lima\n30;Cusco", { hasHeader: true });
    expect(dataset.columns[0]?.values).toEqual([20, 30]);
  });

  it("elimina el BOM inicial", () => {
    const dataset = parseCsvText("﻿a,b\n1,2", { hasHeader: true });
    expect(dataset.columns[0]?.variable.name).toBe("a");
  });

  it("maneja CRLF", () => {
    const dataset = parseCsvText("a,b\r\n1,2\r\n3,4", { hasHeader: true });
    expect(dataset.rowCount).toBe(2);
  });

  it("maneja filas irregulares rellenando con faltantes", () => {
    const dataset = parseCsvText("a,b\n1\n2,3", { hasHeader: true });
    expect(dataset.columns[1]?.missingCount).toBeGreaterThanOrEqual(1);
  });

  it("produce un dataset vacío para un archivo sin filas de datos", () => {
    const dataset = parseCsvText("a,b\n", { hasHeader: true });
    expect(dataset.rowCount).toBe(0);
  });
});

describe("importCsvFile", () => {
  it("lee un File y usa su nombre como sourceName", async () => {
    const file = new File(["a,b\n1,2"], "datos.csv", { type: "text/csv" });
    const dataset = await importCsvFile(file, { hasHeader: true });
    expect(dataset.sourceName).toBe("datos.csv");
    expect(dataset.source).toBe("csv");
  });
});
