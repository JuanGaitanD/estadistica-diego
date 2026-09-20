import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("combina clases y descarta valores falsy", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("resuelve conflictos de utilidades de Tailwind (gana la última)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
