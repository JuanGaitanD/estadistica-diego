import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EstimationPanel } from "./estimation-panel";
import { HypothesisPanel } from "./hypothesis-panel";
import { ProbabilityPanel } from "./probability-panel";

describe("ProbabilityPanel", () => {
  it("arranca con una normal estándar y P(X ≤ 1)", () => {
    render(<ProbabilityPanel columns={[]} />);
    expect(screen.getByText(/P\(X ≤ 1\) = 84,1 %/)).toBeTruthy();
    expect(screen.getByText("Ver cómo se calculó")).toBeTruthy();
  });
});

describe("EstimationPanel", () => {
  it("da el intervalo del promedio con la interpretación primero", () => {
    render(
      <EstimationPanel
        columns={[{ id: "y", name: "Y", quantitative: true, values: [3, 3, 4, 5, 5] }]}
      />,
    );
    expect(
      screen.getByText(
        "Con un método que acierta el 95 % de las veces, el promedio de Y en toda la población está entre 2,8 y 5,2.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("¿Y se parece a una normal?")).toBeTruthy();
  });
});

describe("HypothesisPanel", () => {
  const nota = [3.1, 3.4, 2.9, 3.8, 3.5, 4.2, 4.0, 4.4, 3.9, 4.1];
  const grupo = ["A", "A", "A", "A", "A", "B", "B", "B", "B", "B"];

  it("con dos grupos usa la t de Welch y da la conclusión primero", () => {
    render(
      <HypothesisPanel
        columns={[
          { id: "nota", name: "Nota", quantitative: true, values: nota },
          { id: "grupo", name: "Grupo", quantitative: false, values: grupo },
        ]}
      />,
    );
    expect(screen.getByText(/Por qué esta prueba/)).toBeTruthy();
    expect(screen.getByRole("region", { name: /t de Welch/ })).toBeTruthy();
    expect(screen.getByText(/«B» tiene en promedio 0,78 más de Nota/)).toBeTruthy();
    expect(screen.getByText("Ver cómo se calculó")).toBeTruthy();
  });

  it("con tres grupos pasa a ANOVA y muestra Tukey", () => {
    render(
      <HypothesisPanel
        columns={[
          { id: "nota", name: "Nota", quantitative: true, values: [...nota, 2.1, 2.4, 2.2] },
          { id: "grupo", name: "Grupo", quantitative: false, values: [...grupo, "C", "C", "C"] },
        ]}
      />,
    );
    expect(screen.getByText(/Qué dice la prueba: ANOVA de un factor/)).toBeTruthy();
    expect(screen.getByText("¿Qué grupos difieren? (Tukey)")).toBeTruthy();
  });
});
