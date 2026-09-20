import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/export", () => ({
  exportReportPdf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../use-cases/build-report-spec", () => ({
  buildReportSpec: vi.fn().mockResolvedValue({
    title: "StatLab",
    analysisName: "Análisis",
    generatedAt: new Date(),
    sampleSize: 1,
    sections: [],
  }),
}));

vi.mock("../use-cases/capture-chart-as-data-url", () => ({
  captureChartAsDataUrl: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ExportDialog } from "./export-dialog";
import type { AvailableSection } from "../use-cases/build-report-spec";

function makeSections(): AvailableSection[] {
  return [
    {
      id: "resumen",
      title: "Resumen",
      kind: "text",
      getContent: () => ({ kind: "text", paragraphs: ["x"] }),
    },
    {
      id: "frecuencias",
      title: "Frecuencias",
      kind: "table",
      getContent: () => ({ kind: "table", columns: ["a"], rows: [[1]] }),
    },
  ];
}

describe("ExportDialog", () => {
  it("deshabilita 'Generar PDF' sin selección y lo habilita al marcar una sección", () => {
    render(
      <ExportDialog
        reportTitle="reporte"
        analysisName="Análisis"
        sampleSize={10}
        availableSections={makeSections()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF…" }));

    const generateButton = screen.getByRole("button", { name: "Generar PDF" });
    expect(generateButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Resumen"));
    expect(generateButton).not.toBeDisabled();
  });

  it("'Seleccionar todo' marca todas las casillas y 'Seleccionar nada' las desmarca", () => {
    render(
      <ExportDialog
        reportTitle="reporte"
        analysisName="Análisis"
        sampleSize={10}
        availableSections={makeSections()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF…" }));

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar todo" }));
    expect(screen.getByLabelText("Resumen")).toHaveAttribute("data-state", "checked");
    expect(screen.getByLabelText("Frecuencias")).toHaveAttribute("data-state", "checked");
    expect(screen.getByRole("button", { name: "Generar PDF" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar nada" }));
    expect(screen.getByLabelText("Resumen")).toHaveAttribute("data-state", "unchecked");
    expect(screen.getByLabelText("Frecuencias")).toHaveAttribute("data-state", "unchecked");
    expect(screen.getByRole("button", { name: "Generar PDF" })).toBeDisabled();
  });
});
