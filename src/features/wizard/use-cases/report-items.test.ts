import { describe, expect, it } from "vitest";

import { computeContingencyTable, interpretContingency } from "@/core/statistics";
import type { AnalyzedContingency } from "@/features/analysis";

import { crossChartElementId, crossReportItem } from "./report-items";

const table = computeContingencyTable({
  rowVariableId: "g",
  columnVariableId: "c",
  rowValues: ["F", "M"],
  columnValues: ["A", "B"],
});
const cross: AnalyzedContingency = {
  request: { rowVariableId: "g", columnVariableId: "c", percentages: "total" },
  rowVariableName: "Género",
  columnVariableName: "Ciudad",
  table,
  interpretation: interpretContingency(table, "Género", "Ciudad"),
};

describe("crossReportItem", () => {
  it("añade la imagen de las barras agrupadas", async () => {
    const item = await crossReportItem(cross, async (id) => `img:${id}`);
    expect(item?.images).toEqual([
      { title: "Barras agrupadas · Género y Ciudad", dataUrl: `img:${crossChartElementId(cross)}` },
    ]);
  });

  it("si la captura falla, el cruce entra sin imagen", async () => {
    const item = await crossReportItem(cross, () => Promise.reject(new Error("no está")));
    expect(item?.images).toEqual([]);
    expect(item?.tables).toHaveLength(1);
  });
});
