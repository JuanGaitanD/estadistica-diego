import { beforeEach, describe, expect, it } from "vitest";
import { buildDataset } from "@/core/data";
import {
  clearLastDataset,
  loadLastDataset,
  loadPreferences,
  saveLastDataset,
  savePreferences,
} from "./local-storage";

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
