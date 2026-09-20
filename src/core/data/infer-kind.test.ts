import { describe, expect, it } from "vitest";
import { inferVariableKind } from "./infer-kind";

describe("inferVariableKind", () => {
  it("infiere discreta para enteros", () => {
    const result = inferVariableKind([1, 2, 3, 2, 1]);
    expect(result.kind).toBe("discreta");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("infiere continua cuando hay decimales", () => {
    const result = inferVariableKind([1.5, 2, 3.25]);
    expect(result.kind).toBe("continua");
  });

  it("infiere nominal para texto sin orden declarado", () => {
    const result = inferVariableKind(["rojo", "azul", "verde"]);
    expect(result.kind).toBe("nominal");
  });

  it("infiere ordinal cuando se declara un orden y coincide", () => {
    const result = inferVariableKind(["bajo", "medio", "alto"], ["bajo", "medio", "alto"]);
    expect(result.kind).toBe("ordinal");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("infiere nominal con baja confianza para columnas mixtas", () => {
    const result = inferVariableKind([1, "dos", 3]);
    expect(result.kind).toBe("nominal");
    expect(result.confidence).toBeLessThan(0.6);
  });

  it("devuelve nominal de baja confianza cuando no hay datos", () => {
    const result = inferVariableKind([null, null]);
    expect(result.kind).toBe("nominal");
    expect(result.confidence).toBeLessThan(0.5);
  });
});
