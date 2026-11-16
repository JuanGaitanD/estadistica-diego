import { describe, expect, it } from "vitest";

import { averageRanks, pearson, spearman } from "./correlation";
import { completePairs, predict, simpleRegression } from "./simple";

// Caso de referencia de la clase (docs/01-requisitos.md §7).
const X = [1, 2, 3, 4, 5];
const Y = [3, 3, 4, 5, 5];

function fit(x: number[], y: number[]) {
  const result = simpleRegression(x, y);
  if (!result.ok) throw new Error(result.reason);
  return result.model;
}

describe("simpleRegression · caso de la §7", () => {
  const m = fit(X, Y);

  it("sumas de las ecuaciones normales", () => {
    expect([m.n, m.sumX, m.sumXX, m.sumY, m.sumXY]).toEqual([5, 15, 55, 20, 66]);
  });

  it("b1 = 0,6 y b0 = 2,2 (20 = 5b0 + 15b1; 66 = 15b0 + 55b1)", () => {
    expect(m.b1).toBeCloseTo(0.6, 12);
    expect(m.b0).toBeCloseTo(2.2, 12);
  });

  it("SCE = 0,4, SCT = 4, SCR = 3,6, R² = 0,9 y r ≈ 0,948683", () => {
    expect(m.sce).toBeCloseTo(0.4, 12);
    expect(m.sct).toBeCloseTo(4, 12);
    expect(m.scr).toBeCloseTo(3.6, 12);
    expect(m.r2).toBeCloseTo(0.9, 12);
    expect(m.r).toBeCloseTo(0.948683298, 9);
  });

  it("tabla de trabajo: Ŷ y residuos", () => {
    expect(m.rows.map((row) => Number(row.fitted.toFixed(10)))).toEqual([2.8, 3.4, 4, 4.6, 5.2]);
    expect(m.rows.map((row) => Number(row.residual.toFixed(10)))).toEqual([
      0.2, -0.4, 0, 0.4, -0.2,
    ]);
  });

  it("errores estándar como ESTIMACION.LINEAL y prueba t de la pendiente", () => {
    expect(m.standardError).toBeCloseTo(Math.sqrt(0.4 / 3), 12);
    expect(m.seB1).toBeCloseTo(0.115470054, 9);
    expect(m.seB0).toBeCloseTo(0.382970843, 9);
    expect(m.tB1).toBeCloseTo(5.196152423, 8);
    expect(m.pB1).toBeCloseTo(0.013846, 5);
    // IC 95 %: b1 ± t(0,975; 3) · ee(b1)
    expect(m.ciB1.lower).toBeCloseTo(0.6 - 3.182446305 * 0.115470054, 8);
  });

  it("predice con intervalo y avisa de extrapolación", () => {
    const inside = predict(m, 3);
    expect(inside.y).toBeCloseTo(4, 12);
    expect(inside.extrapolation).toBe(false);
    expect(inside.interval.upper - inside.y).toBeCloseTo(
      3.182446305 * Math.sqrt(0.4 / 3) * Math.sqrt(1 + 1 / 5),
      8,
    );
    expect(predict(m, 8).extrapolation).toBe(true);
  });

  it("r lleva el signo de la pendiente", () => {
    expect(fit(X, [...Y].reverse()).r).toBeCloseTo(-0.948683298, 9);
  });
});

describe("simpleRegression · casos que no se pueden ajustar", () => {
  it("explica el motivo", () => {
    expect(simpleRegression([1, 2], [3, 4])).toEqual({ ok: false, reason: "pocos-datos" });
    expect(simpleRegression([2, 2, 2], [1, 2, 3])).toEqual({ ok: false, reason: "x-constante" });
  });

  it("descarta las filas incompletas", () => {
    expect(completePairs([1, null, 3, 4], [2, 5, null, 8])).toEqual({
      x: [1, 4],
      y: [2, 8],
      dropped: 2,
    });
  });
});

describe("correlación", () => {
  it("Pearson como COEF.DE.CORREL", () => {
    expect(pearson([3, 2, 4, 5, 6], [9, 7, 12, 15, 17])?.r).toBeCloseTo(0.997054486, 9);
  });

  it("Spearman con empates promediados", () => {
    expect(averageRanks([3, 3, 4, 5, 5])).toEqual([1.5, 1.5, 3, 4.5, 4.5]);
    expect(spearman(X, Y)?.r).toBeCloseTo(0.948683298, 9);
    expect(spearman([1, 2, 3, 4], [1, 8, 27, 64])?.r).toBe(1);
  });

  it("sin variación no hay correlación", () => {
    expect(pearson([1, 2, 3], [4, 4, 4])).toBeNull();
  });
});
