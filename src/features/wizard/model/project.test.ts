import { describe, expect, it } from "vitest";

import { buildDataset } from "@/core/data";

import { restoreWorkspace } from "./project";
import { DEFAULT_CALCULATION } from "./types";

const dataset = buildDataset([["1", "a"]], { source: "texto", headers: ["Edad", "Grupo"] });
const columns = dataset.columns.map((column) => ({
  id: column.variable.id,
  name: column.variable.name,
  kind: column.variable.kind,
  inferredKind: column.variable.kind,
  inferredReason: "",
  include: true,
  categoryOrder: [],
}));

describe("restoreWorkspace", () => {
  it("restaura columnas y cálculos, tomando solo campos con el tipo correcto", () => {
    const restored = restoreWorkspace(
      {
        columns,
        calculation: { median: true, rule: 7, charts: { edad: ["bar", "inventada"] } },
        calculationCustomized: true,
      },
      dataset,
    );
    expect(restored?.columns).toHaveLength(2);
    expect(restored?.calculation.median).toBe(true);
    expect(restored?.calculation.rule).toBe(DEFAULT_CALCULATION.rule);
    expect(restored?.calculation.charts).toEqual({ edad: ["bar"] });
    expect(restored?.calculationCustomized).toBe(true);
  });

  it("descarta valores fuera de rango y deja los de por defecto", () => {
    const edad = columns[0]!.id;
    const restored = restoreWorkspace(
      {
        columns,
        calculation: {
          manualK: 100000,
          rule: "inventada",
          quartileMethod: "exclusivo",
          relativeMode: "ninguna",
          contingencyRowId: "no-existe",
          contingencyColumnId: edad,
          percentilesText: "1, ".repeat(400),
          charts: { [edad]: ["bar"], otra: ["pie"] },
        },
        calculationCustomized: true,
      },
      dataset,
    )!;
    expect(restored.calculation.manualK).toBe(DEFAULT_CALCULATION.manualK);
    expect(restored.calculation.rule).toBe(DEFAULT_CALCULATION.rule);
    expect(restored.calculation.quartileMethod).toBe("exclusivo");
    expect(restored.calculation.relativeMode).toBe(DEFAULT_CALCULATION.relativeMode);
    expect(restored.calculation.contingencyRowId).toBeNull();
    expect(restored.calculation.contingencyColumnId).toBe(edad);
    expect(restored.calculation.percentilesText).toBe(DEFAULT_CALCULATION.percentilesText);
    expect(restored.calculation.charts).toEqual({ [edad]: ["bar"] });
    expect(
      restoreWorkspace(
        { columns, calculation: { manualK: 2.5 }, calculationCustomized: true },
        dataset,
      )!.calculation.manualK,
    ).toBe(DEFAULT_CALCULATION.manualK);
  });

  it("descarta una configuración que no corresponde a los datos", () => {
    expect(
      restoreWorkspace(
        { columns: columns.slice(1), calculation: {}, calculationCustomized: false },
        dataset,
      ),
    ).toBeNull();
    expect(restoreWorkspace("basura", dataset)).toBeNull();
  });
});
