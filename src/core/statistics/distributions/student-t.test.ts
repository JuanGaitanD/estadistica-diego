import { describe, expect, it } from "vitest";

import { lnGamma } from "./special";
import { tCdf, tQuantile, tTwoTailedP } from "./student-t";

describe("lnGamma", () => {
  it("coincide con factoriales y con Γ(1/2) = √π", () => {
    expect(Math.exp(lnGamma(5))).toBeCloseTo(24, 9);
    expect(Math.exp(lnGamma(0.5))).toBeCloseTo(Math.sqrt(Math.PI), 12);
  });
});

describe("t de Student (valores de tablas y de Excel)", () => {
  it("CDF: DISTR.T.N(2; 5; VERDADERO) = 0,949030", () => {
    expect(tCdf(2, 5)).toBeCloseTo(0.9490302605, 9);
    expect(tCdf(-2, 5)).toBeCloseTo(1 - 0.9490302605, 9);
    expect(tCdf(0, 7)).toBeCloseTo(0.5, 12);
  });

  it("cuantiles: INV.T(0,975; gl)", () => {
    expect(tQuantile(0.975, 3)).toBeCloseTo(3.182446305, 8);
    expect(tQuantile(0.975, 10)).toBeCloseTo(2.228138852, 8);
    expect(tQuantile(0.95, 1)).toBeCloseTo(6.313751515, 7);
    expect(tQuantile(0.025, 30)).toBeCloseTo(-2.042272456, 8);
  });

  it("valor p de dos colas es el doble de una cola", () => {
    expect(tTwoTailedP(2, 5)).toBeCloseTo(2 * (1 - 0.9490302605), 9);
  });
});
