import { describe, expect, it } from "vitest";

import {
  categoricalColorFor,
  colorIndexFor,
  getCategoricalColor,
  sequentialColor,
} from "@/components/charts/palette";

describe("palette", () => {
  it("getCategoricalColor mapea índices a variables --chart-n cíclicamente", () => {
    expect(getCategoricalColor(0)).toBe("var(--chart-1)");
    expect(getCategoricalColor(7)).toBe("var(--chart-8)");
    expect(getCategoricalColor(8)).toBe("var(--chart-1)");
  });

  it("colorIndexFor es determinista para la misma clave", () => {
    const first = colorIndexFor("Femenino");
    const second = colorIndexFor("Femenino");
    expect(first).toBe(second);
  });

  it("colorIndexFor produce distintos índices para claves distintas (caso general)", () => {
    expect(colorIndexFor("Femenino")).not.toBe(colorIndexFor("Masculino"));
  });

  it("categoricalColorFor es estable sin importar el orden de aparición", () => {
    const colorA = categoricalColorFor("Rojo");
    const colorB = categoricalColorFor("Azul");
    // Se vuelve a pedir en orden inverso: debe dar el mismo resultado por clave.
    expect(categoricalColorFor("Azul")).toBe(colorB);
    expect(categoricalColorFor("Rojo")).toBe(colorA);
  });

  it("sequentialColor mapea 0..1 a los 5 pasos de --heat-n", () => {
    expect(sequentialColor(0)).toBe("var(--heat-1)");
    expect(sequentialColor(1)).toBe("var(--heat-5)");
    expect(sequentialColor(-1)).toBe("var(--heat-1)");
    expect(sequentialColor(2)).toBe("var(--heat-5)");
  });
});
