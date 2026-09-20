import { beforeEach, describe, expect, it, vi } from "vitest";

const toBlobMock = vi.fn();
vi.mock("html-to-image", () => ({
  toBlob: (...args: unknown[]) => toBlobMock(...args),
}));

const downloadBlobMock = vi.fn();
vi.mock("../download-blob", () => ({
  downloadBlob: (...args: unknown[]) => downloadBlobMock(...args),
}));

import {
  captureElementAsPng,
  exportAllChartsAsPng,
  exportElementAsPng,
  ExportError,
} from "./image-exporter";

describe("captureElementAsPng", () => {
  beforeEach(() => {
    toBlobMock.mockReset();
    downloadBlobMock.mockReset();
  });

  it("usa pixelRatio 2 y fondo blanco por defecto", async () => {
    const blob = new Blob(["x"]);
    toBlobMock.mockResolvedValue(blob);
    const element = document.createElement("div");

    const result = await captureElementAsPng(element);

    expect(toBlobMock).toHaveBeenCalledWith(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    expect(result).toBe(blob);
  });

  it("permite sobrescribir pixelRatio y backgroundColor", async () => {
    toBlobMock.mockResolvedValue(new Blob(["x"]));
    const element = document.createElement("div");

    await captureElementAsPng(element, { pixelRatio: 3, backgroundColor: "#000000" });

    expect(toBlobMock).toHaveBeenCalledWith(element, {
      pixelRatio: 3,
      backgroundColor: "#000000",
    });
  });

  it("lanza ExportError si la captura falla", async () => {
    toBlobMock.mockRejectedValue(new Error("boom"));
    const element = document.createElement("div");

    await expect(captureElementAsPng(element)).rejects.toBeInstanceOf(ExportError);
  });

  it("lanza ExportError si toBlob resuelve null", async () => {
    toBlobMock.mockResolvedValue(null);
    const element = document.createElement("div");

    await expect(captureElementAsPng(element)).rejects.toMatchObject({
      code: "capture-failed",
    });
  });
});

describe("exportElementAsPng", () => {
  beforeEach(() => {
    toBlobMock.mockReset();
    downloadBlobMock.mockReset();
    document.body.innerHTML = "";
  });

  it("lanza ExportError cuando el elemento no existe", async () => {
    await expect(exportElementAsPng("no-existe", "grafica.png")).rejects.toMatchObject({
      code: "element-not-found",
    });
  });

  it("captura y descarga el elemento encontrado", async () => {
    const div = document.createElement("div");
    div.id = "grafica-1";
    document.body.appendChild(div);
    const blob = new Blob(["x"]);
    toBlobMock.mockResolvedValue(blob);

    await exportElementAsPng("grafica-1", "grafica.png");

    expect(downloadBlobMock).toHaveBeenCalledWith(blob, "grafica.png");
  });
});

describe("exportAllChartsAsPng", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toBlobMock.mockReset();
    downloadBlobMock.mockReset();
    document.body.innerHTML = "";
    toBlobMock.mockResolvedValue(new Blob(["x"]));
    for (const id of ["g1", "g2", "g3"]) {
      const div = document.createElement("div");
      div.id = id;
      document.body.appendChild(div);
    }
  });

  it("descarga una PNG por cada id, con nombres saneados y en orden", async () => {
    const promise = exportAllChartsAsPng(["g1", "g2", "g3"], "reporte:final");
    await vi.runAllTimersAsync();
    await promise;

    expect(downloadBlobMock).toHaveBeenCalledTimes(3);
    expect(downloadBlobMock).toHaveBeenNthCalledWith(1, expect.anything(), "reporte-final-1.png");
    expect(downloadBlobMock).toHaveBeenNthCalledWith(2, expect.anything(), "reporte-final-2.png");
    expect(downloadBlobMock).toHaveBeenNthCalledWith(3, expect.anything(), "reporte-final-3.png");
  });
});
