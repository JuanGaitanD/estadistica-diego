import { describe, expect, it } from "vitest";

import { locateValue } from "./locate-value";

// Tabla de la §7 (docs/01-requisitos.md): Y = 3, 3, 4, 5, 5; x̄ = 4, s = 1.
const Y = [3, 3, 4, 5, 5];

describe("locateValue", () => {
  it("un valor que está en los datos", () => {
    const located = locateValue(Y, 4);
    expect(located?.interpretation.headline).toBe(
      "4,0 está en el percentil 50: aproximadamente el 50 % de los datos queda por debajo.",
    );
    expect(located?.interpretation.details).toEqual([
      "De 5 datos, 2 son menores y 2 son mayores.",
      "Está 0,00 desviaciones estándar por encima del promedio (z = 0,00): es un valor común, cerca del centro.",
    ]);
    expect(located?.steps[1]?.formula).toBe("p = 2 / (n − 1) = 2 / 4 = 0,5000");
  });

  it("un valor entre dos datos se interpola", () => {
    const located = locateValue(Y, 4.5);
    expect(located?.interpretation.headline).toContain("percentil 63");
    expect(located?.steps[0]?.formula).toBe("z = (x − x̄) / s = (4,5 − 4,00) / 1,00 = 0,500");
    expect(located?.steps[1]?.formula).toBe("p = (2 + (4,5 − 4,0) / (5,0 − 4,0)) / 4 = 0,6250");
  });

  it("fuera de los datos lo dice y califica la rareza", () => {
    const located = locateValue(Y, 7.5);
    expect(located?.interpretation.headline).toBe(
      "7,5 queda por encima de todos los datos (el más alto es 5,0).",
    );
    expect(located?.interpretation.details[1]).toContain("es muy raro");
    expect(located?.steps).toHaveLength(1);
  });

  it("sin variación no se puede ubicar", () => {
    expect(locateValue([2, 2, 2], 2)).toBeNull();
  });
});
