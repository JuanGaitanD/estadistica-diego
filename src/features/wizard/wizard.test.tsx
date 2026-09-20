import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";

import { useWizardStore } from "./store/wizard-store";
import { Wizard } from "./wizard";

describe("Wizard (flujo completo)", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    window.localStorage.clear();
  });

  it("va de los datos de ejemplo a los resultados en tres pasos", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Wizard />);

    // Paso 1: sin datos no se puede continuar y el motivo está visible.
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    expect(screen.getByText(/Todavía no hay datos cargados/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Usar datos de ejemplo" }));
    expect(screen.getByText("24 fila(s)")).toBeInTheDocument();

    // Paso 2: tipos de variable.
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "¿Qué tipo de variables son?" }),
    ).toBeInTheDocument();

    // Paso 3: cálculos y gráficas.
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "¿Qué cálculos y gráficas necesitas?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seleccionar lo habitual" }));

    // Paso 4: resultados con al menos una métrica y una tabla.
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Aquí están tus resultados" }),
      ).toBeInTheDocument(),
    );

    expect(screen.getAllByText("Datos válidos (n)").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("table").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Datos en CSV/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar selección" })).toBeInTheDocument();
  }, 30_000);

  it("vuelve al paso anterior sin perder lo configurado", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Wizard />);

    await user.click(screen.getByRole("button", { name: "Usar datos de ejemplo" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Atrás" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "¿Qué datos vamos a analizar?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("24 fila(s)")).toBeInTheDocument();
  }, 20_000);
});
