import { describe, expect, it, vi } from "vitest";
import { buildReportSpec, type AvailableSection } from "./build-report-spec";
import type { ExportSelection } from "../model/export-selection";

function makeSection(
  id: string,
  title: string,
  kind: AvailableSection["kind"],
  content: ReturnType<AvailableSection["getContent"]>,
): AvailableSection {
  return { id, title, kind, getContent: () => content };
}

const baseSelection: ExportSelection = {
  format: "pdf",
  includeRawData: false,
  includeExplanations: true,
  variableIds: [],
  sections: [],
  chartIds: [],
};

describe("buildReportSpec", () => {
  it("filtra por las secciones seleccionadas", async () => {
    const sections: AvailableSection[] = [
      makeSection("resumen", "Resumen", "text", { kind: "text", paragraphs: ["hola"] }),
      makeSection("frecuencias", "Frecuencias", "table", {
        kind: "table",
        columns: ["valor"],
        rows: [[1]],
      }),
    ];

    const spec = await buildReportSpec({
      title: "StatLab",
      analysisName: "Análisis",
      sampleSize: 10,
      availableSections: sections,
      selection: { ...baseSelection, sections: ["resumen"] },
      captureChart: vi.fn(),
    });

    expect(spec.sections).toHaveLength(1);
    expect(spec.sections[0]).toMatchObject({ kind: "text", title: "Resumen" });
  });

  it("respeta el orden pedido en selection.sections, no el de availableSections", async () => {
    const sections: AvailableSection[] = [
      makeSection("variabilidad", "Variabilidad", "metrics", {
        kind: "metrics",
        items: [{ label: "DE", value: "2" }],
      }),
      makeSection("resumen", "Resumen", "text", { kind: "text", paragraphs: ["hola"] }),
    ];

    const spec = await buildReportSpec({
      title: "StatLab",
      analysisName: "Análisis",
      sampleSize: 10,
      availableSections: sections,
      selection: { ...baseSelection, sections: ["resumen", "variabilidad"] },
      captureChart: vi.fn(),
    });

    expect(spec.sections.map((s) => s.title)).toEqual(["Resumen", "Variabilidad"]);
  });

  it("omite explanation cuando includeExplanations es false", async () => {
    const sections: AvailableSection[] = [
      makeSection("tendencia-central", "Tendencia central", "metrics", {
        kind: "metrics",
        items: [{ label: "Media", value: "5", explanation: "Promedio" }],
      }),
    ];

    const spec = await buildReportSpec({
      title: "StatLab",
      analysisName: "Análisis",
      sampleSize: 10,
      availableSections: sections,
      selection: { ...baseSelection, sections: ["tendencia-central"], includeExplanations: false },
      captureChart: vi.fn(),
    });

    const section = spec.sections[0];
    expect(section?.kind).toBe("metrics");
    if (section?.kind === "metrics") {
      expect(section.items[0]).toEqual({ label: "Media", value: "5" });
    }
  });

  it("solo incluye secciones chart si 'graficas' está seleccionada, capturando con captureChart", async () => {
    const captureChart = vi.fn().mockResolvedValue("data:image/png;base64,xxx");
    const sections: AvailableSection[] = [
      makeSection("graficas", "Gráfica 1", "chart", {
        kind: "chart",
        elementId: "chart-1",
        caption: "Figura 1",
      }),
    ];

    const withoutCharts = await buildReportSpec({
      title: "StatLab",
      analysisName: "Análisis",
      sampleSize: 10,
      availableSections: sections,
      selection: { ...baseSelection, sections: [] },
      captureChart,
    });
    expect(withoutCharts.sections).toHaveLength(0);
    expect(captureChart).not.toHaveBeenCalled();

    const withCharts = await buildReportSpec({
      title: "StatLab",
      analysisName: "Análisis",
      sampleSize: 10,
      availableSections: sections,
      selection: { ...baseSelection, sections: ["graficas"] },
      captureChart,
    });
    expect(withCharts.sections).toHaveLength(1);
    expect(captureChart).toHaveBeenCalledWith("chart-1");
    expect(withCharts.sections[0]).toMatchObject({
      kind: "image",
      dataUrl: "data:image/png;base64,xxx",
      caption: "Figura 1",
    });
  });
});
