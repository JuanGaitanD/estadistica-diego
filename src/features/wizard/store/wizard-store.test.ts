import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_CALCULATION } from "../model/types";
import { useWizardStore } from "./wizard-store";

function reset(): void {
  useWizardStore.getState().reset();
  window.localStorage.clear();
}

describe("wizard-store", () => {
  beforeEach(reset);

  it("no deja avanzar del paso 1 sin datos y explica por qué", () => {
    const validation = useWizardStore.getState().canProceed(0);
    expect(validation.ok).toBe(false);
    expect(validation.ok === false && validation.message).toContain("Todavía no hay datos");
    expect(useWizardStore.getState().zoneBlockedReason("explorar")).toContain(
      "Todavía no hay datos",
    );
    useWizardStore.getState().goToZone("explorar");
    expect(useWizardStore.getState().zone).toBe("datos");
  });

  it("importa los datos de ejemplo y deja avanzar", () => {
    useWizardStore.getState().importSample();
    const state = useWizardStore.getState();
    expect(state.dataset?.rowCount).toBe(24);
    expect(state.columns).toHaveLength(4);
    expect(state.canProceed(0).ok).toBe(true);
    state.goToZone("explorar");
    expect(useWizardStore.getState().zone).toBe("explorar");
  });

  it("marca error de importación cuando el texto está vacío", () => {
    useWizardStore.getState().importText("   ");
    expect(useWizardStore.getState().importError).not.toBeNull();
  });

  it("exige al menos una columna incluida en el paso 2", () => {
    useWizardStore.getState().importSample();
    for (const column of useWizardStore.getState().columns) {
      useWizardStore.getState().toggleColumn(column.id, false);
    }
    const validation = useWizardStore.getState().canProceed(1);
    expect(validation.ok).toBe(false);
    expect(validation.ok === false && validation.message).toContain("al menos una columna");
  });

  it("pide un orden de categorías a las variables ordinales", () => {
    useWizardStore.getState().importText("Nivel\nalto");
    const first = useWizardStore.getState().columns[0];
    expect(first).toBeDefined();
    useWizardStore.getState().setColumnKind(first?.id ?? "", "ordinal");
    const validation = useWizardStore.getState().canProceed(1);
    expect(validation.ok).toBe(false);
    expect(validation.ok === false && validation.message).toContain("ordinal");
  });

  it("reordena las categorías de una variable ordinal", () => {
    useWizardStore.getState().importText("Nivel\nbajo\nalto\nmedio");
    const id = useWizardStore.getState().columns[0]?.id ?? "";
    expect(useWizardStore.getState().columns[0]?.categoryOrder).toEqual(["bajo", "alto", "medio"]);
    useWizardStore.getState().moveCategory(id, 2, -1);
    expect(useWizardStore.getState().columns[0]?.categoryOrder).toEqual(["bajo", "medio", "alto"]);
  });

  it("exige elegir al menos un cálculo en el paso 3", () => {
    useWizardStore.getState().importSample();
    useWizardStore.setState({ calculation: DEFAULT_CALCULATION });
    useWizardStore.getState().patchCalculation({ frequencies: false });
    const validation = useWizardStore.getState().canProceed(2);
    expect(validation.ok).toBe(false);
    expect(validation.ok === false && validation.message).toContain("ningún cálculo");
  });

  it("rechaza percentiles mal escritos", () => {
    useWizardStore.getState().importSample();
    useWizardStore.getState().patchCalculation({ percentiles: true, percentilesText: "abc" });
    const validation = useWizardStore.getState().canProceed(2);
    expect(validation.ok).toBe(false);
    expect(validation.ok === false && validation.message).toContain("percentil");
  });

  it("pide la columna de pesos cuando se marca el promedio ponderado", () => {
    useWizardStore.getState().importSample();
    useWizardStore.getState().patchCalculation({ weighted: true });
    const validation = useWizardStore.getState().canProceed(2);
    expect(validation.ok).toBe(false);
    expect(validation.ok === false && validation.message).toContain("pesos");
  });

  it('"Seleccionar lo habitual" marca el paquete de siempre y sus gráficas', () => {
    useWizardStore.getState().importSample();
    useWizardStore.getState().selectUsual();
    const calculation = useWizardStore.getState().calculation;
    expect(calculation.frequencies).toBe(true);
    expect(calculation.mode).toBe(true);
    expect(calculation.median).toBe(true);
    expect(calculation.arithmetic).toBe(true);
    expect(calculation.quartiles).toBe(true);
    expect(calculation.standardDeviation).toBe(true);
    expect(calculation.grouped).toBe(true);
    expect(useWizardStore.getState().canProceed(2).ok).toBe(true);
    const generoId =
      useWizardStore.getState().columns.find((column) => column.name === "Genero")?.id ?? "";
    expect(calculation.charts[generoId]).toContain("pie");
  });

  it("calcula el resultado y lo memoiza por petición", () => {
    useWizardStore.getState().importSample();
    useWizardStore.getState().selectUsual();
    useWizardStore.getState().computeResult();
    const first = useWizardStore.getState().result;
    expect(first).not.toBeNull();
    useWizardStore.getState().computeResult();
    expect(useWizardStore.getState().result).toBe(first);
  });

  it("recupera el último dataset guardado en el navegador", () => {
    // Datos propios: los de ejemplo no se guardan como «último análisis».
    useWizardStore.getState().importText("Edad\n20\n21\n22");
    const savedRows = useWizardStore.getState().dataset?.rowCount;
    useWizardStore.setState({ dataset: null, columns: [] });
    expect(useWizardStore.getState().recoverLastDataset()).toBe(true);
    expect(useWizardStore.getState().dataset?.rowCount).toBe(savedRows);
  });

  it("cambiar el tipo de una variable invalida el resultado anterior", () => {
    useWizardStore.getState().importSample();
    useWizardStore.getState().selectUsual();
    useWizardStore.getState().computeResult();
    expect(useWizardStore.getState().result).not.toBeNull();
    const id = useWizardStore.getState().columns[0]?.id ?? "";
    useWizardStore.getState().setColumnKind(id, "nominal");
    expect(useWizardStore.getState().result).toBeNull();
  });

  it("al cargar datos deja lista la selección habitual y la rehace al cambiar tipos", () => {
    useWizardStore.getState().importSample();
    const state = useWizardStore.getState();
    expect(state.calculationCustomized).toBe(false);
    expect(state.calculation.median).toBe(true);
    const nota = state.columns.find((column) => column.name === "Nota");
    useWizardStore.getState().setColumnKind(nota?.id ?? "", "nominal");
    expect(useWizardStore.getState().calculation.charts[nota?.id ?? ""]).toContain("pie");
  });

  it("respeta la selección ajustada a mano al cambiar tipos", () => {
    useWizardStore.getState().importSample();
    useWizardStore.getState().patchCalculation({ contingency: false });
    expect(useWizardStore.getState().calculationCustomized).toBe(true);
    const before = useWizardStore.getState().calculation;
    const first = useWizardStore.getState().columns[0];
    useWizardStore.getState().setColumnKind(first?.id ?? "", "nominal");
    expect(useWizardStore.getState().calculation).toBe(before);
  });
});

describe("datos de ejemplo y últimos datos guardados", () => {
  it("cargar el ejemplo no pisa los últimos datos propios", async () => {
    const { loadLastDataset } = await import("@/infrastructure/storage");
    window.localStorage.clear();
    useWizardStore.getState().reset();
    useWizardStore.getState().importText("Edad\n20\n21\n22");
    useWizardStore.getState().importSample();
    expect(loadLastDataset()?.columns[0]?.variable.name).toBe("Edad");
  });
});
