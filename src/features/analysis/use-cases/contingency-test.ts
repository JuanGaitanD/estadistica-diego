import { independenceTest, type HypothesisTest } from "@/core/statistics";

import type { AnalyzedContingency } from "../model/types";

/**
 * ¿La relación del cruce es real o casualidad? Chi-cuadrado, o exacta de
 * Fisher si la tabla es 2×2 y tiene pocos casos.
 */
export function contingencyTestOf(cross: AnalyzedContingency): HypothesisTest | null {
  const table = cross.table;
  if (table === null) return null;
  return independenceTest(
    table.cells.map((row) => row.map((cell) => cell.absolute)),
    table.rowLabels,
    table.columnLabels,
    cross.rowVariableName,
    cross.columnVariableName,
  );
}
