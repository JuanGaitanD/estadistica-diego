import { describe, expect, it } from "vitest";

import type { StoredReport } from "@/infrastructure/storage";

import { reportToPdfSpec, reportToText, reportToXlsxTables, toCellValue } from "./report-exports";

const report: StoredReport = {
  title: "Notas del curso",
  includeSteps: false,
  items: [
    {
      id: "a",
      title: "Nota",
      addedAt: "2026-11-16T00:00:00.000Z",
      interpretation: {
        headline: "El valor típico es 3,7.",
        details: ["No hay atípicos."],
        caveats: ["Muestra pequeña."],
      },
      steps: [
        {
          title: "2. Promedio",
          formula: "x̄ = 20 / 5 = 4",
          excel: "=PROMEDIO(rango)",
          table: { columns: ["x"], rows: [["3"]], footer: ["Σ"] },
        },
      ],
      tables: [
        { title: "Frecuencias · Nota", columns: ["Valor", "pi"], rows: [["3,5", "12,50 %"]] },
      ],
      images: [{ title: "Barras", dataUrl: "data:image/png;base64,AAAA" }],
      note: "Revisar con el grupo B",
    },
  ],
};

describe("reportToPdfSpec", () => {
  it("pone primero qué significa, luego gráficas y tablas; sin pasos si no se piden", () => {
    const spec = reportToPdfSpec(report, { sampleSize: 24 });
    expect(spec.sections.map((section) => section.kind)).toEqual(["text", "image", "table"]);
    const first = spec.sections[0];
    expect(first?.kind === "text" && first.paragraphs).toEqual([
      "El valor típico es 3,7.",
      "No hay atípicos.",
      "Ten en cuenta: Muestra pequeña.",
      "Nota: Revisar con el grupo B",
    ]);
  });

  it("incluye el paso a paso al final de cada resultado cuando se pide", () => {
    const spec = reportToPdfSpec({ ...report, includeSteps: true }, { sampleSize: 24 });
    expect(spec.sections.map((section) => section.kind)).toEqual([
      "text",
      "image",
      "table",
      "text",
      "table",
    ]);
    const step = spec.sections[3];
    expect(step?.kind === "text" && step.paragraphs).toEqual([
      "x̄ = 20 / 5 = 4",
      "En Excel: =PROMEDIO(rango)",
    ]);
  });
});

describe("Excel y texto", () => {
  it("convierte cifras es-CO en números y deja el texto como está", () => {
    expect(toCellValue("1.234,5")).toBe(1234.5);
    expect(toCellValue("12,50 %")).toBe(12.5);
    expect(toCellValue("-0,25")).toBe(-0.25);
    expect(toCellValue("[2,4, 2,9)")).toBe("[2,4, 2,9)");
    expect(toCellValue("Bogotá")).toBe("Bogotá");
  });

  it("arma una hoja de interpretación y una por tabla", () => {
    const tables = reportToXlsxTables(report);
    expect(tables.map((table) => table.title)).toEqual(["Qué significa", "Frecuencias · Nota"]);
    expect(tables[1]?.rows[0]).toEqual([3.5, 12.5]);
  });

  it("copia el informe como texto", () => {
    expect(reportToText(report)).toContain("NOTA\nEl valor típico es 3,7.");
  });
});
