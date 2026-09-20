import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { computeGroupedFrequencyTable } from "@/core/statistics";

import { FrequencyPolygon } from "./frequency-polygon";

describe("FrequencyPolygon", () => {
  it("agrega puntos de frecuencia cero antes y después de las clases", () => {
    const table = computeGroupedFrequencyTable({
      variableId: "edad",
      values: [10, 12, 15, 18, 20, 22, 25, 28, 30, 33],
      grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
    });
    render(<FrequencyPolygon data={table} title="Edades" />);

    const accessibleTable = screen
      .getByText("Datos del polígono de frecuencias de edad")
      .closest("table");
    expect(accessibleTable).not.toBeNull();
    const rows = within(accessibleTable as HTMLElement).getAllByRole("row");
    // encabezado + clases + 2 puntos extremos de frecuencia cero
    expect(rows.length).toBe(table.rows.length + 3);
    expect(within(accessibleTable as HTMLElement).getAllByText("0").length).toBeGreaterThan(0);
  });
});
