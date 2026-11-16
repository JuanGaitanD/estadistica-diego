import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// jsdom no dibuja: la captura de gráficas devuelve una imagen mínima.
vi.mock("@/infrastructure/export", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/infrastructure/export")>()),
  captureElementAsPng: vi.fn().mockResolvedValue(new Blob(["x"], { type: "image/png" })),
}));

import { toast } from "sonner";

import { useReportStore } from "@/features/report";
import { renderWithProviders } from "@/test/render-with-providers";

import { useWizardStore } from "./store/wizard-store";
import { Workspace } from "./workspace";

describe("Workspace (flujo completo)", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    useReportStore.getState().clear();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("un enlace a una zona bloqueada explica por qué queda en Datos", async () => {
    window.history.replaceState(null, "", "/app#explorar");
    const info = vi.spyOn(toast, "info");
    renderWithProviders(<Workspace />);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/Todavía no hay datos cargados/));
    info.mockRestore();
    expect(
      screen.getByRole("heading", { level: 1, name: "¿Qué datos vamos a analizar?" }),
    ).toBeInTheDocument();
  });

  it("de los datos de ejemplo a la interpretación sin elegir cálculos", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Workspace />);

    // Sin datos, Explorar explica qué falta en vez de abrirse.
    await user.click(screen.getByRole("button", { name: /Explorar/ }));
    expect(screen.getByText(/Todavía no hay datos cargados/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "¿Qué datos vamos a analizar?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Usar datos de ejemplo" }));
    expect(
      screen.getByRole("heading", { name: "¿Qué tipo de variables son?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver qué dicen tus datos" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Qué dicen tus datos" }),
      ).toBeInTheDocument(),
    );
    expect(window.location.hash).toBe("#explorar");

    // La interpretación va primero; el cálculo, plegado.
    expect(screen.getByRole("region", { name: "Qué significa: Nota" })).toBeInTheDocument();
    expect(screen.getAllByText("Ver cómo se calculó").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Elegir qué se calcula" })).toBeInTheDocument();
  }, 30_000);

  it("añade una variable al informe y la muestra con su interpretación", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Workspace />);
    await user.click(screen.getByRole("button", { name: "Usar datos de ejemplo" }));
    await user.click(screen.getByRole("button", { name: "Ver qué dicen tus datos" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Añadir la variable Genero al informe" }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Añadir la variable Genero al informe" }));
    await waitFor(() => expect(useReportStore.getState().items).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: /Informe/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Tu informe" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "1. Genero" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
  }, 30_000);
});
