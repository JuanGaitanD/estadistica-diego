import { describe, expect, it } from "vitest";
import { datasetToCsvText, exportDatasetToCsv } from "./csv-exporter";
import { buildDataset } from "@/core/data";

describe("datasetToCsvText", () => {
  it("escapa comas, comillas y saltos de línea", () => {
    const dataset = buildDataset([["Lima, capital"], ['dijo "hola"'], ["línea1\nlínea2"]], {
      source: "texto",
      headers: ["nota"],
    });
    const csv = datasetToCsvText(dataset);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"Lima, capital"');
    expect(lines[2]).toBe('"dijo ""hola"""');
    expect(lines[3]).toBe('"línea1\nlínea2"');
  });

  it("permite separador configurable", () => {
    const dataset = buildDataset([["1", "2"]], { source: "texto", headers: ["a", "b"] });
    const csv = datasetToCsvText(dataset, { separator: ";" });
    expect(csv.split("\r\n")[0]).toBe("a;b");
  });

  it("representa faltantes como celda vacía", () => {
    const dataset = buildDataset([[""]], { source: "texto", headers: ["a"] });
    const csv = datasetToCsvText(dataset);
    expect(csv.split("\r\n")[1]).toBe("");
  });

  it("neutraliza celdas que una hoja de cálculo interpretaría como fórmula", () => {
    const dataset = buildDataset(
      [['=HYPERLINK("http://x")'], ["+cmd"], ["@SUM(A1)"], ["-3,5"], ["-abc"]],
      { source: "texto", headers: ["=titulo"] },
    );
    const lines = datasetToCsvText(dataset).split("\r\n");
    expect(lines[0]).toBe("'=titulo");
    expect(lines[1]).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(lines[2]).toBe("'+cmd");
    expect(lines[3]).toBe("'@SUM(A1)");
    // El dataset ya normalizó el número; lo importante es que no lleve apóstrofo.
    expect(lines[4]).toBe("-3.5");
    expect(lines[5]).toBe("'-abc");
  });
});

describe("exportDatasetToCsv", () => {
  it("genera un Blob de texto CSV con BOM por defecto", async () => {
    const dataset = buildDataset([["1"]], { source: "texto", headers: ["a"] });
    const blob = exportDatasetToCsv(dataset);
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer).slice(0, 3);
    expect(Array.from(bytes)).toEqual([0xef, 0xbb, 0xbf]);
    expect(blob.type).toContain("text/csv");
  });

  it("permite desactivar el BOM", async () => {
    const dataset = buildDataset([["1"]], { source: "texto", headers: ["a"] });
    const blob = exportDatasetToCsv(dataset, { withBom: false });
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer).slice(0, 3);
    expect(Array.from(bytes)).not.toEqual([0xef, 0xbb, 0xbf]);
  });
});
