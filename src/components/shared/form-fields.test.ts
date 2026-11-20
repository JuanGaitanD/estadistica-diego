import { describe, expect, it } from "vitest";

import { cleanNumberText } from "./form-fields";

describe("cleanNumberText", () => {
  it("quita letras y símbolos, y deja la coma y los puntos de miles", () => {
    expect(cleanNumberText("20a26")).toBe("2026");
    expect(cleanNumberText("$ 1.234.567,5 COP", "decimal")).toBe("1.234.567,5");
  });

  it("con signo deja un solo «-» y solo al inicio", () => {
    expect(cleanNumberText("-3-,5")).toBe("-3,5");
    expect(cleanNumberText("4-")).toBe("4");
  });

  it("sin signo o entero no aceptan el «-»; entero tampoco coma ni punto", () => {
    expect(cleanNumberText("-12,5", "decimal")).toBe("12,5");
    expect(cleanNumberText("-1.5 años", "integer")).toBe("15");
  });
});
