/**
 * Escenarios de «¿Es rentable?»: varios flujos de caja del mismo proyecto
 * (pesimista, base, optimista, otra inversión) para compararlos. Vive en
 * memoria durante la sesión, así que no se pierde al cambiar de zona.
 */
import { create } from "zustand";

import {
  emptyForm,
  EXAMPLES,
  resizeDemand,
  type ExampleId,
  type Scenario,
  type ScenarioForm,
} from "../model/scenario";

const MAX_SCENARIOS = 6;

interface ScenariosState {
  readonly scenarios: readonly Scenario[];
  readonly activeId: string;
  select: (id: string) => void;
  /** Copia el escenario activo como punto de partida del nuevo. */
  duplicate: () => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  patch: (patch: Partial<ScenarioForm>) => void;
  /** Reemplaza el escenario activo por un ejemplo. */
  loadExample: (id: ExampleId) => void;
}

let counter = 1;
const nextId = (): string => `escenario-${(counter += 1)}`;

// Arranca en blanco: los ejemplos se cargan a pedido.
const initial: Scenario = { id: "escenario-1", name: "Escenario base", form: emptyForm() };

export const useScenariosStore = create<ScenariosState>((set, get) => ({
  scenarios: [initial],
  activeId: initial.id,

  select: (id) => set({ activeId: id }),

  duplicate: () => {
    const { scenarios, activeId } = get();
    if (scenarios.length >= MAX_SCENARIOS) return;
    const source = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0];
    if (source === undefined) return;
    const copy: Scenario = {
      id: nextId(),
      name: `Escenario ${scenarios.length + 1}`,
      form: source.form,
    };
    set({ scenarios: [...scenarios, copy], activeId: copy.id });
  },

  remove: (id) => {
    const { scenarios, activeId } = get();
    if (scenarios.length <= 1) return;
    const rest = scenarios.filter((scenario) => scenario.id !== id);
    set({ scenarios: rest, activeId: activeId === id ? (rest[0]?.id ?? "") : activeId });
  },

  rename: (id, name) =>
    set((state) => ({
      scenarios: state.scenarios.map((scenario) =>
        scenario.id === id ? { ...scenario, name } : scenario,
      ),
    })),

  patch: (patch) =>
    set((state) => ({
      scenarios: state.scenarios.map((scenario) => {
        if (scenario.id !== state.activeId) return scenario;
        const form = { ...scenario.form, ...patch };
        // El horizonte manda sobre cuántos años de demanda hay.
        const years = Number(form.years);
        return { ...scenario, form: { ...form, demand: resizeDemand(form.demand, years) } };
      }),
    })),

  loadExample: (id) => {
    const example = EXAMPLES.find((entry) => entry.id === id);
    if (example === undefined) return;
    set((state) => ({
      scenarios: state.scenarios.map((scenario) =>
        scenario.id === state.activeId ? { ...scenario, form: example.form } : scenario,
      ),
    }));
  },
}));

export { MAX_SCENARIOS };
