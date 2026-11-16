import { describe, expect, it } from "vitest";

import { studentizedRangeCdf, studentizedRangeQuantile } from "./studentized-range";

// Valores críticos q(0,95; k; gl) de las tablas de Tukey (y de qtukey de R).
describe("rango estudentizado", () => {
  it("cuantiles del 95 %", () => {
    expect(studentizedRangeQuantile(0.95, 3, 10)).toBeCloseTo(3.877, 2);
    expect(studentizedRangeQuantile(0.95, 4, 20)).toBeCloseTo(3.958, 2);
    expect(studentizedRangeQuantile(0.95, 5, 30)).toBeCloseTo(4.102, 2);
  });

  it("con k = 2 es √2 veces una t de dos colas", () => {
    // q(0,95; 2; gl) = √2 · t(0,975; gl): con gl = 10, √2 · 2,228139 = 3,151
    expect(studentizedRangeCdf(Math.SQRT2 * 2.228138852, 2, 10)).toBeCloseTo(0.95, 5);
  });
});
