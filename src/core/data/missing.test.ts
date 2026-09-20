import { describe, expect, it } from "vitest";
import { DEFAULT_MISSING_CONFIG, isMissingToken } from "./missing";

describe("isMissingToken", () => {
  it("trata la cadena vacía como faltante", () => {
    expect(isMissingToken("", DEFAULT_MISSING_CONFIG)).toBe(true);
    expect(isMissingToken("   ", DEFAULT_MISSING_CONFIG)).toBe(true);
  });

  it.each(["NA", "N/A", "null", "-", "#N/A", "na", "Null"])(
    "reconoce el token %s como faltante",
    (token) => {
      expect(isMissingToken(token, DEFAULT_MISSING_CONFIG)).toBe(true);
    },
  );

  it("no marca valores válidos como faltantes", () => {
    expect(isMissingToken("42", DEFAULT_MISSING_CONFIG)).toBe(false);
    expect(isMissingToken("Lima", DEFAULT_MISSING_CONFIG)).toBe(false);
  });

  it("respeta la sensibilidad a mayúsculas cuando se configura", () => {
    const config = { tokens: ["NA"], caseSensitive: true };
    expect(isMissingToken("NA", config)).toBe(true);
    expect(isMissingToken("na", config)).toBe(false);
  });
});
