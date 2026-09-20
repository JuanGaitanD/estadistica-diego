import type { ReportPdfSpec, ReportSection } from "@/infrastructure/export";
import type { ExportSelection } from "../model/export-selection";

/**
 * Contrato que debe implementar cada sección disponible del análisis para
 * poder incluirse en un reporte PDF. Ver `src/features/export/README.md`
 * para la documentación completa pensada para quien implemente este
 * contrato desde `src/features/analysis` sin conocer jsPDF.
 */
export interface AvailableSection {
  readonly id: string;
  readonly title: string;
  readonly kind: "table" | "metrics" | "chart" | "text";
  getContent():
    | {
        readonly kind: "table";
        readonly columns: readonly string[];
        readonly rows: readonly (readonly (string | number)[])[];
        readonly note?: string;
      }
    | {
        readonly kind: "metrics";
        readonly items: readonly {
          readonly label: string;
          readonly value: string;
          readonly explanation?: string;
        }[];
      }
    | { readonly kind: "chart"; readonly elementId: string; readonly caption?: string }
    | { readonly kind: "text"; readonly paragraphs: readonly string[] };
}

export interface BuildReportSpecParams {
  readonly title: string;
  readonly analysisName: string;
  readonly sampleSize: number;
  readonly availableSections: readonly AvailableSection[];
  readonly selection: ExportSelection;
  /**
   * Captura un elemento del DOM (identificado por `elementId`) y devuelve su
   * imagen como data URL. Se inyecta para que este caso de uso no dependa
   * directamente del DOM y sea testeable sin `html-to-image`.
   */
  captureChart(elementId: string): Promise<string>;
}

/**
 * Construye el `ReportPdfSpec` listo para pasarle a `buildReportPdf`.
 *
 * Decisión de orden: se recorre `selection.sections` (no `availableSections`)
 * para que el orden final del PDF sea el que la persona usuaria fija en el
 * diálogo de exportación (agrupado por tipo de sección), en vez del orden en
 * que el módulo de análisis registró sus secciones disponibles. Si varias
 * `availableSections` comparten la misma sección lógica (ej. dos tablas de
 * "frecuencias" para variables distintas) se incluyen todas, conservando su
 * orden relativo original entre sí.
 */
export async function buildReportSpec(params: BuildReportSpecParams): Promise<ReportPdfSpec> {
  const { title, analysisName, sampleSize, availableSections, selection, captureChart } = params;

  const includedIds = new Set(selection.sections);
  const wantsCharts = includedIds.has("graficas");

  // Filtra las secciones disponibles cuyo id está en la selección. Se asume
  // que `AvailableSection.id` coincide con uno de los valores de
  // `selection.sections`; las secciones de tipo "chart" solo se incluyen si
  // "graficas" está seleccionado, ya que en el contrato de `ExportSelection`
  // las gráficas son una única entrada de `sections`.
  const matching = availableSections.filter((section) => {
    if (section.kind === "chart") return wantsCharts;
    return includedIds.has(section.id as ExportSelection["sections"][number]);
  });

  // Ordena por la posición de cada sección dentro de `selection.sections`,
  // conservando el orden relativo original para empates (ids que no
  // coinciden literalmente, como las de tipo "chart", van al final del
  // grupo "graficas").
  const orderIndex = (section: AvailableSection): number => {
    if (section.kind === "chart") return selection.sections.indexOf("graficas");
    const index = selection.sections.indexOf(section.id as ExportSelection["sections"][number]);
    return index === -1 ? selection.sections.length : index;
  };

  const ordered = matching
    .map((section, originalIndex) => ({ section, originalIndex }))
    .sort((a, b) => {
      const diff = orderIndex(a.section) - orderIndex(b.section);
      return diff !== 0 ? diff : a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.section);

  const sections: ReportSection[] = [];

  for (const available of ordered) {
    const content = available.getContent();

    if (content.kind === "table") {
      sections.push({
        kind: "table",
        title: available.title,
        columns: content.columns,
        rows: content.rows,
        ...(content.note !== undefined ? { note: content.note } : {}),
      });
      continue;
    }

    if (content.kind === "metrics") {
      sections.push({
        kind: "metrics",
        title: available.title,
        items: content.items.map((item) => ({
          label: item.label,
          value: item.value,
          ...(selection.includeExplanations && item.explanation !== undefined
            ? { explanation: item.explanation }
            : {}),
        })),
      });
      continue;
    }

    if (content.kind === "text") {
      sections.push({ kind: "text", title: available.title, paragraphs: content.paragraphs });
      continue;
    }

    // content.kind === "chart"
    const dataUrl = await captureChart(content.elementId);
    sections.push({
      kind: "image",
      title: available.title,
      dataUrl,
      ...(content.caption !== undefined ? { caption: content.caption } : {}),
    });
  }

  return {
    title,
    analysisName,
    generatedAt: new Date(),
    sampleSize,
    sections,
  };
}
