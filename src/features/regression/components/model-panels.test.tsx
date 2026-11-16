import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LogisticPanel, MultipleRegressionPanel } from "./model-panels";

const horas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const edad = [18, 22, 19, 25, 21, 20, 23, 19, 24, 22, 20, 21];
const nota = [2.1, 2.6, 2.4, 3.3, 3.1, 3.4, 3.9, 3.6, 4.4, 4.3, 4.5, 4.8];
const aprueba = ["no", "no", "no", "sí", "no", "sí", "no", "sí", "sí", "sí", "sí", "sí"];

const columns = [
  { id: "horas", name: "Horas", quantitative: true, values: horas },
  { id: "edad", name: "Edad", quantitative: true, values: edad },
  { id: "aprueba", name: "Aprueba", quantitative: false, values: aprueba },
  { id: "nota", name: "Nota", quantitative: true, values: nota },
];

describe("MultipleRegressionPanel", () => {
  it("ajusta Nota con Horas y Edad y explica cada coeficiente", () => {
    const ordered = [columns[3]!, columns[0]!, columns[1]!];
    render(<MultipleRegressionPanel columns={ordered} />);
    expect(screen.getByText(/Juntas, Horas y Edad explican el/)).toBeTruthy();
    expect(
      screen.getByText(/Manteniendo lo demás constante, cada unidad más de Horas sube Nota/),
    ).toBeTruthy();
    expect(screen.getByText("Ver cómo se calculó")).toBeTruthy();
  });
});

describe("LogisticPanel", () => {
  it("predice el sí con razones de momios y matriz de confusión", () => {
    render(<LogisticPanel columns={columns.filter((c) => c.id !== "edad")} />);
    expect(screen.getByRole("heading", { name: "Razones de momios" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Matriz de confusión" })).toBeTruthy();
    expect(screen.getAllByText(/multiplica por/).length).toBeGreaterThan(0);
  });
});
