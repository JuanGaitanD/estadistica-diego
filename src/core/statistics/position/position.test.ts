import { describe, expect, it } from "vitest";
import {
  computeDeciles,
  computePercentiles,
  computePosition,
  computeQuartiles,
  interquartileRange,
} from "./position";
import { median } from "../central-tendency/median";
import { REASONS } from "../numeric/validate";

// Ejemplo de referencia (Wikipedia / Excel), n = 11.
const sample = [6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49];

describe("computeQuartiles", () => {
  it("reproduce CUARTIL.INC de Excel con el método inclusivo", () => {
    const [q1, q2, q3] = computeQuartiles(sample);
    expect(q1?.value).toBeCloseTo(25.5, 10);
    expect(q2?.value).toBeCloseTo(40, 10);
    expect(q3?.value).toBeCloseTo(42.5, 10);
  });

  it("reproduce CUARTIL.EXC de Excel con el método exclusivo", () => {
    const [q1, , q3] = computeQuartiles(sample, "exclusivo");
    expect(q1?.value).toBeCloseTo(15, 10);
    expect(q3?.value).toBeCloseTo(43, 10);
  });

  it("Q2 coincide con la mediana", () => {
    const [, q2] = computeQuartiles(sample);
    expect(q2?.value).toBe(median(sample).value);
  });

  it("puede ocultar Q2", () => {
    expect(computeQuartiles(sample, "inclusivo", false).map((m) => m.key)).toEqual(["Q1", "Q3"]);
  });

  it("sin datos devuelve null con motivo", () => {
    const [q1] = computeQuartiles([]);
    expect(q1?.value).toBeNull();
    expect(q1?.unavailableReason).toBe(REASONS.sinDatos);
  });
});

describe("computeDeciles y computePercentiles", () => {
  it("calcula los nueve deciles", () => {
    const deciles = computeDeciles(sample);
    expect(deciles).toHaveLength(9);
    expect(deciles[4]?.value).toBe(median(sample).value);
  });

  it("calcula los percentiles pedidos", () => {
    const [p25, p90] = computePercentiles(sample, [25, 90]);
    expect(p25?.value).toBeCloseTo(25.5, 10);
    expect(p90?.key).toBe("P90");
  });

  it("calcula la serie completa P1..P99", () => {
    expect(computePercentiles(sample, "todos")).toHaveLength(99);
  });

  it("el método exclusivo devuelve null fuera de su rango", () => {
    const [p1] = computePercentiles(sample, [1], "exclusivo");
    expect(p1?.value).toBeNull();
    expect(p1?.unavailableReason).toBe(REASONS.fueraDeRango);
  });
});

describe("interquartileRange", () => {
  it("calcula RIC = Q3 − Q1", () => {
    expect(interquartileRange(sample).value).toBeCloseTo(17, 10);
    expect(interquartileRange(sample, "exclusivo").value).toBeCloseTo(28, 10);
  });

  it("sin datos devuelve null con motivo", () => {
    expect(interquartileRange([]).unavailableReason).toBe(REASONS.sinDatos);
  });

  it("es 0 cuando todos los valores son iguales", () => {
    expect(interquartileRange([4, 4, 4, 4]).value).toBe(0);
  });
});

describe("computePosition", () => {
  it("devuelve solo los bloques pedidos", () => {
    const result = computePosition({
      variableId: "x",
      values: sample,
      options: {
        quartiles: true,
        quartileMethod: "inclusivo",
        includeQ2: true,
        deciles: true,
        percentiles: [90],
      },
    });
    expect(result.method).toBe("inclusivo");
    expect(result.quartiles).toHaveLength(3);
    expect(result.deciles).toHaveLength(9);
    expect(result.percentiles).toHaveLength(1);
  });

  it("con las opciones por defecto solo calcula cuartiles", () => {
    const result = computePosition({ variableId: "x", values: sample });
    expect(result.quartiles).toHaveLength(3);
    expect(result.deciles).toHaveLength(0);
    expect(result.percentiles).toHaveLength(0);
  });

  it("puede omitir los cuartiles", () => {
    const result = computePosition({
      variableId: "x",
      values: sample,
      options: {
        quartiles: false,
        quartileMethod: "exclusivo",
        includeQ2: false,
        deciles: false,
        percentiles: "todos",
      },
    });
    expect(result.quartiles).toHaveLength(0);
    expect(result.percentiles).toHaveLength(99);
  });
});
