import { jsPDF } from "jspdf";
import { downloadBlob } from "../download-blob";
import type { ReportPdfSpec, ReportSection } from "./pdf-types";

// Nota sobre acentos y ñ: jsPDF usa por defecto la fuente "helvetica" (una
// fuente estándar de PDF codificada en WinAnsiEncoding). Los caracteres
// á é í ó ú ñ Ñ ¿ ¡ existen en WinAnsi, así que basta con escribirlos tal
// cual como strings JS (UTF-16) — jsPDF los mapea automáticamente. Si en el
// futuro se necesitan caracteres fuera de WinAnsi (otros alfabetos, emoji),
// habría que incrustar una fuente TrueType propia en base64 con
// `doc.addFont(...)` en vez de depender de las fuentes estándar.

const PAGE_FORMAT = "a4";
const MARGIN_MM = 15;

interface Cursor {
  y: number;
}

function pageWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth();
}

function pageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

function usableWidth(doc: jsPDF): number {
  return pageWidth(doc) - MARGIN_MM * 2;
}

function ensureSpace(doc: jsPDF, cursor: Cursor, neededMm: number): void {
  const bottomLimit = pageHeight(doc) - MARGIN_MM;
  if (cursor.y + neededMm > bottomLimit) {
    doc.addPage();
    cursor.y = MARGIN_MM;
  }
}

function formatDateEs(date: Date): string {
  return new Intl.DateTimeFormat("es-419", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function drawTitle(doc: jsPDF, cursor: Cursor, title: string): void {
  ensureSpace(doc, cursor, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, MARGIN_MM, cursor.y);
  cursor.y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
}

function drawCoverPage(doc: jsPDF, spec: ReportPdfSpec): void {
  const width = pageWidth(doc);
  let y = 60;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(spec.title, width / 2, y, { align: "center" });

  y += 16;
  doc.setFontSize(16);
  doc.text(spec.analysisName, width / 2, y, { align: "center" });

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Generado el ${formatDateEs(spec.generatedAt)}`, width / 2, y, { align: "center" });

  y += 8;
  doc.text(`n = ${spec.sampleSize} datos`, width / 2, y, { align: "center" });
}

function drawTextSection(
  doc: jsPDF,
  cursor: Cursor,
  section: Extract<ReportSection, { kind: "text" }>,
): void {
  drawTitle(doc, cursor, section.title);
  const width = usableWidth(doc);

  for (const paragraph of section.paragraphs) {
    const lines: string[] = doc.splitTextToSize(paragraph, width);
    for (const line of lines) {
      ensureSpace(doc, cursor, 6);
      doc.text(line, MARGIN_MM, cursor.y);
      cursor.y += 5.5;
    }
    cursor.y += 2;
  }
  cursor.y += 4;
}

function drawMetricsSection(
  doc: jsPDF,
  cursor: Cursor,
  section: Extract<ReportSection, { kind: "metrics" }>,
): void {
  drawTitle(doc, cursor, section.title);
  const width = usableWidth(doc);

  for (const item of section.items) {
    ensureSpace(doc, cursor, 6);
    doc.setFont("helvetica", "bold");
    doc.text(`${item.label}:`, MARGIN_MM, cursor.y);
    const labelWidth = doc.getTextWidth(`${item.label}: `);
    doc.setFont("helvetica", "normal");
    doc.text(item.value, MARGIN_MM + labelWidth, cursor.y);
    cursor.y += 5.5;

    if (item.explanation) {
      const lines: string[] = doc.splitTextToSize(item.explanation, width - 4);
      for (const line of lines) {
        ensureSpace(doc, cursor, 5);
        doc.setFontSize(9);
        doc.text(line, MARGIN_MM + 4, cursor.y);
        doc.setFontSize(10);
        cursor.y += 4.5;
      }
    }
  }
  cursor.y += 4;
}

/** Tabla simple dibujada con `doc.text`/`doc.line`, sin jspdf-autotable. */
function drawTableSection(
  doc: jsPDF,
  cursor: Cursor,
  section: Extract<ReportSection, { kind: "table" }>,
): void {
  drawTitle(doc, cursor, section.title);
  const width = usableWidth(doc);
  const columnCount = section.columns.length || 1;
  const columnWidth = width / columnCount;
  const rowHeight = 6;

  const drawHeader = (): void => {
    ensureSpace(doc, cursor, rowHeight + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    section.columns.forEach((column, index) => {
      doc.text(column, MARGIN_MM + index * columnWidth, cursor.y);
    });
    cursor.y += 2;
    doc.line(MARGIN_MM, cursor.y, MARGIN_MM + width, cursor.y);
    cursor.y += 4;
    doc.setFont("helvetica", "normal");
  };

  drawHeader();

  for (const row of section.rows) {
    if (cursor.y + rowHeight > pageHeight(doc) - MARGIN_MM) {
      doc.addPage();
      cursor.y = MARGIN_MM;
      drawHeader();
    }
    row.forEach((cell, index) => {
      doc.text(String(cell), MARGIN_MM + index * columnWidth, cursor.y);
    });
    cursor.y += rowHeight;
  }

  if (section.note) {
    ensureSpace(doc, cursor, 6);
    doc.setFontSize(8);
    doc.text(section.note, MARGIN_MM, cursor.y);
    doc.setFontSize(10);
    cursor.y += 5;
  }

  doc.setFontSize(10);
  cursor.y += 4;
}

function drawImageSection(
  doc: jsPDF,
  cursor: Cursor,
  section: Extract<ReportSection, { kind: "image" }>,
): void {
  drawTitle(doc, cursor, section.title);
  const width = usableWidth(doc);

  const format = section.dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
  const properties = doc.getImageProperties(section.dataUrl);
  const imageWidth = width;
  const imageHeight = (properties.height / properties.width) * imageWidth;

  ensureSpace(doc, cursor, imageHeight);
  doc.addImage(section.dataUrl, format, MARGIN_MM, cursor.y, imageWidth, imageHeight);
  cursor.y += imageHeight + 4;

  if (section.caption) {
    ensureSpace(doc, cursor, 6);
    doc.setFontSize(9);
    doc.text(section.caption, MARGIN_MM, cursor.y);
    doc.setFontSize(10);
    cursor.y += 5;
  }

  cursor.y += 4;
}

function drawSection(doc: jsPDF, cursor: Cursor, section: ReportSection): void {
  switch (section.kind) {
    case "text":
      drawTextSection(doc, cursor, section);
      return;
    case "metrics":
      drawMetricsSection(doc, cursor, section);
      return;
    case "table":
      drawTableSection(doc, cursor, section);
      return;
    case "image":
      drawImageSection(doc, cursor, section);
      return;
  }
}

function drawFooters(doc: jsPDF, generatedAt: Date): void {
  const pageCount = doc.getNumberOfPages();
  const width = pageWidth(doc);
  const height = pageHeight(doc);

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${page} de ${pageCount}`, width - MARGIN_MM, height - 8, { align: "right" });
    doc.text(formatDateEs(generatedAt), MARGIN_MM, height - 8);
  }
}

/**
 * Construye el documento jsPDF completo (portada + secciones + pies de
 * página) sin convertirlo a `Blob`, para poder inspeccionarlo en tests
 * (ej. `doc.getNumberOfPages()`).
 */
export function buildReportPdfDocument(spec: ReportPdfSpec): jsPDF {
  const doc = new jsPDF({ format: PAGE_FORMAT, unit: "mm" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  drawCoverPage(doc, spec);

  if (spec.sections.length > 0) {
    doc.addPage();
  }

  const cursor: Cursor = { y: MARGIN_MM };
  spec.sections.forEach((section, index) => {
    if (index > 0) {
      cursor.y += 2;
    }
    drawSection(doc, cursor, section);
  });

  drawFooters(doc, spec.generatedAt);

  return doc;
}

/** Genera el reporte PDF completo como `Blob`, listo para descargar. */
export async function buildReportPdf(spec: ReportPdfSpec): Promise<Blob> {
  const doc = buildReportPdfDocument(spec);
  return doc.output("blob");
}

/** Genera el reporte PDF y dispara su descarga con el nombre indicado. */
export async function exportReportPdf(spec: ReportPdfSpec, filename: string): Promise<void> {
  const blob = await buildReportPdf(spec);
  downloadBlob(blob, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
