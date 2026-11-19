import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CAFE_FORM, toCashFlowInput } from "../model/scenario";
import { useScenariosStore } from "../store/scenarios-store";
import { ProfitabilityPanel } from "./profitability-panel";

const initial = useScenariosStore.getState();

describe("ProfitabilityPanel", () => {
  beforeEach(() => useScenariosStore.setState(initial, true));

  it("arranca con el ejemplo de clase y da el VPN y la TIR del Excel del profesor", () => {
    render(<ProfitabilityPanel />);
    expect(
      screen.getByText(/^No se recomienda: a una tasa de oportunidad del 20,00 %/),
    ).toBeTruthy();
    expect(screen.getAllByText("−$28.358.292").length).toBeGreaterThan(0);
    expect(screen.getAllByText("15,06 %").length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole("complementary", { name: "Resumen del escenario" })).getByText(
        "Rechazar o rediseñar",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("table", { name: "Flujo de caja proyectado por año" })).toBeTruthy();
  });

  it("compara escenarios: el duplicado con mejor precio queda como el recomendado", () => {
    render(<ProfitabilityPanel />);
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
    render(<ProfitabilityPanel />);
    fireEvent.change(screen.getAllByLabelText("Monto del año 1 ($)")[0]!, {
      target: { value: "" },
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "Escribe un número en «Monto de Costos fijos».",
    );
  });

  it("carga el ejemplo de transporte turístico: sin deuda, 10 años al 10 %", () => {
    render(<ProfitabilityPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Transporte turístico/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/a una tasa (de oportunidad )?del 10,00 %/)).toBeTruthy();
    const table = screen.getByRole("table", { name: "Flujo de caja proyectado por año" });
    expect(within(table).getByText("(−) Comisiones de agencias y plataformas")).toBeTruthy();
    expect(within(table).getByText("Año 10 (2036)")).toBeTruthy();
  });

  it("llena la demanda con una tasa de crecimiento", () => {
    render(<ProfitabilityPanel />);
    fireEvent.change(screen.getByLabelText(/Unidades, año 1/), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Crecimiento anual de la demanda (%)"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Llenar desde el año 1/ }));
    expect((screen.getByLabelText(/Unidades, año 3/) as HTMLInputElement).value).toBe("1210");
  });

  it("proyecta la demanda desde las ventas históricas", () => {
    render(<ProfitabilityPanel />);
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
    expect(input.discountRate).toBe(0.2);
    expect(input.loans[0]?.rate).toBe(0.14);
    expect(input.assets[0]?.value).toBe(150_000_000);
  });
});
