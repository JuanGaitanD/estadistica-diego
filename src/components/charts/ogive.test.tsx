import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { computeGroupedFrequencyTable } from "@/core/statistics";

import { Ogive } from "./ogive";

describe("Ogive", () => {
  it("arranca en el límite inferior de la primera clase con valor 0", () => {
    const table = computeGroupedFrequencyTable({
      variableId: "edad",
      values: [10, 12, 15, 18, 20, 22, 25, 28, 30, 33],
      grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
    });
    render(<Ogive data={table} title="Edades" />);

    const accessibleTable = screen.getByText("Datos de la ojiva de edad").closest("table");
    expect(accessibleTable).not.toBeNull();
    const rows = within(accessibleTable as HTMLElement).getAllByRole("row");
    expect(rows.length).toBe(table.rows.length + 2); // encabezado + inicio + clases
    const cells = within(rows[1] as HTMLElement).getAllByRole("cell");
    expect(cells[1]?.textContent).toBe("0");
  });

  it("acepta measure=percentage y muestra el porcentaje acumulado", () => {
    const table = computeGroupedFrequencyTable({
      variableId: "edad",
      values: [10, 12, 15, 18, 20, 22, 25, 28, 30, 33],
      grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
    });
    render(<Ogive data={table} title="Edades" measure="percentage" />);

    const accessibleTable = screen.getByText("Datos de la ojiva de edad").closest("table");
    expect(
      within(accessibleTable as HTMLElement).getByText("Porcentaje acumulado (Hi %)"),
    ).toBeInTheDocument();
  });
});
