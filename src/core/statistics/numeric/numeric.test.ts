import { describe, expect, it } from "vitest";
import { ascending, epsEq, sortAscending } from "./compare";
import { neumaierSum, rawMean } from "./sum";
import { welford } from "./welford";
import { quantile } from "./quantile";
import { checkSample, finiteOrNull, isFiniteNumber, REASONS } from "./validate";

describe("neumaierSum", () => {
  it("suma un conjunto vacío como 0", () => {
    expect(neumaierSum([])).toBe(0);
  });

  it("compensa la pérdida de precisión de la suma ingenua", () => {
    expect(neumaierSum([1, 1e100, 1, -1e100])).toBe(2);
  });

  it("suma valores con magnitudes similares", () => {
    expect(neumaierSum([1, 2, 3, 4])).toBe(10);
  });

  it("compensa cuando el sumando es mayor que el acumulado", () => {
    expect(neumaierSum([1e-16, 1])).toBeCloseTo(1, 15);
  });
});

describe("rawMean", () => {
  it("devuelve null sin datos", () => {
    expect(rawMean([])).toBeNull();
  });

  it("es exacta en el caso de cancelación", () => {
    expect(rawMean([1e9 + 1, 1e9 + 2, 1e9 + 3])).toBeCloseTo(1000000002, 10);
  });
});

describe("comparadores", () => {
  it("ordena numéricamente, no como texto", () => {
    expect(sortAscending([10, 9, 100, 1])).toEqual([1, 9, 10, 100]);
  });

  it("ascending devuelve la diferencia", () => {
    expect(ascending(3, 1)).toBe(2);
  });

  it("epsEq compara con tolerancia relativa", () => {
    expect(epsEq(0.1 + 0.2, 0.3)).toBe(true);
    expect(epsEq(1, 1)).toBe(true);
    expect(epsEq(1, 1.5)).toBe(false);
    expect(epsEq(1, 1.0001, 1e-2)).toBe(true);
  });
});

describe("welford", () => {
  it("devuelve null sin datos", () => {
    expect(welford([])).toBeNull();
  });

  it("acumula media y M2 de un conjunto conocido", () => {
    const accumulator = welford([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(accumulator?.n).toBe(8);
    expect(accumulator?.mean).toBeCloseTo(5, 10);
    expect(accumulator?.m2).toBeCloseTo(32, 10);
  });
});

describe("validaciones", () => {
  it("reconoce números finitos", () => {
    expect(isFiniteNumber(1)).toBe(true);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteNumber("1")).toBe(false);
  });

  it("rechaza NaN en la entrada", () => {
    const check = checkSample([1, Number.NaN]);
    expect(check).toEqual({ ok: false, reason: REASONS.noNumerico });
  });

  it("rechaza una muestra vacía", () => {
    expect(checkSample([])).toEqual({ ok: false, reason: REASONS.sinDatos });
  });

  it("exige el tamaño mínimo pedido", () => {
    expect(checkSample([1], 2)).toEqual({ ok: false, reason: REASONS.minimoDos });
    expect(checkSample([1, 2], 2)).toEqual({ ok: true });
  });

  it("degrada a null los valores no finitos", () => {
    expect(finiteOrNull(Number.NaN)).toBeNull();
    expect(finiteOrNull(3)).toBe(3);
  });
});

describe("quantile", () => {
  // Ejemplo clásico (Wikipedia / Excel): n = 11.
  const sample = [6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49];

  it("R-7 reproduce CUARTIL.INC de Excel", () => {
    expect(quantile(sample, 0.25)).toBeCloseTo(25.5, 10);
    expect(quantile(sample, 0.5)).toBeCloseTo(40, 10);
    expect(quantile(sample, 0.75)).toBeCloseTo(42.5, 10);
  });

  it("R-6 reproduce CUARTIL.EXC de Excel", () => {
    expect(quantile(sample, 0.25, "exclusivo")).toBeCloseTo(15, 10);
    expect(quantile(sample, 0.75, "exclusivo")).toBeCloseTo(43, 10);
  });

  it("devuelve los extremos con p = 0 y p = 1", () => {
    expect(quantile(sample, 0)).toBe(6);
    expect(quantile(sample, 1)).toBe(49);
  });

  it("R-6 no está definido fuera de [1/(n+1), n/(n+1)]", () => {
    expect(quantile(sample, 0, "exclusivo")).toBeNull();
    expect(quantile(sample, 1, "exclusivo")).toBeNull();
  });

  it("devuelve null con entradas inválidas", () => {
    expect(quantile([], 0.5)).toBeNull();
    expect(quantile([1, 2], 1.5)).toBeNull();
    expect(quantile([1, 2], Number.NaN)).toBeNull();
    expect(quantile([1, Number.NaN], 0.5)).toBeNull();
  });

  it("con n = 1 devuelve el único valor", () => {
    expect(quantile([7], 0.25)).toBe(7);
    expect(quantile([7], 1)).toBe(7);
  });

  it("interpola linealmente entre dos datos", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
  });
});
