import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useReportStore } from "@/features/report";
import { renderWithProviders } from "@/test/render-with-providers";

import { useWizardStore } from "../store/wizard-store";
import { Workspace } from "../workspace";
import { preparationLog, semaphore } from "./guided-model";
import { useGuidedStore } from "./guided-store";

describe("modelo del modo guiado", () => {
  it("semáforo según lo comprobado", () => {
    expect(semaphore(0, 3)).toBe("rojo");
    expect(semaphore(1, 3)).toBe("amarillo");
    expect(semaphore(3, 3)).toBe("verde");
  });

  it("la bitácora anota los cambios frente a lo detectado al cargar", () => {
    useWizardStore.getState().reset();
    useWizardStore.getState().importSample();
    const { columns } = useWizardStore.getState();
    useWizardStore.getState().renameColumn(columns[0]!.id, "Calificación");
    useWizardStore.getState().toggleColumn(columns[2]!.id, false);
    const state = useWizardStore.getState();
    const log = preparationLog(state.dataset!, state.columns);
    expect(log).toContain("Se renombró «Nota» como «Calificación».");
    expect(log).toContain("«Ciudad» se dejó fuera del análisis.");
  });
});

describe("recorrido guiado de punta a punta", () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
    useReportStore.getState().clear();
    useGuidedStore.setState({
      active: false,
      phase: 0,
      question: "",
      questionType: null,
      checks: [],
    });
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("de la pregunta al informe con bitácora y evaluación", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Workspace />);

    await user.click(screen.getByRole("button", { name: "Guíame paso a paso" }));
    expect(screen.getByText(/Fase 1 de 6: Comprensión del problema/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Tu pregunta en una frase"), "¿Cómo son las notas?");
    await user.click(screen.getByRole("radio", { name: /Describir/ }));

    await user.click(screen.getByRole("button", { name: "Usar datos de ejemplo" }));
    await user.click(screen.getByRole("button", { name: /Siguiente: Comprensión de los datos/ }));
    expect(screen.getByText(/Fase 2 de 6/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Siguiente: Preparación/ }));
    expect(screen.getByRole("heading", { name: "Bitácora de preparación" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Siguiente: Modelado/ }));
    expect(screen.getByText(/Para «describir»/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Siguiente: Evaluación/ }));
    await user.click(screen.getByLabelText("Revisé si faltan datos y cuántos."));
    expect(screen.getByText(/Comprobado en parte \(1 de 3\)/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Siguiente: Despliegue/ }));
    await user.click(
      screen.getByRole("button", { name: "Añadir el recorrido CRISP-DM al informe" }),
    );

    const item = useReportStore.getState().items.at(-1)!;
    expect(item.title).toBe("Recorrido CRISP-DM");
    expect(item.interpretation.headline).toBe("¿Cómo son las notas?");
    expect(item.tables.map((table) => table.title)).toEqual([
      "Bitácora de preparación",
      "Lista de evaluación",
    ]);
    // Recorre la app entera con userEvent: con toda la suite en paralelo pasa de 5 s.
  }, 20_000);

  it("la guía se minimiza a un botón y vuelve en la misma fase", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Workspace />);

    await user.click(screen.getByRole("button", { name: "Guíame paso a paso" }));
    await user.click(screen.getByRole("button", { name: "Fase 3: Preparación" }));
    await user.click(screen.getByRole("button", { name: "Minimizar la guía" }));
    expect(screen.queryByRole("complementary", { name: "Modo guiado" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tu guía · fase 3 de 6/ }));
    expect(screen.getByRole("complementary", { name: "Modo guiado" })).toBeInTheDocument();
    expect(screen.getByText(/Fase 3 de 6: Preparación/)).toBeInTheDocument();
  });

  it("en Modelado abre la herramienta de la pregunta y la Evaluación no la cierra", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Workspace />);

    await user.click(screen.getByRole("button", { name: "Guíame paso a paso" }));
    await user.click(screen.getByRole("radio", { name: /Comparar grupos/ }));
    await user.click(screen.getByRole("button", { name: "Usar datos de ejemplo" }));
    await user.click(screen.getByRole("button", { name: "Fase 4: Modelado" }));

    const heading = { level: 1, name: "¿Es real la diferencia o pudo ser casualidad?" } as const;
    expect(screen.getByRole("heading", heading)).toBeInTheDocument();
    expect(window.location.hash).toBe("#analizar/probar");
    expect(
      screen.getByRole("button", { name: "Estás en: Pruebas de hipótesis" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Siguiente: Evaluación/ }));
    expect(screen.getByRole("heading", heading)).toBeInTheDocument();
    expect(screen.getByText(/Leí el valor p junto con el tamaño del efecto/)).toBeInTheDocument();
  }, 20_000);
});
