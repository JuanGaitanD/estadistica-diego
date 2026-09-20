import { describe, expect, it } from "vitest";
import { buildReportPdf, buildReportPdfDocument } from "./pdf-builder";
import type { ReportPdfSpec, ReportSection } from "./pdf-types";

// PNG 1x1 transparente válido en base64, usado para probar secciones de
// imagen sin depender de `HTMLCanvasElement`/`Image` reales en jsdom (jsPDF
// solo necesita leer el header PNG para calcular ancho/alto, lo cual
// funciona en Node/jsdom sin necesitar el paquete `canvas`).
const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const baseSpec: ReportPdfSpec = {
  title: "StatLab",
  analysisName: "Análisis de ingresos",
  generatedAt: new Date("2026-01-15T10:00:00Z"),
  sampleSize: 42,
  sections: [],
};

describe("buildReportPdfDocument", () => {
  it("genera al menos la portada", () => {
    const doc = buildReportPdfDocument(baseSpec);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("incluye acentos y ñ en la portada sin lanzar errores", () => {
    const spec: ReportPdfSpec = {
      ...baseSpec,
      analysisName: "Distribución de tamaño según año — ¿cuántos?",
    };
    expect(() => buildReportPdfDocument(spec)).not.toThrow();
  });

  it("dibuja una sección de tipo texto", () => {
    const sections: ReportSection[] = [
      {
        kind: "text",
        title: "Resumen",
        paragraphs: ["Párrafo de prueba con ñ y acentos: á é í ó ú."],
      },
    ];
    const doc = buildReportPdfDocument({ ...baseSpec, sections });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it("dibuja una sección de métricas, respetando explanation ausente", () => {
    const sections: ReportSection[] = [
      {
        kind: "metrics",
        title: "Tendencia central",
        items: [
          { label: "Media", value: "10.5", explanation: "Promedio aritmético." },
          { label: "Mediana", value: "9" },
        ],
      },
    ];
    expect(() => buildReportPdfDocument({ ...baseSpec, sections })).not.toThrow();
  });

  it("pagina correctamente una tabla con muchas filas", () => {
    const rows: (readonly (string | number)[])[] = Array.from({ length: 120 }, (_, i) => [
      i + 1,
      `valor-${i + 1}`,
    ]);
    const sections: ReportSection[] = [
      { kind: "table", title: "Frecuencias", columns: ["n", "valor"], rows, note: "n = 120" },
    ];
    const doc = buildReportPdfDocument({ ...baseSpec, sections });
    // Con márgenes de 15mm en A4 y filas de 6mm caben ~44 filas por página;
    // 120 filas deberían forzar varias páginas adicionales a la portada.
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
  });

  it("dibuja una sección de imagen ajustada al ancho útil", () => {
    const sections: ReportSection[] = [
      { kind: "image", title: "Gráfica", dataUrl: TINY_PNG_DATA_URL, caption: "Figura 1" },
    ];
    expect(() => buildReportPdfDocument({ ...baseSpec, sections })).not.toThrow();
  });

  it("agrega múltiples secciones en el orden dado", () => {
    const sections: ReportSection[] = [
      { kind: "text", title: "Uno", paragraphs: ["a"] },
      { kind: "metrics", title: "Dos", items: [{ label: "x", value: "1" }] },
      { kind: "image", title: "Tres", dataUrl: TINY_PNG_DATA_URL },
    ];
    expect(() => buildReportPdfDocument({ ...baseSpec, sections })).not.toThrow();
  });
});

describe("buildReportPdf", () => {
  it("produce un Blob con tamaño mayor a cero", async () => {
    const blob = await buildReportPdf({
      ...baseSpec,
      sections: [{ kind: "text", title: "Resumen", paragraphs: ["Contenido de prueba."] }],
    });
    expect(blob.size).toBeGreaterThan(0);
  });
});
