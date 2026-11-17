import { fireEvent, render, screen } from "@testing-library/react";
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

describe("HypothesisPanel · dos proporciones", () => {
  it("no compara una variable consigo misma", () => {
    const { container } = render(
      <HypothesisPanel
        columns={[{ id: "g", name: "Grupo", quantitative: false, values: ["A", "B", "A", "B"] }]}
      />,
    );
    // Radix Select no se abre en jsdom: se cambia el select nativo que sincroniza.
    const goal = [...container.querySelectorAll("select")].find((select) =>
      [...select.options].some((option) => option.value === "dos-proporciones"),
    )!;
    fireEvent.change(goal, { target: { value: "dos-proporciones" } });
    expect(screen.getByText(/Elige dos variables distintas/)).toBeTruthy();
  });
});

describe("HypothesisPanel · supuestos y una cola", () => {
  // Muy cargados hacia la derecha y con pocos datos: no se parecen a una normal.
  const skewed = [1, 1, 1, 2, 2, 9, 2, 3, 3, 3, 4, 20];
  const grupo = ["A", "A", "A", "A", "A", "A", "B", "B", "B", "B", "B", "B"];
  const selectWith = (container: HTMLElement, value: string) =>
    [...container.querySelectorAll("select")].find((select) =>
      [...select.options].some((option) => option.value === value),
    )!;

  it("si falla la normalidad usa Mann-Whitney y dice por qué", () => {
    render(
      <HypothesisPanel
        columns={[
          { id: "x", name: "Espera", quantitative: true, values: skewed },
          { id: "g", name: "Grupo", quantitative: false, values: grupo },
        ]}
      />,
    );
    expect(screen.getByText(/Qué dice la prueba: Mann-Whitney/)).toBeTruthy();
    expect(screen.getByText(/Se cambió de prueba/)).toBeTruthy();
    // Las pruebas de rangos no tienen curva que sombrear.
    expect(screen.queryByText(/la parte sombreada/)).toBeNull();
  });

  it("la persona puede forzar la t y elegir una cola", () => {
    const { container } = render(
      <HypothesisPanel
        columns={[
          { id: "x", name: "Espera", quantitative: true, values: skewed },
          { id: "g", name: "Grupo", quantitative: false, values: grupo },
        ]}
      />,
    );
    fireEvent.change(selectWith(container, "clasica"), { target: { value: "clasica" } });
    fireEvent.change(selectWith(container, "menor"), { target: { value: "menor" } });
    expect(screen.getByText(/Qué dice la prueba: t de Welch/)).toBeTruthy();
    expect(screen.queryByText(/Se cambió de prueba/)).toBeNull();
    expect(screen.getByText(/un promedio menor en «A» que en «B»/)).toBeTruthy();
  });

  it("una tabla 2×2 con pocos casos pasa a la exacta de Fisher", () => {
    const { container } = render(
      <HypothesisPanel
        columns={[
          {
            id: "a",
            name: "Sirvió",
            quantitative: false,
            values: ["L", "L", "L", "L", "T", "T", "T", "T"],
          },
          {
            id: "b",
            name: "Dijo",
            quantitative: false,
            values: ["l", "l", "l", "t", "l", "t", "t", "t"],
          },
        ]}
      />,
    );
    fireEvent.change(selectWith(container, "relacion"), { target: { value: "relacion" } });
    expect(screen.getByText(/Qué dice la prueba: Exacta de Fisher/)).toBeTruthy();
    expect(screen.getAllByText(/p = 0,486/).length).toBeGreaterThan(0);
  });
});

describe("EstimationPanel · diferencia de porcentajes", () => {
  it("muestra el intervalo de Newcombe con la interpretación primero", () => {
    const group = [...Array(10).fill("A"), ...Array(10).fill("B")] as string[];
    const result = [
      ...Array(9).fill("sí"),
      "no",
      ...Array(3).fill("sí"),
      ...Array(7).fill("no"),
    ] as string[];
    const { container } = render(
      <EstimationPanel
        columns={[
          { id: "g", name: "Grupo", quantitative: false, values: group },
          { id: "r", name: "Aprobó", quantitative: false, values: result },
        ]}
      />,
    );
    const goal = [...container.querySelectorAll("select")].find((select) =>
      [...select.options].some((option) => option.value === "diferencia-proporciones"),
    )!;
    fireEvent.change(goal, { target: { value: "diferencia-proporciones" } });
    // 9/10 − 3/10: Newcombe da de 17,1 a 80,9 puntos.
    expect(
      screen.getByText(
        "Con un método que acierta el 95 % de las veces, el porcentaje de «sí» en «A» menos el de «B» está entre 17,1 puntos y 80,9 puntos.",
      ),
    ).toBeTruthy();
  });
});

describe("ProbabilityPanel · teorema del límite central", () => {
  it("simula los promedios con la lectura primero", () => {
    render(
      <ProbabilityPanel
        columns={[
          { id: "w", name: "Espera", values: [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6, 8, 12, 20, 35] },
        ]}
      />,
    );
    expect(screen.getByText("¿Por qué los promedios forman una campana?")).toBeTruthy();
    expect(
      screen.getByText(/Espera tiene una cola marcada hacia los valores altos, pero los promedios/),
    ).toBeTruthy();
    expect(screen.getByText("Los promedios de 1.000 muestras de 5")).toBeTruthy();
  });
});
