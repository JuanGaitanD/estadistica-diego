import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RegressionPanel } from "./regression-panel";

const columns = [
  { id: "x", name: "Horas", values: [1, 2, 3, 4, 5] },
  { id: "y", name: "Nota", values: [3, 3, 4, 5, 5] },
];

describe("RegressionPanel", () => {
  it("con el caso de la clase muestra la interpretación primero y los pasos plegados", () => {
    render(<RegressionPanel columns={columns} />);
    expect(
      screen.getByText(/Por cada unidad más de Horas, Nota sube 0,6 en promedio/),
    ).toBeTruthy();
    const details = screen.getAllByText("Ver cómo se calculó")[0]?.closest("details");
    expect(details?.open).toBe(false);
    expect(screen.getByText("1. El modelo y la suma de errores al cuadrado")).toBeTruthy();
  });

  it("predice y avisa al extrapolar", async () => {
    const user = userEvent.setup();
    render(<RegressionPanel columns={columns} />);
    await user.type(screen.getByRole("textbox", { name: "Horas" }), "8");
    await user.click(screen.getByRole("button", { name: "Predecir" }));
    expect(screen.getByText("Para Horas = 8 la recta predice Nota ≈ 7.")).toBeTruthy();
    expect(screen.getByText(/fuera de los valores de Horas/)).toBeTruthy();
  });

  it("pide dos columnas numéricas", () => {
    render(<RegressionPanel columns={[columns[0]!]} />);
    expect(screen.getByText("Hacen falta dos columnas de números")).toBeTruthy();
  });
});

describe("RegressionPanel · histograma de residuos", () => {
  it("muestra el histograma con su lectura", () => {
    render(<RegressionPanel columns={columns} />);
    expect(screen.getByText("Histograma de los residuos")).toBeTruthy();
    expect(screen.getByText("Con 5 residuos la forma todavía no se puede juzgar.")).toBeTruthy();
  });
});
