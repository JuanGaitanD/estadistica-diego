import type { ExportableTable, ReportPdfSpec, ReportSection } from "@/infrastructure/export";
import type { StoredReport, StoredReportItem } from "@/infrastructure/storage";

/** Párrafos de la interpretación de un resultado, en el orden en que se leen. */
function interpretationParagraphs(item: StoredReportItem): string[] {
  const { headline, details, caveats } = item.interpretation;
  return [
    headline,
    ...details,
    ...caveats.map((caveat) => `Ten en cuenta: ${caveat}`),
    ...(item.note.trim() !== "" ? [`Nota: ${item.note.trim()}`] : []),
  ];
}

/**
 * Secciones del PDF de un informe (RF-40): por cada resultado, primero qué
 * significa, luego sus gráficas y tablas; el paso a paso solo si se pidió.
 */
export function reportToPdfSpec(
  report: StoredReport,
  options: { readonly sampleSize: number; readonly generatedAt?: Date },
): ReportPdfSpec {
  const sections: ReportSection[] = [];
  for (const item of report.items) {
    sections.push({ kind: "text", title: item.title, paragraphs: interpretationParagraphs(item) });
    for (const image of item.images) {
      sections.push({ kind: "image", title: image.title, dataUrl: image.dataUrl });
    }
    for (const table of item.tables) {
      sections.push({
        kind: "table",
        title: table.title,
        columns: table.columns,
        rows: table.rows,
      });
    }
    if (report.includeSteps && item.steps.length > 0) {
      for (const step of item.steps) {
        const paragraphs = [
          ...(step.text ? [step.text] : []),
          ...(step.formula ? [step.formula] : []),
          ...(step.excel ? [`En Excel: ${step.excel}`] : []),
        ];
        sections.push({
          kind: "text",
          title: `Cómo se calculó · ${item.title} · ${step.title}`,
          paragraphs,
        });
        if (step.table) {
          sections.push({
            kind: "table",
            title: step.title,
            columns: step.table.columns,
            rows: [...step.table.rows, ...(step.table.footer ? [step.table.footer] : [])],
            ...(step.table.omittedRows
              ? { note: `Se muestran las primeras filas; faltan ${step.table.omittedRows}.` }
              : {}),
          });
        }
      }
    }
  }
  return {
    title: report.title,
    analysisName: report.title,
    generatedAt: options.generatedAt ?? new Date(),
    sampleSize: options.sampleSize,
    sections,
  };
}

const NUMBER_ES = /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/;

/**
 * Celda de Excel: las cifras con formato es-CO («1.234,5», «12,50 %») vuelven
 * a ser números para que se puedan sumar y graficar en la hoja.
 */
export function toCellValue(text: string): string | number {
  const trimmed = text.trim();
  const bare = trimmed.replace(/\s?%$/, "");
  if (!NUMBER_ES.test(bare)) return text;
  return Number(bare.replace(/\./g, "").replace(",", "."));
}

/**
 * Hojas del Excel del informe: una hoja «Qué significa» con la
 * interpretación de cada resultado y una hoja por tabla.
 */
export function reportToXlsxTables(report: StoredReport): ExportableTable[] {
  const summary: ExportableTable = {
    title: "Qué significa",
    columns: ["Resultado", "Interpretación"],
    rows: report.items.map((item) => [item.title, interpretationParagraphs(item).join("\n")]),
  };
  const tables = report.items.flatMap((item) =>
    item.tables.map((table) => ({
      title: table.title,
      columns: table.columns,
      rows: table.rows.map((row) => row.map(toCellValue)),
    })),
  );
  return [summary, ...tables];
}

/** Todo el informe como texto, para pegarlo en un documento o un mensaje. */
export function reportToText(report: StoredReport): string {
  const blocks = report.items.map((item) =>
    [item.title.toUpperCase(), ...interpretationParagraphs(item)].join("\n"),
  );
  return [report.title, ...blocks].join("\n\n");
}
