import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CAFE_FORM, toCashFlowInput } from "../model/scenario";
import { useScenariosStore } from "../store/scenarios-store";
import { ProfitabilityPanel } from "./profitability-panel";

const initial = useScenariosStore.getState();

/** Renderiza el panel y carga un ejemplo (por defecto, Café Cordillera). */
function renderWith(example: RegExp = /Café Cordillera/): void {
  render(<ProfitabilityPanel />);
  fireEvent.click(screen.getByRole("button", { name: example }));
}

describe("ProfitabilityPanel", () => {
  beforeEach(() => useScenariosStore.setState(initial, true));

  it("arranca en blanco, sin ningún caso cargado", () => {
    render(<ProfitabilityPanel />);
    expect(screen.getByRole("alert").textContent).toBe(
      "Escribe un número en «Unidades del año 1».",
    );
    expect(
      (screen.getByLabelText("Precio de venta por unidad ($)") as HTMLInputElement).value,
    ).toBe("");
    expect(screen.queryByRole("table", { name: "Flujo de caja proyectado por año" })).toBeNull();
  });

  it("Confecciones Otún: da el WACC, el flujo del proyecto y el de los socios del Excel", () => {
    renderWith(/Confecciones Otún/);
    expect(screen.queryByRole("alert")).toBeNull();
    const summary = within(screen.getByRole("complementary", { name: "Resumen del escenario" }));
    expect(summary.getByText("13,54 %")).toBeTruthy();
    expect(summary.getByText("$174.220.715")).toBeTruthy();
    expect(summary.getByText("32,16 %")).toBeTruthy();
    expect(summary.getByText("$126.110.063")).toBeTruthy();
    expect(summary.getByText("55,39 %")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Fuentes de financiación y WACC" })).toBeTruthy();
    const investor = screen.getByRole("table", {
      name: "Flujo de caja del inversionista por año",
    });
    expect(within(investor).getByText("(−) Abono a capital")).toBeTruthy();
    expect(within(investor).getAllByText("−$90.000.000").length).toBeGreaterThan(0);
  });

  it("compara escenarios: el duplicado con mejor precio queda como el recomendado", () => {
    renderWith();
    fireEvent.change(screen.getByLabelText("Precio de venta por unidad ($)"), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Duplicar como nuevo escenario/ }));
    fireEvent.change(screen.getByLabelText("Nombre del escenario"), {
      target: { value: "Precio alto" },
    });
    fireEvent.change(screen.getByLabelText("Precio de venta por unidad ($)"), {
      target: { value: "14000" },
    });
    const comparison = screen.getByRole("table", { name: "Indicadores de cada escenario" });
    expect(within(comparison).getByText(/^(Aceptar|Revisar supuestos)$/)).toBeTruthy();
    expect(screen.getByText(/mayor VPN positivo es «Precio alto»/)).toBeTruthy();
  });

  it("dice qué campo falta en vez de calcular con datos a medias", () => {
    renderWith();
    fireEvent.change(screen.getAllByLabelText("Monto del año 1 ($)")[0]!, {
      target: { value: "" },
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "Escribe un número en «Monto de Costos fijos».",
    );
  });

  it("carga el ejemplo de transporte turístico: sin deuda, 10 años al 10 %", () => {
    renderWith(/Transporte turístico/);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByText(/tu tasa de oportunidad del 10,00 %/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("table", { name: "Fuentes de financiación y WACC" })).toBeNull();
    const table = screen.getByRole("table", { name: "Flujo de caja proyectado por año" });
    expect(within(table).getByText("(−) Comisiones de agencias y plataformas")).toBeTruthy();
    expect(within(table).getByText("Año 10 (2036)")).toBeTruthy();
  });

  it("llena la demanda con una tasa de crecimiento", () => {
    renderWith();
    fireEvent.change(screen.getByLabelText(/Unidades, año 1/), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Crecimiento anual de la demanda (%)"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Llenar desde el año 1/ }));
    expect((screen.getByLabelText(/Unidades, año 3/) as HTMLInputElement).value).toBe("1210");
  });

  it("los avisos del formulario no pasan de un escenario a otro", () => {
    renderWith();
    fireEvent.click(screen.getByRole("button", { name: /Proyectar/ }));
    expect(screen.getByText(/^Listo: se proyectaron/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Duplicar como nuevo escenario/ }));
    expect(screen.queryByText(/^Listo: se proyectaron/)).toBeNull();
  });

  it("avisa cuando faltan años entre el último dato y el proyecto", () => {
    renderWith();
    fireEvent.change(screen.getByLabelText("Último año con datos"), { target: { value: "2020" } });
    fireEvent.click(screen.getByRole("button", { name: /Proyectar/ }));
    expect(screen.getByText(/hay 6 años sin datos/)).toBeTruthy();
  });

  it("los años se eligen de una lista y los montos no aceptan letras", () => {
    render(<ProfitabilityPanel />);
    expect(screen.getByRole("combobox", { name: "Año 0 (año calendario)" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Horizonte" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Último año con datos" })).toBeTruthy();
    const tio = screen.getByLabelText(
      "Rentabilidad exigida por los socios, TIO (%)",
    ) as HTMLInputElement;
    fireEvent.change(tio, { target: { value: "-1a2,5%" } });
    expect(tio.value).toBe("12,5");
  });

  it("al mover el año 0 antes del último dato, el último dato se ajusta", () => {
    render(<ProfitabilityPanel />);
    fireEvent.change(screen.getByLabelText("Año 0 (año calendario)"), {
      target: { value: "2020" },
    });
    const form = useScenariosStore.getState().scenarios[0]!.form;
    expect(form.startYear).toBe("2020");
    expect(form.historyLastYear).toBe("2020");
  });

  it("proyecta la demanda desde las ventas históricas", () => {
    renderWith();
    fireEvent.change(screen.getByLabelText(/Unidades, año 1/), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Proyectar/ }));
    expect((screen.getByLabelText(/Unidades, año 1/) as HTMLInputElement).value).toBe("63900");
  });
});

describe("toCashFlowInput", () => {
  it("convierte porcentajes y montos del ejemplo", () => {
    const input = toCashFlowInput(CAFE_FORM);
    expect(typeof input).not.toBe("string");
    if (typeof input === "string") return;
    expect(input.equityRate).toBe(0.2);
    expect(input.loans[0]?.rate).toBe(0.14);
    expect(input.assets[0]?.value).toBe(150_000_000);
  });
});
