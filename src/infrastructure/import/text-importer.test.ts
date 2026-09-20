import { describe, expect, it } from "vitest";
import { importPastedText } from "./text-importer";
import { parseCsvText } from "./csv-importer";

describe("importPastedText", () => {
  it("produce un dataset equivalente al de CSV para los mismos datos", () => {
    const raw = "edad,ciudad\n20,Lima\n30,Cusco";
    const fromText = importPastedText(raw, { hasHeader: true });
    const fromCsv = parseCsvText(raw, { hasHeader: true });

    expect(fromText.columns.map((c) => c.variable.name)).toEqual(
      fromCsv.columns.map((c) => c.variable.name),
    );
    expect(fromText.columns.map((c) => c.values)).toEqual(fromCsv.columns.map((c) => c.values));
  });

  it("soporta una sola columna sin encabezado", () => {
    const dataset = importPastedText("1\n2\n3", { hasHeader: false });
    expect(dataset.columns).toHaveLength(1);
    expect(dataset.columns[0]?.values).toEqual([1, 2, 3]);
  });
});
