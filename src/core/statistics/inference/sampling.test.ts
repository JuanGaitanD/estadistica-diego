import { describe, expect, it } from "vitest";

import { seededRandom, simulateSampleMeans } from "./sampling";

// Datos muy cargados a la derecha: tiempos de espera.
const WAITS = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6, 8, 12, 20, 35];

describe("seededRandom", () => {
  it("la misma semilla repite la serie y queda en [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const first = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(first);
    expect(first.every((u) => u >= 0 && u < 1)).toBe(true);
    expect(Array.from({ length: 5 }, seededRandom(43))).not.toEqual(first);
  });
});

describe("simulateSampleMeans (teorema del límite central)", () => {
  it("centro en μ y desviación σ/√n, como dice el teorema", () => {
    // μ = 6,625; σ = DESVEST.P = 8,8096; σ/√30 = 1,6084.
    const sim = simulateSampleMeans(WAITS, 30, "Espera", { repetitions: 20000, seed: 7 })!;
    expect(sim.populationMean).toBeCloseTo(6.625, 10);
    expect(sim.populationSd).toBeCloseTo(8.809618, 5);
    expect(sim.expectedSe).toBeCloseTo(1.608409, 5);
    expect(sim.meanOfMeans).toBeCloseTo(6.625, 1);
    expect(Math.abs(sim.sdOfMeans / sim.expectedSe - 1)).toBeLessThan(0.02);
    expect(sim.means).toHaveLength(20000);
  });

  it("con n = 2 queda cola y lo dice; con n = 100 casi desaparece", () => {
    const small = simulateSampleMeans(WAITS, 2, "Espera")!;
    expect(small.interpretation.caveats[0]).toContain("todavía conservan parte de la cola");
    const large = simulateSampleMeans(WAITS, 100, "Espera")!;
    expect(large.interpretation.headline).toContain(
      "tiene una cola marcada hacia los valores altos",
    );
    expect(large.interpretation.caveats).toHaveLength(1);
  });

  it("es reproducible con la misma semilla", () => {
    const a = simulateSampleMeans(WAITS, 5, "Espera", { seed: 3 })!;
    const b = simulateSampleMeans(WAITS, 5, "Espera", { seed: 3 })!;
    expect(a.means).toEqual(b.means);
  });

  it("sin variación o sin datos no simula", () => {
    expect(simulateSampleMeans([4, 4, 4], 5, "x")).toBeNull();
    expect(simulateSampleMeans([1], 5, "x")).toBeNull();
    expect(simulateSampleMeans(WAITS, 0, "x")).toBeNull();
  });
});
