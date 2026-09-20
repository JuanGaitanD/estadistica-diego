import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { computeSimpleFrequencyTable } from "@/core/statistics";

import { BarChart } from "./bar-chart";

describe("BarChart", () => {
  it("muestra la tabla accesible con la frecuencia absoluta por defecto", () => {
    const table = computeSimpleFrequencyTable({
      variableId: "color",
      values: ["rojo", "azul", "rojo", "verde", "rojo", "azul"],
    });
    render(<BarChart data={table} title="Colores" />);

    const accessibleTable = screen
      .getByText("Datos del gráfico de barras de color")
      .closest("table");
    expect(accessibleTable).not.toBeNull();
    const scoped = within(accessibleTable as HTMLElement);
    expect(scoped.getByText("rojo")).toBeInTheDocument();
    // Las frecuencias absolutas son conteos: se muestran sin decimales.
    expect(scoped.getByText("3")).toBeInTheDocument();
    expect(scoped.getByText("50,0%")).toBeInTheDocument();
  });

  it("grafica el porcentaje cuando measure = percentage", () => {
    const table = computeSimpleFrequencyTable({
      variableId: "color",
      values: ["rojo", "azul", "rojo", "verde"],
    });
    render(<BarChart data={table} title="Colores" measure="percentage" />);

    const accessibleTable = screen
      .getByText("Datos del gráfico de barras de color")
      .closest("table");
    expect(within(accessibleTable as HTMLElement).getByText("Porcentaje (%)")).toBeInTheDocument();
  });
});
