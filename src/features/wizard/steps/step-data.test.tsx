import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";

import { useWizardStore } from "../store/wizard-store";
import { StepData } from "./step-data";

describe("StepData", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    window.localStorage.clear();
  });

  it("convierte el texto pegado en un dataset con vista previa", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StepData />);

    await user.click(screen.getByLabelText("O pega tus datos aquí"));
    await user.paste("Nota,Genero\n4.5,Femenino\n3.8,Masculino");
    await user.click(screen.getByRole("button", { name: "Usar estos datos" }));

    expect(screen.getByText("2 fila(s)")).toBeInTheDocument();
    expect(screen.getByText("2 columna(s)")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Nota" })).toBeInTheDocument();
    expect(screen.getByText("Femenino")).toBeInTheDocument();
  });

  it("carga los datos de ejemplo con un solo clic", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StepData />);

    await user.click(screen.getByRole("button", { name: "Usar datos de ejemplo" }));

    expect(screen.getByText("24 fila(s)")).toBeInTheDocument();
    expect(screen.getByText("4 columna(s)")).toBeInTheDocument();
  });

  it("muestra en un Alert el mensaje del error de importación", async () => {
    renderWithProviders(<StepData />);

    const archivo = new File(["contenido"], "datos.pdf", { type: "application/pdf" });
    const input = document.getElementById("archivo-datos") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivo] } });

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("No pudimos leer esos datos");
    expect(alerta).toHaveTextContent("CSV o Excel");
  });
});

describe("hoja de datos editable", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
  });

  it("escribe datos en la tabla y los usa", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StepData />);
    await user.click(screen.getByRole("button", { name: "Escribir los datos en una tabla" }));
    const name = screen.getByRole("textbox", { name: "Nombre de la columna 1" });
    await user.clear(name);
    await user.type(name, "Horas");
    await user.type(screen.getByRole("textbox", { name: "Fila 1, Horas" }), "2");
    await user.type(screen.getByRole("textbox", { name: "Fila 2, Horas" }), "3,5");
    await user.click(screen.getByRole("button", { name: "Usar los datos de la tabla" }));
    const dataset = useWizardStore.getState().dataset;
    expect(dataset?.rowCount).toBe(2);
    expect(dataset?.columns[0]?.variable.name).toBe("Horas");
    expect(dataset?.columns[0]?.values).toEqual([2, 3.5]);
  }, 20_000);
});
