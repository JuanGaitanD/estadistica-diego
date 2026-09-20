/**
 * Verificación cruzada contra ADR-003 con valores calculados a mano (revisión
 * senior). Complementa los tests por módulo: aquí se comprueban de punta a
 * punta los casos que el ADR marca como delicados.
 */
import { describe, expect, it } from "vitest";

import {
  buildIntervals,
  coefficientOfVariation,
  computeClassCount,
  computeContingencyTable,
  computeIntervalLength,
  geometricMean,
  harmonicMean,
  mode,
  populationVariance,
  quantile,
  sampleVariance,
  sortAscending,
  standardDeviation,
} from "./index";

// x = [2, 4, 4, 5, 7, 9, 12, 15], n = 8
const X = sortAscending([2, 4, 4, 5, 7, 9, 12, 15]);

describe("ADR-003 §4 cuantiles", () => {
  it("R-7 (inclusivo) coincide con el cálculo a mano", () => {
    expect(quantile(X, 0.25, "inclusivo")).toBeCloseTo(4, 10);
    expect(quantile(X, 0.5, "inclusivo")).toBeCloseTo(6, 10);
    expect(quantile(X, 0.75, "inclusivo")).toBeCloseTo(9.75, 10);
    expect(quantile(X, 0, "inclusivo")).toBe(2);
    expect(quantile(X, 1, "inclusivo")).toBe(15);
  });

  it("R-6 (exclusivo) coincide con el cálculo a mano y es null fuera de dominio", () => {
    expect(quantile(X, 0.25, "exclusivo")).toBeCloseTo(4, 10);
    expect(quantile(X, 0.75, "exclusivo")).toBeCloseTo(11.25, 10);
    // Dominio: 1/(n+1) = 0.1111… <= p <= n/(n+1) = 0.8888…
    expect(quantile(X, 0.05, "exclusivo")).toBeNull();
    expect(quantile(X, 0.95, "exclusivo")).toBeNull();
  });
});

describe("ADR-003 §5 variabilidad", () => {
  it("varianza muestral, poblacional y CV coinciden con el cálculo a mano", () => {
    // Σ(xi − 7.25)² = 139.5
    expect(sampleVariance(X).value).toBeCloseTo(139.5 / 7, 10);
    expect(populationVariance(X).value).toBeCloseTo(139.5 / 8, 10);
    expect(standardDeviation(X).value).toBeCloseTo(Math.sqrt(139.5 / 7), 10);
    expect(coefficientOfVariation(X).value).toBeCloseTo((100 * Math.sqrt(139.5 / 7)) / 7.25, 10);
  });

  it("n = 1: la varianza muestral no está definida; la poblacional vale 0", () => {
    expect(sampleVariance([5]).value).toBeNull();
    expect(sampleVariance([5]).unavailableReason).toBeTruthy();
    expect(populationVariance([5]).value).toBe(0);
  });

  it("CV no se devuelve cuando la media es cero o hay signos mezclados", () => {
    expect(coefficientOfVariation([-2, -1, 1, 2]).value).toBeNull();
    expect(coefficientOfVariation([]).value).toBeNull();
  });

  it("todos los valores iguales: s = 0 y CV = 0", () => {
    expect(standardDeviation([4, 4, 4, 4]).value).toBe(0);
    expect(coefficientOfVariation([4, 4, 4, 4]).value).toBe(0);
  });
});

describe("ADR-003 §2 agrupación", () => {
  it("Sturges y longitud de intervalo coinciden con el cálculo a mano", () => {
    // K = techo(1 + log2(8)) = 4 ; R = 13 ; l = techo(13/4) a 0 decimales = 4
    expect(computeClassCount(X, "sturges").k).toBe(4);
    expect(computeIntervalLength(13, 4, 0)).toBe(4);
    const plan = buildIntervals([...X], {
      enabled: true,
      rule: "sturges",
      closure: "cerrado-abierto",
    });
    expect(plan).not.toBeNull();
    if (plan === null) return;
    expect(plan.classes).toHaveLength(4);
    expect(plan.classes[0]?.lowerBound).toBe(2);
    expect(plan.classes[3]?.upperBound).toBe(18);
    // K · l >= R: las clases cubren todo el recorrido.
    expect(plan.classes.length * (plan.intervalLength ?? 0)).toBeGreaterThanOrEqual(13);
  });

  it("K queda acotado a [2, 50]", () => {
    expect(computeClassCount([7], "sturges").k).toBeGreaterThanOrEqual(2);
    const many = Array.from({ length: 5000 }, (_value, index) => index);
    expect(computeClassCount(many, "raiz").k).toBeLessThanOrEqual(50);
  });
});

describe("ADR-003 §3.3 y §3.4 promedios con dominio restringido", () => {
  it("geométrica y armónica sobre [1, 2, 4, 8]", () => {
    expect(geometricMean([1, 2, 4, 8]).value).toBeCloseTo(Math.SQRT2 * 2, 10);
    expect(harmonicMean([1, 2, 4, 8]).value).toBeCloseTo(4 / 1.875, 10);
  });

  it("H < G < media en datos positivos no todos iguales", () => {
    const values = [2, 4, 4, 5, 7, 9, 12, 15];
    const h = harmonicMean(values).value ?? 0;
    const g = geometricMean(values).value ?? 0;
    expect(h).toBeLessThan(g);
    expect(g).toBeLessThan(7.25);
  });

  it("dominios inválidos devuelven null con motivo, nunca NaN", () => {
    for (const invalid of [[0, 1, 2], [-1, 2, 3], []]) {
      const g = geometricMean(invalid);
      const a = harmonicMean(invalid);
      expect(g.value).toBeNull();
      expect(g.unavailableReason).toBeTruthy();
      expect(a.value).toBeNull();
      expect(a.unavailableReason).toBeTruthy();
    }
  });
});

describe("ADR-003 §3.6 moda", () => {
  it("bimodal, amodal y unimodal con un único valor distinto", () => {
    const bimodal = mode([1, 1, 2, 2, 3]);
    expect(bimodal.kind).toBe("multimodal");
    expect(bimodal.values.map((entry) => entry.value)).toEqual([1, 2]);

    expect(mode([1, 2, 3]).kind).toBe("amodal");
    expect(mode([5, 5, 5]).kind).toBe("unimodal");
    expect(mode([]).values).toHaveLength(0);
  });
});

describe("ADR-003 §6 contingencia con empates", () => {
  it("resalta todos los índices empatados en máximo y mínimo", () => {
    const table = computeContingencyTable({
      rowVariableId: "a",
      columnVariableId: "b",
      // Fila "x": 2 y 2 (empate en máximo y mínimo a la vez).
      rowValues: ["x", "x", "x", "x", "y", "y", "y"],
      columnValues: ["p", "p", "q", "q", "p", "q", "q"],
    });
    expect(table.grandTotal).toBe(7);
    expect(table.rowExtremes[0]?.maxIndexes).toEqual([0, 1]);
    expect(table.rowExtremes[0]?.minIndexes).toEqual([0, 1]);
    expect(table.rowExtremes[1]?.maxIndexes).toEqual([1]);
    expect(table.rowExtremes[1]?.minIndexes).toEqual([0]);
  });

  it("excluye las filas con faltantes en cualquiera de las dos variables", () => {
    const table = computeContingencyTable({
      rowVariableId: "a",
      columnVariableId: "b",
      rowValues: ["x", null, "y"],
      columnValues: ["p", "p", null],
    });
    expect(table.grandTotal).toBe(1);
    expect(table.excluded).toBe(2);
  });
});
