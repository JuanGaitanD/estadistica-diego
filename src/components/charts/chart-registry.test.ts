import { describe, expect, it } from "vitest";

import { appliesTo } from "./chart-registry";

describe("appliesTo", () => {
  it("pie aplica a nominal y ordinal, no a discreta/continua", () => {
    expect(appliesTo("pie", "nominal", false).ok).toBe(true);
    expect(appliesTo("pie", "ordinal", false).ok).toBe(true);
    expect(appliesTo("pie", "discreta", false)).toEqual({
      ok: false,
      reason: "El gráfico circular aplica a variables cualitativas (nominales u ordinales).",
    });
    expect(appliesTo("pie", "continua", true).ok).toBe(false);
  });

  it("bar aplica siempre, salvo continua sin agrupar", () => {
    expect(appliesTo("bar", "nominal", false).ok).toBe(true);
    expect(appliesTo("bar", "discreta", false).ok).toBe(true);
    expect(appliesTo("bar", "continua", true).ok).toBe(true);
    const result = appliesTo("bar", "continua", false);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/agruparse/);
  });

  it("polygon requiere discreta/continua agrupada, no nominal/ordinal", () => {
    expect(appliesTo("polygon", "nominal", true).ok).toBe(false);
    expect(appliesTo("polygon", "ordinal", true).ok).toBe(false);
    expect(appliesTo("polygon", "discreta", false).ok).toBe(false);
    expect(appliesTo("polygon", "discreta", true).ok).toBe(true);
    expect(appliesTo("polygon", "continua", true).ok).toBe(true);
  });

  it("ogive requiere agrupamiento y no aplica a nominal", () => {
    expect(appliesTo("ogive", "nominal", true).ok).toBe(false);
    expect(appliesTo("ogive", "ordinal", false).ok).toBe(false);
    expect(appliesTo("ogive", "ordinal", true).ok).toBe(true);
    expect(appliesTo("ogive", "discreta", true).ok).toBe(true);
    expect(appliesTo("ogive", "continua", true).ok).toBe(true);
  });
});
