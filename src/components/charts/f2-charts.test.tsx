import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { FrequencyTableResult } from "@/core/statistics";

import { BoxPlot, niceTicks } from "./box-plot";
import { appliesTo } from "./chart-registry";
import { paretoRows } from "./pareto-chart";

describe("niceTicks", () => {
  it("usa pasos redondos dentro del recorrido", () => {
    expect(niceTicks(2.4, 4.9)).toEqual([2.5, 3, 3.5, 4, 4.5]);
    expect(niceTicks(0, 100)).toEqual([0, 20, 40, 60, 80, 100]);
  });
});

describe("paretoRows", () => {
  it("ordena de mayor a menor y acumula hasta 100 %", () => {
    const table = {
      variableId: "c",
      grouped: false,
      n: 10,
      excluded: 0,
      warnings: [],
      explanation: { what: "", why: "" },
      rows: [
        { label: "B", absolute: 2, relative: 0.2, cumulativeAbsolute: 2, cumulativeRelative: 0.2 },
        { label: "A", absolute: 5, relative: 0.5, cumulativeAbsolute: 7, cumulativeRelative: 0.7 },
        { label: "C", absolute: 3, relative: 0.3, cumulativeAbsolute: 10, cumulativeRelative: 1 },
      ],
    } satisfies FrequencyTableResult;
    expect(paretoRows(table)).toEqual([
      { label: "A", value: 5, cumulative: 50 },
      { label: "C", value: 3, cumulative: 80 },
      { label: "B", value: 2, cumulative: 100 },
    ]);
  });
});

describe("appliesTo para Pareto y caja", () => {
  it("Pareto solo en nominales; caja solo en cuantitativas", () => {
    expect(appliesTo("pareto", "nominal", false).ok).toBe(true);
    expect(appliesTo("pareto", "ordinal", false).ok).toBe(false);
    expect(appliesTo("box", "continua", true).ok).toBe(true);
    expect(appliesTo("box", "nominal", false).ok).toBe(false);
  });
});

describe("BoxPlot", () => {
  it("dice los cinco números y los atípicos", () => {
    render(
      <BoxPlot
        variableId="x"
        title="Caja"
        summary={{
          min: 1,
          q1: 3,
          median: 5,
          q3: 7,
          max: 30,
          lowerWhisker: 1,
          upperWhisker: 8,
          outliers: [30],
        }}
      />,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Diagrama de caja: mediana 5,00, mitad central de 3,00 a 7,00, 1 atípico(s)",
    );
    expect(screen.getByText(/Atípicos/)).toBeTruthy();
  });
});

describe("groupedBarRows", () => {
  it("cada grupo trae el porcentaje de cada columna dentro de la fila", async () => {
    const { computeContingencyTable } = await import("@/core/statistics");
    const { groupedBarRows } = await import("./grouped-bar-chart");
    const table = computeContingencyTable({
      rowVariableId: "g",
      columnVariableId: "c",
      rowValues: ["F", "F", "F", "M"],
      columnValues: ["A", "A", "B", "B"],
    });
    expect(groupedBarRows(table)).toEqual([
      { grupo: "F", A: 200 / 3, B: 100 / 3 },
      { grupo: "M", A: 0, B: 100 },
    ]);
  });
});
