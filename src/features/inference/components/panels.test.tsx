import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EstimationPanel } from "./estimation-panel";
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
