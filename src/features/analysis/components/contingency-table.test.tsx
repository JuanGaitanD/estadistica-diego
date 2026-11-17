import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { computeContingencyTable } from "@/core/statistics";

import type { AnalyzedContingency } from "../model/types";
import { ContingencyTable, EXTREME_MAX_CLASS, EXTREME_MIN_CLASS } from "./contingency-table";

/** Cruce con extremos claros: M = [2, 1] y F = [0, 1]. */
function contingency(): AnalyzedContingency {
  return {
    request: { rowVariableId: "sexo", columnVariableId: "respuesta", percentages: "ninguno" },
    rowVariableName: "Sexo",
    columnVariableName: "Respuesta",
    table: computeContingencyTable({
      rowVariableId: "sexo",
      columnVariableId: "respuesta",
      rowValues: ["M", "M", "M", "F"],
      columnValues: ["sí", "no", "sí", "no"],
    }),
  };
}

/** Filas del cuerpo de la tabla del cruce (el paso a paso plegado trae otras tablas). */
function bodyRows(): HTMLElement[] {
  const table = screen.getByRole("table", { name: /^Cruce: Sexo y Respuesta/ });
  return within(table).getAllByRole("row").slice(1);
}

describe("ContingencyTable", () => {
  it("muestra la tabla de doble entrada con sus totales marginales", () => {
    render(<ContingencyTable contingency={contingency()} />);
    expect(screen.getByText("Cruce: Sexo y Respuesta")).toBeInTheDocument();
    const rows = bodyRows();
    expect(rows).toHaveLength(3); // M, F y la fila de totales
    const totals = rows[2];
    expect(totals).toBeDefined();
    expect(within(totals as HTMLElement).getByText("Total")).toBeInTheDocument();
    expect(within(totals as HTMLElement).getAllByText("4").length).toBeGreaterThan(0);
  });

  it("resalta el máximo y el mínimo de la fila señalada", () => {
    render(<ContingencyTable contingency={contingency()} />);
    const firstRow = bodyRows()[0] as HTMLElement;
    const cellsBefore = within(firstRow).getAllByRole("cell");
    expect(cellsBefore[1]?.className).not.toContain("ring-primary");

    fireEvent.mouseEnter(firstRow);

    const cells = within(bodyRows()[0] as HTMLElement).getAllByRole("cell");
    for (const token of EXTREME_MAX_CLASS.split(" ")) {
      expect(cells[1]).toHaveClass(token);
    }
    for (const token of EXTREME_MIN_CLASS.split(" ")) {
      expect(cells[2]).toHaveClass(token);
    }

    fireEvent.mouseLeave(firstRow);
    const after = within(bodyRows()[0] as HTMLElement).getAllByRole("cell");
    expect(after[1]?.className).not.toContain("ring-primary");
  });

  it("resalta el máximo y el mínimo de la columna señalada", () => {
    render(<ContingencyTable contingency={contingency()} />);
    const table = screen.getByRole("table", { name: /^Cruce: Sexo y Respuesta/ });
    const header = within(table).getByRole("columnheader", { name: "sí" });
    fireEvent.mouseEnter(header);

    const rows = bodyRows();
    const maxCell = within(rows[0] as HTMLElement).getAllByRole("cell")[1];
    const minCell = within(rows[1] as HTMLElement).getAllByRole("cell")[1];
    expect(maxCell).toHaveClass("ring-primary");
    for (const token of EXTREME_MIN_CLASS.split(" ")) {
      expect(minCell).toHaveClass(token);
    }
  });

  it("conmuta entre conteos y porcentajes", () => {
    render(<ContingencyTable contingency={contingency()} />);
    const firstRow = () => bodyRows()[0] as HTMLElement;
    expect(within(firstRow()).getAllByRole("cell")[1]).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: "% por fila" }));
    expect(within(firstRow()).getAllByRole("cell")[1]?.textContent).toMatch(/66/);
    expect(screen.getByRole("button", { name: "% por fila" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "% del total" }));
    expect(within(firstRow()).getAllByRole("cell")[1]?.textContent).toMatch(/50/);
  });

  it("describe la tabla y su leyenda para lectores de pantalla", () => {
    const { container } = render(<ContingencyTable contingency={contingency()} />);
    const described = container.querySelector("[aria-describedby]");
    expect(described).not.toBeNull();
    const descriptionId = described?.getAttribute("aria-describedby") ?? "";
    expect(container.querySelector(`#${CSS.escape(descriptionId)}`)?.textContent).toMatch(
      /Pasa el cursor/,
    );
    expect(screen.getByText(/Máximo de la fila o columna señalada/)).toBeInTheDocument();
    expect(screen.getByText(/Mínimo de la fila o columna señalada/)).toBeInTheDocument();
  });

  it("explica por qué un cruce no se pudo calcular", () => {
    render(
      <ContingencyTable
        contingency={{
          request: { rowVariableId: "a", columnVariableId: "b", percentages: "ninguno" },
          rowVariableName: "A",
          columnVariableName: "B",
          table: null,
          unavailableReason: 'La variable "b" ya no está en los datos.',
        }}
      />,
    );
    expect(screen.getByText(/ya no está en los datos/)).toBeInTheDocument();
  });
});

describe("ContingencyTable · prueba de la relación", () => {
  it("con una 2×2 de pocos casos dice si la relación es real con la exacta de Fisher", () => {
    render(<ContingencyTable contingency={contingency()} />);
    expect(
      screen.getByRole("region", {
        name: /¿La relación es real o casualidad\? \(exacta de fisher\)/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/podría deberse al azar/)).toBeInTheDocument();
  });

  it("con más categorías usa el chi-cuadrado", () => {
    const cross: AnalyzedContingency = {
      ...contingency(),
      table: computeContingencyTable({
        rowVariableId: "sexo",
        columnVariableId: "respuesta",
        rowValues: [...Array(30).fill("M"), ...Array(30).fill("F")] as string[],
        columnValues: [
          ...Array(20).fill("sí"),
          ...Array(5).fill("no"),
          ...Array(5).fill("ns"),
          ...Array(5).fill("sí"),
          ...Array(15).fill("no"),
          ...Array(10).fill("ns"),
        ] as string[],
      }),
    };
    render(<ContingencyTable contingency={cross} />);
    expect(
      screen.getByRole("region", { name: /\(chi-cuadrado de independencia\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sexo y Respuesta están relacionadas/)).toBeInTheDocument();
  });
});
