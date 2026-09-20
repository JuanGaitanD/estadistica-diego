import { describe, expect, it } from "vitest";
import {
  buildIntervals,
  ceilToPrecision,
  classIndexOf,
  computeClassCount,
  computeIntervalLength,
  detectDecimals,
  MAX_CLASSES,
  MIN_CLASSES,
} from "./intervals";
import type { GroupingOptions } from "../types";

const base: GroupingOptions = { enabled: true, rule: "sturges", closure: "cerrado-abierto" };
const sequence = (n: number): number[] => Array.from({ length: n }, (unused, i) => i + 1);

describe("detectDecimals", () => {
  it("detecta el máximo de decimales de los datos", () => {
    expect(detectDecimals([1, 2, 3])).toBe(0);
    expect(detectDecimals([1.5, 2.25])).toBe(2);
  });

  it("maneja la notación exponencial", () => {
    expect(detectDecimals([1e-7])).toBe(7);
    expect(detectDecimals([1.25e-7])).toBe(9);
  });
});

describe("ceilToPrecision", () => {
  it("redondea hacia arriba a la precisión pedida", () => {
    expect(ceilToPrecision(0.333, 2)).toBeCloseTo(0.34, 10);
    expect(ceilToPrecision(2.0001, 0)).toBe(3);
    expect(ceilToPrecision(3, 0)).toBe(3);
  });
});

describe("computeIntervalLength", () => {
  it("garantiza K · l >= R", () => {
    const l = computeIntervalLength(10, 3, 1);
    expect(l).toBeCloseTo(3.4, 10);
    expect(3 * l).toBeGreaterThanOrEqual(10);
  });

  it("nunca devuelve una longitud nula", () => {
    expect(computeIntervalLength(0, 4, 2)).toBeCloseTo(0.01, 10);
  });

  it("devuelve 0 con K no positivo", () => {
    expect(computeIntervalLength(10, 0, 0)).toBe(0);
  });
});

describe("computeClassCount", () => {
  it("aplica Sturges por defecto: n = 100 da K = 8", () => {
    expect(computeClassCount(sequence(100), "sturges").k).toBe(8);
  });

  it("aplica Sturges en varios tamaños", () => {
    expect(computeClassCount(sequence(2), "sturges").k).toBe(2);
    expect(computeClassCount(sequence(10), "sturges").k).toBe(5);
    expect(computeClassCount(sequence(1000), "sturges").k).toBe(11);
  });

  it("acota K a [2, 50]", () => {
    const small = computeClassCount(sequence(1), "sturges");
    expect(small.k).toBe(MIN_CLASSES);
    const big = computeClassCount(sequence(100000), "raiz");
    expect(big.k).toBe(MAX_CLASSES);
    expect(big.warnings.length).toBeGreaterThan(0);
  });

  it("aplica la raíz y Rice", () => {
    expect(computeClassCount(sequence(100), "raiz").k).toBe(10);
    expect(computeClassCount(sequence(100), "rice").k).toBe(10);
  });

  it("aplica Scott y Freedman-Diaconis", () => {
    const scott = computeClassCount(sequence(100), "scott");
    expect(scott.rule).toBe("scott");
    expect(scott.k).toBeGreaterThanOrEqual(MIN_CLASSES);
    const fd = computeClassCount(sequence(100), "freedman-diaconis");
    expect(fd.rule).toBe("freedman-diaconis");
    expect(fd.k).toBeGreaterThanOrEqual(MIN_CLASSES);
  });

  it("cae a Sturges cuando Scott o FD no son aplicables", () => {
    const constant = [5, 5, 5, 5, 5, 5, 5, 5];
    const scott = computeClassCount(constant, "scott");
    expect(scott.rule).toBe("sturges");
    expect(scott.requestedRule).toBe("scott");
    expect(scott.warnings.length).toBe(1);
    expect(computeClassCount(constant, "freedman-diaconis").rule).toBe("sturges");
  });

  it("respeta el K manual y cae a Sturges si no es válido", () => {
    expect(computeClassCount(sequence(20), "manual", 6).k).toBe(6);
    const invalid = computeClassCount(sequence(20), "manual");
    expect(invalid.rule).toBe("sturges");
    expect(invalid.warnings.length).toBe(1);
  });

  it("sin datos devuelve el mínimo de clases", () => {
    expect(computeClassCount([], "sturges").k).toBe(MIN_CLASSES);
  });
});

describe("buildIntervals", () => {
  it("devuelve null sin datos válidos", () => {
    expect(buildIntervals([], base)).toBeNull();
    expect(buildIntervals([Number.NaN], base)).toBeNull();
  });

  it("construye clases [a, b) con la última cerrada que cubren el recorrido", () => {
    const plan = buildIntervals(sequence(100), base);
    expect(plan).not.toBeNull();
    if (plan === null) return;
    expect(plan.k).toBe(8);
    expect(plan.classes).toHaveLength(8);
    expect(plan.k * plan.intervalLength).toBeGreaterThanOrEqual(plan.range);
    const first = plan.classes[0];
    const last = plan.classes[plan.classes.length - 1];
    expect(first?.lowerBound).toBe(1);
    expect(first?.includesLower).toBe(true);
    expect(first?.includesUpper).toBe(false);
    expect(last?.includesUpper).toBe(true);
    expect(last?.upperBound).toBeGreaterThanOrEqual(100);
    expect(classIndexOf(plan.classes, 100)).toBe(7);
    expect(classIndexOf(plan.classes, 1)).toBe(0);
  });

  it("calcula la marca de clase como punto medio", () => {
    const plan = buildIntervals([0, 10], { ...base, rule: "manual", manualK: 2 });
    expect(plan?.classes[0]?.classMark).toBeCloseTo(2.5, 10);
    expect(plan?.classes[1]?.classMark).toBeCloseTo(7.5, 10);
  });

  it("soporta la convención (a, b]", () => {
    const plan = buildIntervals(sequence(20), { ...base, closure: "abierto-cerrado" });
    expect(plan).not.toBeNull();
    if (plan === null) return;
    expect(plan.classes[0]?.includesLower).toBe(true);
    expect(plan.classes[1]?.includesLower).toBe(false);
    expect(plan.classes[1]?.includesUpper).toBe(true);
    expect(classIndexOf(plan.classes, 1)).toBe(0);
    expect(classIndexOf(plan.classes, 20)).toBeGreaterThanOrEqual(0);
  });

  it("genera una única clase degenerada cuando todos los valores son iguales", () => {
    const plan = buildIntervals([3, 3, 3], base);
    expect(plan?.k).toBe(1);
    expect(plan?.intervalLength).toBe(0);
    expect(plan?.warnings).toHaveLength(1);
    expect(plan?.classes[0]?.label).toBe("[3, 3]");
  });

  it("clasifica fuera de rango como -1", () => {
    const plan = buildIntervals([1, 2, 3, 4], base);
    expect(plan).not.toBeNull();
    if (plan === null) return;
    expect(classIndexOf(plan.classes, -99)).toBe(-1);
  });
});
