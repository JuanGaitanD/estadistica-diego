import { describe, expect, it } from "vitest";

import { mode } from "../central-tendency/mode";
import { runVariableAnalysis } from "../run-variable-analysis";
import {
  interpretCategorical,
  describeShape,
  interpretQuantitative,
  quantitativeSteps,
  STEP_TABLE_MAX_ROWS,
} from "./describe-variable";
import { formatShare, formatValue, narrativeDecimals } from "./text";

describe("text", () => {
  it("formatea con la convención es-CO y sin «-0»", () => {
    expect(formatValue(1234.5, 1)).toBe("1.234,5");
    expect(formatValue(-0.001, 2)).toBe("0,00");
    expect(formatValue(Number.NaN)).toBe("—");
    expect(formatShare(10 / 24)).toBe("41,7 %");
  });

  it("redacta con un decimal más que los datos, entre 1 y 3", () => {
    expect(narrativeDecimals([18, 19, 20])).toBe(1);
    expect(narrativeDecimals([3.5, 4.1])).toBe(2);
    expect(narrativeDecimals([0.12345])).toBe(3);
  });
});

describe("interpretQuantitative", () => {
  it("datos simétricos: el promedio es el valor típico", () => {
    const result = interpretQuantitative([10, 20, 30, 40, 50]);
    expect(result.headline).toContain("El valor típico es 30,0 (el promedio)");
    expect(result.headline).toContain("casi coinciden");
    expect(result.details[0]).toBe(
      "La mitad central de los datos está entre 20,0 y 40,0; el más bajo es 10,0 y el más alto 50,0.",
    );
    expect(result.details.join(" ")).toContain("No hay valores atípicos");
    expect(result.caveats[0]).toContain("Con solo 5 datos");
  });

  it("sesgo a la derecha: la mediana representa mejor y se nombra el atípico", () => {
    const result = interpretQuantitative([1, 1, 2, 2, 2, 3, 3, 3, 4, 40]);
    expect(result.headline).toContain("El valor típico es 2,5 (la mediana");
    expect(result.headline).toContain("valores altos lo jalan hacia arriba");
    expect(result.details.join(" ")).toContain("1 valor(es) atípico(s) (40,0)");
    expect(result.caveats).toHaveLength(0);
  });

  it("sesgo a la izquierda", () => {
    const result = interpretQuantitative([-40, 1, 2, 2, 2, 3, 3, 3, 4, 4]);
    expect(result.headline).toContain("valores bajos lo jalan hacia abajo");
  });

  it("clasifica la variación por el coeficiente de variación", () => {
    const low = interpretQuantitative([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]);
    expect(low.details.join(" ")).toContain("poca variación");
    const high = interpretQuantitative([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(high.details.join(" ")).toContain("mucha variación");
  });

  it("no habla de coeficiente de variación con signos mezclados", () => {
    const result = interpretQuantitative([-5, -2, 0, 3, 6]);
    expect(result.details.join(" ")).not.toContain("% del promedio");
  });

  it("casos borde: sin datos y datos constantes", () => {
    expect(interpretQuantitative([]).headline).toContain("No quedan datos");
    expect(interpretQuantitative([7, 7, 7]).headline).toBe(
      "Todos los datos valen 7,0: no hay variación que describir.",
    );
  });
});

describe("interpretCategorical", () => {
  it("una categoría dominante dice que es más de la mitad", () => {
    const values = ["A", "A", "A", "B", "C"];
    const result = interpretCategorical(
      [
        { label: "A", count: 3 },
        { label: "B", count: 1 },
        { label: "C", count: 1 },
      ],
      mode(values),
    );
    expect(result.headline).toBe("Lo más común es «A»: 3 de 5 casos (60,0 %). Es más de la mitad.");
    expect(result.details[0]).toContain("3 categorías distintas");
  });

  it("empates y categorías sin moda", () => {
    const tie = interpretCategorical(
      [
        { label: "A", count: 2 },
        { label: "B", count: 2 },
        { label: "C", count: 1 },
      ],
      mode(["A", "A", "B", "B", "C"]),
    );
    expect(tie.headline).toContain("Empatan como lo más común «A» y «B», con 2 casos cada una");
    const flat = interpretCategorical(
      [
        { label: "A", count: 2 },
        { label: "B", count: 2 },
      ],
      mode(["A", "A", "B", "B"]),
    );
    expect(flat.headline).toContain("ninguna destaca");
  });

  it("ordinal: añade la categoría mediana", () => {
    const result = interpretCategorical(
      [
        { label: "bajo", count: 1 },
        { label: "medio", count: 2 },
      ],
      mode(["bajo", "medio", "medio"]),
      "medio",
    );
    expect(result.details.join(" ")).toContain(
      "la mitad de los casos está en «medio» o por debajo",
    );
  });
});

describe("quantitativeSteps", () => {
  it("muestra los números de la persona en media, mediana y desviación", () => {
    const steps = quantitativeSteps([3, 3, 4, 5, 5]);
    expect(steps.map((step) => step.title)).toEqual([
      "1. Ordenar los datos de menor a mayor",
      "2. Promedio (media aritmética)",
      "3. Mediana",
      "4. Desviación estándar (muestral)",
      "5. Coeficiente de variación",
      "6. Cuartiles, rango intercuartílico y atípicos",
      "7. Forma: asimetría y curtosis",
    ]);
    expect(steps[1]?.formula).toBe("x̄ = Σx / n = 20,00 / 5 = 4,00");
    expect(steps[2]?.text).toContain("posición (n + 1) / 2 = 3, que vale 4");
    expect(steps[3]?.table?.footer).toEqual(["Σ", "20,00", "0,00", "4,00"]);
    expect(steps[3]?.formula).toBe("s² = Σ(x − x̄)² / (n − 1) = 4,00 / 4 = 1,00;  s = √1,00 = 1,00");
    expect(steps[3]?.excel).toContain("DESVEST.M");
    expect(steps[4]?.formula).toBe("CV = s / |x̄| · 100 = 1,00 / 4,00 · 100 = 25,0 %");
    expect(steps[5]?.formula?.split("\n")).toEqual([
      "Q1: posición h = (n − 1) · 0,25 + 1 = 2,00 → x(2) = 3",
      "Q3: posición h = (n − 1) · 0,75 + 1 = 4,00 → x(4) = 5",
      "RIC = Q3 − Q1 = 5,00 − 3,00 = 2,00",
      "Vallas: 3,00 − 1,5 · 2,00 = 0,00 y 5,00 + 1,5 · 2,00 = 8,00",
    ]);
    // z = −1, −1, 0, 1, 1: Σz³ = 0 y Σz⁴ = 4 → asimetría 0 y curtosis 5 − 8 = −3.
    expect(steps[6]?.formula).toContain("= 0,000");
    expect(steps[6]?.formula).toContain("= -3,000");
  });

  it("añade el cálculo de K y l cuando la variable se agrupa", () => {
    const values = Array.from({ length: 24 }, (_, i) => 1 + i * 0.5);
    const result = runVariableAnalysis({
      variableId: "x",
      kind: "continua",
      values,
      grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
    });
    const last = result.steps.at(-1);
    expect(last?.title).toMatch(/^\d+\. Agrupar en intervalos$/);
    expect(last?.formula).toContain(
      "K = 1 + log₂(n) = 1 + log₂(24) = 5,58 → se redondea hacia arriba: K = 6",
    );
    expect(last?.formula).toContain("Rango R = máximo − mínimo = 12,5 − 1,0 = 11,5");
  });

  it("mediana con n par y tabla recortada cuando hay muchos datos", () => {
    const values = Array.from({ length: STEP_TABLE_MAX_ROWS + 10 }, (_, i) => i + 1);
    const steps = quantitativeSteps(values);
    expect(steps[2]?.text).toContain("posiciones 20 y 21: (20 + 21) / 2 = 20,50");
    expect(steps[3]?.table?.rows).toHaveLength(STEP_TABLE_MAX_ROWS);
    expect(steps[3]?.table?.omittedRows).toBe(10);
  });
});

describe("runVariableAnalysis incluye interpretación y paso a paso", () => {
  it("numérica", () => {
    const result = runVariableAnalysis({
      variableId: "x",
      kind: "discreta",
      values: [10, 20, 30, null, 40, 50],
    });
    expect(result.interpretation.headline).toContain("30,0");
    expect(result.steps).toHaveLength(7);
    expect(result.shape?.map((metric) => metric.key)).toEqual(["asimetria", "curtosis"]);
  });

  it("cualitativa: contar, proporción y moda", () => {
    const result = runVariableAnalysis({
      variableId: "c",
      kind: "nominal",
      values: ["Bogotá", "Bogotá", "Cali"],
    });
    expect(result.interpretation.headline).toContain("«Bogotá»: 2 de 3 casos (66,7 %)");
    expect(result.steps.map((step) => step.title)).toEqual(["1. Contar cada categoría", "2. Moda"]);
    expect(result.steps[0]?.table?.rows[0]).toEqual(["Bogotá", "2", "0,667", "66,7 %"]);
    expect(result.steps[1]?.text).toContain("moda: «Bogotá»");
  });

  it("ordinal: añade la mediana por posición", () => {
    const result = runVariableAnalysis({
      variableId: "o",
      kind: "ordinal",
      values: ["Bajo", "Medio", "Medio", "Alto", "Alto"],
      categoryOrder: ["Bajo", "Medio", "Alto"],
    });
    expect(result.steps[2]?.title).toBe("3. Mediana (variable ordinal)");
    expect(result.steps[2]?.formula).toBe("Categoría mediana: «Medio»");
  });
});

describe("describeShape", () => {
  it("no describe la forma con menos de 8 datos", () => {
    expect(describeShape([1, 2, 3, 4, 5])).toBeNull();
  });

  it("nombra la cola larga y los extremos", () => {
    const skewed = [1, 1, 1, 2, 2, 2, 3, 3, 4, 20];
    const text = describeShape(skewed) ?? "";
    expect(text).toContain("muy cargada: tiene una cola hacia los valores altos");
    expect(text).toContain("más datos extremos que en una campana normal");
  });

  it("dice casi simétrica cuando lo es", () => {
    expect(describeShape([1, 2, 3, 4, 5, 6, 7, 8, 9])).toContain("casi simétrica (asimetría 0,00)");
  });
});
