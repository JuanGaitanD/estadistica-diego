import { describe, expect, it } from "vitest";

import {
  oneProportionZ,
  oneSampleT,
  pairedT,
  twoProportionZ,
  twoSampleT,
} from "./hypothesis-tests";
import {
  fisherExact,
  fisherRecommended,
  independenceTest,
  kruskalWallis,
  mannWhitney,
  signTest,
  wilcoxonSignedRank,
} from "./nonparametric";

// Datos de los ejemplos de R (`sleep`, `PlantGrowth`, `?wilcox.test`, `?fisher.test`);
// los valores de referencia son la salida de R, confirmada con scipy 1.18.
const SLEEP_1 = [0.7, -1.6, -0.2, -1.2, -0.1, 3.4, 3.7, 0.8, 0.0, 2.0];
const SLEEP_2 = [1.9, 0.8, 1.1, 0.1, -0.1, 4.4, 5.5, 1.6, 4.6, 3.4];
const CTRL = [4.17, 5.58, 5.18, 6.11, 4.5, 4.61, 5.17, 4.53, 5.33, 5.14];
const TRT1 = [4.81, 4.17, 4.41, 3.59, 5.87, 3.83, 6.03, 4.89, 4.32, 4.69];
const TRT2 = [6.31, 5.12, 5.54, 5.5, 5.37, 5.29, 4.92, 6.15, 5.8, 5.26];
// ?wilcox.test: «permeability constants of the human chorioamnion».
const X = [0.8, 0.83, 1.89, 1.04, 1.45, 1.38, 1.91, 1.64, 0.73, 1.46];
const Y = [1.15, 0.88, 0.9, 0.74, 1.21];
// ?wilcox.test: escala de depresión de Hamilton, antes (x) y después (y).
const HAM_X = [1.83, 0.5, 1.62, 2.48, 1.68, 1.88, 1.55, 3.06, 1.3];
const HAM_Y = [0.878, 0.647, 0.598, 2.05, 1.06, 1.29, 1.06, 3.14, 1.29];

const group = (label: string, values: number[]) => ({ label, values });

describe("Mann-Whitney (wilcox.test de dos muestras)", () => {
  it("con empates usa la normal con correcciones: W = 25,5, p = 0,06933", () => {
    const r = mannWhitney(group("1", SLEEP_1), group("2", SLEEP_2), "horas")!;
    expect(r.statistic).toBe(25.5);
    expect(r.pValue).toBeCloseTo(0.069328, 5);
    expect(r.interpretation.details.join(" ")).toContain("aproximación normal");
  });

  it("una cola con empates: p = 0,03466", () => {
    const r = mannWhitney(group("1", SLEEP_1), group("2", SLEEP_2), "horas", {
      alternative: "menor",
    })!;
    expect(r.pValue).toBeCloseTo(0.034664, 5);
    expect(r.tails).toBe("izquierda");
  });

  it("sin empates el valor p es exacto: W = 35", () => {
    const greater = mannWhitney(group("x", X), group("y", Y), "k", { alternative: "mayor" })!;
    expect(greater.statistic).toBe(35);
    expect(greater.pValue).toBeCloseTo(0.1272061, 6);
    expect(mannWhitney(group("x", X), group("y", Y), "k")!.pValue).toBeCloseTo(0.2544123, 6);
    expect(
      mannWhitney(group("x", X), group("y", Y), "k", { alternative: "menor" })!.pValue,
    ).toBeCloseTo(0.8967699, 6);
    expect(greater.interpretation.details.join(" ")).toContain("exacto");
    expect(greater.reference).toBeNull();
  });
});

describe("Mann-Whitney con 50 o más datos", () => {
  it("sin empates pasa a la normal con corrección: p = 0,7482 y 0,3741 (mayor)", () => {
    const a = Array.from({ length: 55 }, (_, i) => 2 * i + 0.5);
    const b = Array.from({ length: 52 }, (_, i) => 2 * i + 1.3);
    const r = mannWhitney(group("a", a), group("b", b), "x")!;
    expect(r.statistic).toBe(1482);
    expect(r.pValue).toBeCloseTo(0.7482116, 6);
    expect(
      mannWhitney(group("a", a), group("b", b), "x", { alternative: "mayor" })!.pValue,
    ).toBeCloseTo(0.3741058, 6);
  });
});

describe("Wilcoxon de rangos con signo", () => {
  it("pareada exacta: V = 40, p = 0,01953 (mayor) y 0,03906 (dos colas)", () => {
    // R: wilcox.test(x, y, paired = TRUE) usa x − y; aquí la diferencia es después − antes.
    const greater = wilcoxonSignedRank(HAM_Y, HAM_X, "después", "antes", {
      alternative: "mayor",
    })!;
    expect(greater.statistic).toBe(40);
    expect(greater.pValue).toBeCloseTo(0.01953125, 8);
    expect(wilcoxonSignedRank(HAM_Y, HAM_X, "después", "antes")!.pValue).toBeCloseTo(0.0390625, 8);
  });

  it("pareada con empates: sleep, p = 0,009091", () => {
    const r = wilcoxonSignedRank(SLEEP_1, SLEEP_2, "droga 1", "droga 2")!;
    expect(r.statistic).toBe(45);
    expect(r.pValue).toBeCloseTo(0.0090907, 6);
    expect(r.interpretation.details.join(" ")).toContain("se deja fuera");
  });
});

describe("prueba del signo (binom.test)", () => {
  it("sleep1 frente a 0: 5 de 9 arriba, p = 1; 0,5 (mayor); 0,7461 (menor)", () => {
    const r = signTest(SLEEP_1, 0, "horas")!;
    expect(r.statistic).toBe(5);
    expect(r.pValue).toBeCloseTo(1, 10);
    expect(signTest(SLEEP_1, 0, "horas", { alternative: "mayor" })!.pValue).toBeCloseTo(0.5, 10);
    expect(signTest(SLEEP_1, 0, "horas", { alternative: "menor" })!.pValue).toBeCloseTo(
      0.74609375,
      10,
    );
    expect(r.interpretation.details.join(" ")).toContain("1 dato es igual a 0");
    // P(S ≥ 5) = P(S ≤ 9 − 5) por simetría.
    expect(signTest(SLEEP_1, 0, "horas", { alternative: "mayor" })!.steps[3]!.excel).toBe(
      "=DISTR.BINOM.N(4; 9; 0,5; VERDADERO)",
    );
  });

  it("con todos los datos abajo la fórmula de Excel no usa argumentos negativos", () => {
    const r = signTest([1, 2, 3], 10, "x")!;
    expect(r.statistic).toBe(0);
    expect(r.steps[3]!.excel).toBe(
      "=MIN(1; 2*MIN(DISTR.BINOM.N(0; 3; 0,5; VERDADERO); DISTR.BINOM.N(3; 3; 0,5; VERDADERO)))",
    );
    expect(r.pValue).toBeCloseTo(0.25, 10);
  });

  it("con la mediana igual al valor dice «igual a» y no ve diferencia", () => {
    // Muy cargado a la derecha, mediana exactamente 3: 12 arriba y 12 abajo.
    const espera = [
      2.13, 2.2, 2.3, 2.35, 2.4, 2.5, 2.55, 2.6, 2.7, 2.75, 2.8, 2.9, 3, 4, 5, 6, 8, 10, 12, 15, 20,
      25, 30, 40, 60,
    ];
    const r = signTest(espera, 3, "Espera")!;
    expect(r.interpretation.headline).toContain("es 3,000, igual a 3,000");
    expect(r.pValue).toBeCloseTo(1, 10);
    expect(r.significant).toBe(false);
  });
});

describe("Kruskal-Wallis", () => {
  it("kruskal.test(weight ~ group, PlantGrowth): H = 7,9882, p = 0,01842", () => {
    const r = kruskalWallis(
      [group("ctrl", CTRL), group("trt1", TRT1), group("trt2", TRT2)],
      "peso",
    )!;
    expect(r.statistic).toBeCloseTo(7.988229, 5);
    expect(r.pValue).toBeCloseTo(0.0184238, 6);
    expect(r.reference).toEqual({ kind: "chi2", df: 2 });
    expect(r.interpretation.headline).toContain("«trt2»");
  });
});

describe("exacta de Fisher", () => {
  const labels = {
    rows: ["Leche primero", "Té primero"] as const,
    columns: ["Dice leche", "Dice té"] as const,
    rowName: "lo que se sirvió",
    columnName: "lo que se adivinó",
  };

  it("TeaTasting: p = 0,4857 (dos colas) y 0,2429 (mayor)", () => {
    expect(
      fisherExact(
        [
          [3, 1],
          [1, 3],
        ],
        labels,
      )!.pValue,
    ).toBeCloseTo(0.4857143, 6);
    expect(
      fisherExact(
        [
          [3, 1],
          [1, 3],
        ],
        labels,
        { alternative: "mayor" },
      )!.pValue,
    ).toBeCloseTo(0.2428571, 6);
    expect(
      fisherExact(
        [
          [3, 1],
          [1, 3],
        ],
        labels,
        { alternative: "menor" },
      )!.pValue,
    ).toBeCloseTo(0.9857143, 6);
  });

  it("sin datos en una fila o columna no hay prueba", () => {
    expect(
      fisherExact(
        [
          [0, 0],
          [3, 4],
        ],
        labels,
      ),
    ).toBeNull();
    expect(
      fisherExact(
        [
          [0, 2],
          [0, 4],
        ],
        labels,
      ),
    ).toBeNull();
  });

  it("tabla asimétrica: p = 0,02301", () => {
    expect(
      fisherExact(
        [
          [2, 7],
          [8, 2],
        ],
        labels,
      )!.pValue,
    ).toBeCloseTo(0.0230141, 6);
  });

  it("se recomienda solo en 2×2 con alguna celda esperada < 5", () => {
    expect(
      fisherRecommended([
        [3, 1],
        [1, 3],
      ]),
    ).toBe(true);
    expect(
      fisherRecommended([
        [30, 20],
        [25, 25],
      ]),
    ).toBe(false);
    expect(
      fisherRecommended([
        [1, 2, 3],
        [3, 2, 1],
      ]),
    ).toBe(false);
  });
});

describe("pruebas de una cola", () => {
  it("t de una muestra: p = 0,1088 (mayor) y 0,8912 (menor)", () => {
    const greater = oneSampleT(SLEEP_1, 0, "horas", { alternative: "mayor" })!;
    expect(greater.pValue).toBeCloseTo(0.1087989, 6);
    expect(greater.tails).toBe("derecha");
    expect(greater.steps[0]!.formula).toContain("μ > 0");
    expect(greater.interpretation.headline).toContain("un promedio mayor que 0");
    expect(oneSampleT(SLEEP_1, 0, "horas", { alternative: "menor" })!.pValue).toBeCloseTo(
      0.8912011,
      6,
    );
  });

  it("Welch con una cola: p = 0,03970", () => {
    const r = twoSampleT(group("1", SLEEP_1), group("2", SLEEP_2), "horas", {
      alternative: "menor",
    })!;
    expect(r.pValue).toBeCloseTo(0.0396971, 6);
    expect(r.significant).toBe(true);
  });

  it("t pareada con una cola: p = 0,001416", () => {
    const r = pairedT(SLEEP_1, SLEEP_2, "droga 1", "droga 2", { alternative: "mayor" })!;
    expect(r.pValue).toBeCloseTo(0.0014164, 6);
  });

  it("z de proporciones con una cola", () => {
    expect(oneProportionZ(60, 100, 0.5, "sí", { alternative: "mayor" })!.pValue).toBeCloseTo(
      0.0227501,
      6,
    );
    const two = twoProportionZ(
      { label: "A", successes: 45, n: 100 },
      { label: "B", successes: 30, n: 100 },
      "sí",
      { alternative: "mayor" },
    )!;
    expect(two.pValue).toBeCloseTo(0.014229, 5);
  });
});

describe("independenceTest", () => {
  it("elige Fisher en 2×2 con pocos casos y chi-cuadrado en lo demás", () => {
    const small = independenceTest(
      [
        [3, 1],
        [1, 3],
      ],
      ["L", "T"],
      ["l", "t"],
      "A",
      "B",
    )!;
    expect(small.test).toBe("Exacta de Fisher");
    expect(small.pValue).toBeCloseTo(0.4857143, 6);
    // chisq.test(matrix(c(20, 5, 5, 15, 5, 10), 2)): χ² = 15,667, gl = 2, p = 0,000396.
    const large = independenceTest(
      [
        [20, 5, 5],
        [5, 15, 10],
      ],
      ["M", "F"],
      ["sí", "no", "ns"],
      "Sexo",
      "Respuesta",
    )!;
    expect(large.test).toBe("Chi-cuadrado de independencia");
    // Una fila vacía no cuenta: queda una 2×2 con pocos casos y va a Fisher.
    const withEmpty = independenceTest(
      [
        [3, 1],
        [0, 0],
        [1, 3],
      ],
      ["L", "X", "T"],
      ["l", "t"],
      "A",
      "B",
    )!;
    expect(withEmpty.test).toBe("Exacta de Fisher");
    expect(withEmpty.pValue).toBeCloseTo(0.4857143, 6);
    expect(large.statistic).toBeCloseTo(15.666667, 5);
    expect(large.pValue).toBeCloseTo(0.000396302, 8);
  });
});
