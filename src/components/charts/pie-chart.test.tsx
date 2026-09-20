import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { computeSimpleFrequencyTable } from "@/core/statistics";

import { PieChart } from "./pie-chart";

describe("PieChart", () => {
  it("muestra una tabla accesible con categorías y porcentajes", () => {
    const table = computeSimpleFrequencyTable({
      variableId: "color",
      values: ["rojo", "azul", "rojo", "verde", "rojo", "azul"],
    });
    render(<PieChart data={table} title="Colores favoritos" />);

    const accessibleTable = screen
      .getByText("Datos del gráfico circular de color")
      .closest("table");
    expect(accessibleTable).not.toBeNull();
    const rows = within(accessibleTable as HTMLElement).getAllByRole("row");
    expect(rows.length).toBe(4); // encabezado + 3 categorías
    expect(within(accessibleTable as HTMLElement).getByText("rojo")).toBeInTheDocument();
    expect(within(accessibleTable as HTMLElement).getByText("50,0%")).toBeInTheDocument();
  });

  it("agrupa el resto de categorías en Otros cuando exceden el máximo", () => {
    const values = Array.from({ length: 12 }, (_, i) => `cat-${i}`);
    const table = computeSimpleFrequencyTable({ variableId: "cat", values });
    render(<PieChart data={table} title="Categorías" maxCategories={5} />);

    expect(screen.getAllByText(/Otros/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Se agruparon las categorías/)).toBeInTheDocument();
  });
});
