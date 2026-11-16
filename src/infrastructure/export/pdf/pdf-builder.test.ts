import { crc32, deflateSync } from "node:zlib";
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

/** PNG RGBA de `size`×`size` en blanco, armado a mano (jsdom no tiene canvas). */
function solidPngDataUrl(size: number): string {
  const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 4, 255)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

describe("peso del PDF (RF-56)", () => {
  it("comprime las imágenes: una gráfica de 600×600 px no ocupa sus píxeles crudos", () => {
    const doc = buildReportPdfDocument({
      ...baseSpec,
      sections: [{ kind: "image", title: "Gráfica", dataUrl: solidPngDataUrl(600) }],
    });
    // Crudo serían 600·600·4 = 1,44 MB; comprimido queda en unos pocos KB.
    expect(doc.output().length).toBeLessThan(100_000);
  });
});
