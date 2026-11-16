import { describe, expect, it } from "vitest";

import {
  chiSquareCdf,
  chiSquareQuantile,
  fCdf,
  fQuantile,
  normalCdf,
  normalPdf,
  normalQuantile,
  standardNormalCdf,
  standardNormalQuantile,
} from "./continuous";
import { binomialCdf, binomialPmf, poissonCdf, poissonPmf } from "./discrete";

// Valores de referencia de R (pnorm, qnorm, pchisq, qchisq, pf, qf, dbinom, ppois) y Excel.
describe("normal", () => {
  it("Φ y su inversa", () => {
    expect(standardNormalCdf(1.96)).toBeCloseTo(0.9750021048517795, 12);
    expect(standardNormalCdf(-1)).toBeCloseTo(0.15865525393145707, 12);
    expect(standardNormalQuantile(0.975)).toBeCloseTo(1.959963984540054, 10);
    expect(standardNormalQuantile(0.001)).toBeCloseTo(-3.090232306167813, 9);
  });

  it("con media y desviación: el ejemplo del plan (3,0 con μ = 3,74 y σ = 0,73)", () => {
    expect(normalCdf(3, 3.74, 0.73)).toBeCloseTo(0.15535, 4);
    expect(normalQuantile(0.5, 3.74, 0.73)).toBeCloseTo(3.74, 10);
    expect(normalPdf(0)).toBeCloseTo(0.3989422804014327, 12);
  });
});

describe("chi-cuadrado y F", () => {
  it("CDF y cuantiles", () => {
    expect(chiSquareCdf(3.84145882069412, 1)).toBeCloseTo(0.95, 9);
    expect(chiSquareQuantile(0.95, 4)).toBeCloseTo(9.487729036781154, 8);
    expect(chiSquareCdf(10, 10)).toBeCloseTo(0.5595067149347875, 10);
    // Con gl1 = 2 la CDF tiene forma cerrada: 1 − (1 + 2x/gl2)^(−gl2/2).
    expect(fCdf(3.4781, 2, 9)).toBeCloseTo(1 - (1 + (2 * 3.4781) / 9) ** -4.5, 12);
    expect(fQuantile(0.95, 3, 20)).toBeCloseTo(3.098391212, 7);
  });
});

describe("binomial y Poisson", () => {
  it("probabilidades puntuales y acumuladas", () => {
    expect(binomialPmf(6, 10, 0.5)).toBeCloseTo(0.205078125, 12);
    expect(binomialCdf(6, 10, 0.5)).toBeCloseTo(0.828125, 12);
    expect(poissonPmf(2, 3)).toBeCloseTo(0.22404180765538775, 12);
    expect(poissonCdf(2, 3)).toBeCloseTo(0.42319008112684353, 12);
  });
});
