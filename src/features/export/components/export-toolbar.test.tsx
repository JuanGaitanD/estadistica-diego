import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exportDatasetToCsv: vi.fn(() => new Blob(["a"], { type: "text/csv" })),
  exportDatasetToXlsx: vi.fn(() => new Blob(["b"])),
  downloadBlob: vi.fn(),
}));

vi.mock("@/infrastructure/export", () => ({
  downloadBlob: mocks.downloadBlob,
  exportAllChartsAsPng: vi.fn().mockResolvedValue(undefined),
  exportDatasetToCsv: mocks.exportDatasetToCsv,
  exportDatasetToXlsx: mocks.exportDatasetToXlsx,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("./export-dialog", () => ({ ExportDialog: () => <div /> }));

import { buildDataset } from "@/core/data";

import { ExportToolbar } from "./export-toolbar";

describe("ExportToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deshabilita la exportación de datos cuando todavía no hay dataset", () => {
    render(
      <ExportToolbar
        dataset={undefined}
        availableSections={[]}
        chartElementIds={[]}
        reportTitle="prueba"
      />,
    );
    expect(screen.getByRole("button", { name: /CSV/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Excel/ })).toBeDisabled();
  });

  it("exporta CSV y Excel con el dataset, sin conversiones de tipo", async () => {
    const dataset = buildDataset([[1], [2]], { source: "texto", headers: ["Edad"] });
    render(
      <ExportToolbar
        dataset={dataset}
        availableSections={[]}
        chartElementIds={[]}
        reportTitle="prueba"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /CSV/ }));
    expect(mocks.exportDatasetToCsv).toHaveBeenCalledWith(dataset);
    expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "prueba.csv");

    await userEvent.click(screen.getByRole("button", { name: /Excel/ }));
    expect(mocks.exportDatasetToXlsx).toHaveBeenCalledWith(dataset);
    expect(mocks.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "prueba.xlsx");
  });

  it("deshabilita la descarga de gráficas cuando no hay ninguna", () => {
    render(
      <ExportToolbar
        dataset={undefined}
        availableSections={[]}
        chartElementIds={[]}
        reportTitle="prueba"
      />,
    );
    expect(screen.getByRole("button", { name: /Descargar gráficas/ })).toBeDisabled();
  });
});
