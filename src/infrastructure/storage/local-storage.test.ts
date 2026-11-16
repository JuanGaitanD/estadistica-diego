import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDataset } from "@/core/data";
import {
  clearLastDataset,
  loadLastDataset,
  loadPreferences,
  saveLastDataset,
  savePreferences,
  clearReport,
  loadReport,
  saveReport,
} from "./local-storage";
import type { StoredReport } from "./schemas";

beforeEach(() => {
  window.localStorage.clear();
});

describe("saveLastDataset / loadLastDataset", () => {
  it("guarda y recupera un dataset válido", () => {
    const dataset = buildDataset([["1"], ["2"]], { source: "texto", headers: ["n"] });
    saveLastDataset(dataset);
    const loaded = loadLastDataset();
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(dataset.id);
  });

  it("devuelve null cuando no hay nada guardado", () => {
    expect(loadLastDataset()).toBeNull();
  });

  it("descarta contenido corrupto sin lanzar", () => {
    window.localStorage.setItem("statlab:dataset", "{ esto no es json");
    expect(loadLastDataset()).toBeNull();
  });

  it("descarta contenido que no cumple el esquema", () => {
    window.localStorage.setItem(
      "statlab:dataset",
      JSON.stringify({ schemaVersion: 1, payload: { foo: "bar" } }),
    );
    expect(loadLastDataset()).toBeNull();
  });

  it("descarta una versión de esquema distinta", () => {
    const dataset = buildDataset([["1"]], { source: "texto", headers: ["n"] });
    window.localStorage.setItem(
      "statlab:dataset",
      JSON.stringify({ schemaVersion: 999, payload: dataset }),
    );
    expect(loadLastDataset()).toBeNull();
  });

  it("clearLastDataset elimina el valor guardado", () => {
    const dataset = buildDataset([["1"]], { source: "texto", headers: ["n"] });
    saveLastDataset(dataset);
    clearLastDataset();
    expect(loadLastDataset()).toBeNull();
  });
});

describe("savePreferences / loadPreferences", () => {
  it("guarda y recupera preferencias válidas", () => {
    savePreferences({ missingPolicy: "excluir-fila-completa", theme: "dark" });
    const loaded = loadPreferences();
    expect(loaded?.missingPolicy).toBe("excluir-fila-completa");
    expect(loaded?.theme).toBe("dark");
  });

  it("devuelve null si el contenido es inválido", () => {
    window.localStorage.setItem(
      "statlab:preferences",
      JSON.stringify({ schemaVersion: 1, payload: { missingPolicy: "no-existe" } }),
    );
    expect(loadPreferences()).toBeNull();
  });
});

describe("saveReport / loadReport", () => {
  const report: StoredReport = {
    title: "Mi informe",
    includeSteps: false,
    items: [
      {
        id: "1",
        title: "Nota",
        addedAt: "2026-11-16T00:00:00.000Z",
        interpretation: { headline: "El valor típico es 3,7.", details: [], caveats: [] },
        steps: [],
        tables: [{ title: "Frecuencias", columns: ["Valor", "fi"], rows: [["3", "2"]] }],
        images: [{ title: "Barras", dataUrl: "data:image/png;base64,AAAA" }],
        note: "",
      },
    ],
  };

  it("guarda y recupera el informe completo", () => {
    expect(saveReport(report)).toBe("completo");
    expect(loadReport()).toEqual(report);
    clearReport();
    expect(loadReport()).toBeNull();
  });

  it("si no cabe, lo guarda sin imágenes y lo dice", () => {
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (value.includes("data:image")) throw new DOMException("lleno", "QuotaExceededError");
      original.call(this, key, value);
    });
    try {
      expect(saveReport(report)).toBe("sin-imagenes");
      expect(loadReport()?.items[0]?.images).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it("descarta un informe guardado con forma inválida", () => {
    window.localStorage.setItem(
      "statlab:informe",
      JSON.stringify({ schemaVersion: 1, payload: { title: 3 } }),
    );
    expect(loadReport()).toBeNull();
  });
});
