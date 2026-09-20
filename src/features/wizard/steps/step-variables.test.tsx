import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";

import { useWizardStore } from "../store/wizard-store";
import { StepVariables } from "./step-variables";

describe("StepVariables", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    window.localStorage.clear();
    useWizardStore.getState().importSample();
  });

  it("aplica la sugerencia del sistema y muestra su motivo", () => {
    renderWithProviders(<StepVariables />);

    expect(screen.getByLabelText("Tipo de variable", { selector: "#tipo-nota" })).toHaveTextContent(
      "Cuantitativa continua",
    );
    expect(screen.getByText(/Sugerido: Cuantitativa continua/)).toBeInTheDocument();
    expect(
      screen.getByText(/Todos los valores son numéricos y al menos uno tiene decimales/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Sugerido: Cualitativa nominal").length).toBeGreaterThan(0);
  });

  it("permite cambiar el tipo a ordinal y ordenar sus categorías", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StepVariables />);

    useWizardStore.getState().setColumnKind("ciudad", "ordinal");

    const orden = await screen.findByText("Orden de las categorías, de menor a mayor");
    expect(orden).toBeInTheDocument();
    expect(screen.getByText("1. Bogotá")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Subir Medellín" }));
    expect(screen.getByText("1. Medellín")).toBeInTheDocument();
    expect(useWizardStore.getState().columns.find((c) => c.id === "ciudad")?.categoryOrder[0]).toBe(
      "Medellín",
    );
  });

  it("permite excluir una columna del análisis", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StepVariables />);

    await user.click(
      screen.getByLabelText("Incluir en el análisis", { selector: "#incluir-edad" }),
    );

    expect(useWizardStore.getState().columns.find((c) => c.id === "edad")?.include).toBe(false);
  });

  it("renombra una columna", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StepVariables />);

    const campo = screen.getByLabelText("Nombre de la columna", { selector: "#nombre-edad" });
    await user.clear(campo);
    await user.type(campo, "Edad en años");

    expect(useWizardStore.getState().columns.find((c) => c.id === "edad")?.name).toBe(
      "Edad en años",
    );
  });

  it("muestra una tarjeta por columna del dataset", () => {
    const { container } = renderWithProviders(<StepVariables />);
    const secciones = within(container).getAllByRole("heading", { level: 2 });
    expect(secciones).toHaveLength(4);
  });
});
