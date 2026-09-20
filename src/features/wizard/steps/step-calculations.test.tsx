import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";

import { useWizardStore } from "../store/wizard-store";
import { StepCalculations } from "./step-calculations";

describe("StepCalculations", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    window.localStorage.clear();
    useWizardStore.getState().importSample();
  });

  it("deshabilita con su motivo una gráfica que no aplica a la variable", () => {
    renderWithProviders(<StepCalculations />);

    expect(document.getElementById("grafica-genero-pie")).not.toBeDisabled();
    const ojivaDeGenero = document.getElementById("grafica-genero-ogive");
    expect(ojivaDeGenero).toBeDisabled();
    expect(
      screen.getAllByText(/La ojiva requiere un orden entre categorías o clases/).length,
    ).toBeGreaterThan(0);
  });

  it("deshabilita el promedio aritmético si solo hay variables cualitativas", () => {
    for (const column of useWizardStore.getState().columns) {
      if (column.kind !== "nominal") useWizardStore.getState().toggleColumn(column.id, false);
    }
    renderWithProviders(<StepCalculations />);

    expect(document.getElementById("calc-media")).toBeDisabled();
    expect(
      screen.getAllByText(/Solo se puede calcular con variables cuantitativas/).length,
    ).toBeGreaterThan(0);
  });

  it('"Seleccionar lo habitual" marca el paquete de siempre', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StepCalculations />);

    await user.click(screen.getByRole("button", { name: "Seleccionar lo habitual" }));

    const calculation = useWizardStore.getState().calculation;
    expect(calculation.median).toBe(true);
    expect(calculation.quartiles).toBe(true);
    expect(document.getElementById("calc-mediana")).toHaveAttribute("data-state", "checked");
  });

  it("pide la lista de percentiles cuando se marca la opción", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StepCalculations />);

    await user.click(screen.getByLabelText(/Percentiles elegidos por ti/));

    const campo = screen.getByLabelText("Percentiles (separados por comas)");
    await user.clear(campo);
    await user.type(campo, "abc");

    expect(await screen.findByRole("alert")).toHaveTextContent("no es un percentil válido");
  });
});
