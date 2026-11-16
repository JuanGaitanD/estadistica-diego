import { describe, expect, it } from "vitest";

import { computeContingencyTable } from "../contingency/contingency";
import { interpretContingency } from "./describe-contingency";

function table(rows: string[], columns: string[]) {
  return computeContingencyTable({
    rowVariableId: "r",
    columnVariableId: "c",
    rowValues: rows,
    columnValues: columns,
  });
}

describe("interpretContingency", () => {
  it("nombra la combinación más común y sugiere relación si los grupos difieren", () => {
    const result = interpretContingency(
      table(["F", "F", "F", "M", "M", "M"], ["Sí", "Sí", "Sí", "No", "No", "Sí"]),
      "Género",
      "Aprobó",
    );
    expect(result.headline).toBe(
      "La combinación más común es «F» con «Sí»: 3 de 6 casos (50,0 %).",
    );
    expect(result.details).toContain("De «F» (3 casos), la mayor parte está en «Sí» (100,0 %).");
    expect(result.details.at(-1)).toContain("puede haber relación");
    expect(result.caveats[0]).toContain("chi-cuadrado");
    expect(result.caveats[1]).toContain("Con solo 6 casos");
  });

  it("grupos con el mismo reparto: no se ve relación", () => {
    const result = interpretContingency(
      table(["A", "A", "B", "B"], ["x", "y", "x", "y"]),
      "Grupo",
      "Respuesta",
    );
    expect(result.details.at(-1)).toContain("no se ve una relación clara");
  });
});
