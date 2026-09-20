import { describe, expect, it } from "vitest";
import { parseLocaleNumber } from "./parse-number";

describe("parseLocaleNumber", () => {
  it("interpreta enteros simples", () => {
    expect(parseLocaleNumber("42").value).toBe(42);
    expect(parseLocaleNumber("-7").value).toBe(-7);
  });

  it("interpreta decimales con coma (es) cuando hay 1-2 dígitos tras el separador", () => {
    expect(parseLocaleNumber("1,5").value).toBe(1.5);
    expect(parseLocaleNumber("1,50").value).toBe(1.5);
  });

  it("interpreta decimales con punto (en) cuando hay 1-2 dígitos tras el separador", () => {
    expect(parseLocaleNumber("1.5").value).toBe(1.5);
  });

  it("desambigua correctamente cuando aparecen ambos separadores", () => {
    expect(parseLocaleNumber("1.234,56").value).toBeCloseTo(1234.56, 10);
    expect(parseLocaleNumber("1,234.56").value).toBeCloseTo(1234.56, 10);
  });

  it("marca ambigüedad cuando hay 3 dígitos tras un único separador", () => {
    const result = parseLocaleNumber("1,234");
    expect(result.ambiguous).toBe(true);
    expect(result.value).toBe(1234);
  });

  it("fuerza el formato explícito sin ambigüedad", () => {
    const es = parseLocaleNumber("1,234", "es");
    expect(es.ambiguous).toBe(false);
    expect(es.value).toBeCloseTo(1.234, 10);

    const en = parseLocaleNumber("1,234", "en");
    expect(en.ambiguous).toBe(false);
    expect(en.value).toBe(1234);
  });

  it("devuelve null para cadenas vacías o no numéricas", () => {
    expect(parseLocaleNumber("").value).toBeNull();
    expect(parseLocaleNumber("abc").ambiguous).toBe(false);
  });
});
