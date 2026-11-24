import { describe, expect, it } from "vitest";

import { projectCashFlow, type CashFlowInput } from "@/core/finance";
import type { WorkbookCell, WorkbookSheet } from "@/infrastructure/export";

import { CAFE_FORM, TRANSPORT_FORM, toCashFlowInput, type ScenarioForm } from "../model/scenario";
import { buildProjectWorkbook } from "./project-workbook";

function workbook(form: ScenarioForm, patch: Partial<CashFlowInput> = {}): WorkbookSheet[] {
  const parsed = toCashFlowInput(form);
  if (typeof parsed === "string") throw new Error(parsed);
  const input = { ...parsed, ...patch };
  return buildProjectWorkbook({ name: "Prueba", form, input, result: projectCashFlow(input) });
}

const sheet = (book: WorkbookSheet[], name: string): WorkbookSheet => {
  const found = book.find((entry) => entry.name === name);
  if (found === undefined) throw new Error(`Falta la hoja ${name}`);
  return found;
};

/** Fila cuya primera celda es `label`. */
const row = (target: WorkbookSheet, label: string) =>
  target.rows.find((cells) => {
    const head = cells[0];
    return head === label || (typeof head === "object" && head?.value === label);
  });

const formulaOf = (entry: unknown): string | undefined => (entry as WorkbookCell | null)?.formula;

describe("buildProjectWorkbook", () => {
  it("tiene las hojas del prompt, en orden", () => {
    expect(workbook(CAFE_FORM).map((entry) => entry.name)).toEqual([
      "Resumen",
      "Supuestos",
      "Flujo",
      "Inversionista",
      "Data histórica",
      "Fuentes",
      "Control de calidad",
    ]);
  });

  it("calcula los indicadores con fórmulas sobre la fila del flujo", () => {
    const book = workbook(CAFE_FORM);
    const resumen = sheet(book, "Resumen");
    expect(formulaOf(row(resumen, "VPN")?.[1])).toMatch(
      /^NPV\(Supuestos!\$B\$\d+,Flujo!\$C\$\d+:\$G\$\d+\)\+Flujo!\$B\$\d+$/,
    );
    expect(formulaOf(row(resumen, "TIR")?.[1])).toMatch(/IRR\(Flujo!\$B\$\d+:\$G\$\d+\)/);
    expect(formulaOf(row(resumen, "Decisión")?.[1])).toContain("Revisar supuestos");
    // Préstamo de cuota fija como IPMT; capitalizable con interés compuesto.
    const inversionista = sheet(book, "Inversionista");
    expect(formulaOf(row(inversionista, "Intereses · Préstamo del banco")?.[2])).toContain("IPMT(");
    expect(formulaOf(row(inversionista, "Intereses · Préstamo de los socios")?.[2])).toMatch(
      /\^\(C\$4-1\)/,
    );
    expect(formulaOf(row(inversionista, "Abono a capital · Préstamo del banco")?.[2])).toContain(
      "PMT(",
    );
    expect(formulaOf(row(resumen, "VPN de los socios")?.[1])).toMatch(/^NPV\(Supuestos!/);
    // Intereses y abonos van intercalados por préstamo: se suman uno por uno, no por rango.
    expect(formulaOf(row(inversionista, "(−) Intereses")?.[2])).toMatch(/^C\d+\+C\d+$/);
    expect(formulaOf(row(inversionista, "(−) Abono a capital")?.[2])).toMatch(/^-\(C\d+\+C\d+\)$/);
    // El flujo del proyecto no lleva intereses.
    expect(row(sheet(book, "Flujo"), "(−) Intereses")).toBeUndefined();
  });

  it("separa costos variables y fijos, con un renglón por rubro", () => {
    const flujo = sheet(workbook(TRANSPORT_FORM), "Flujo");
    expect(formulaOf(row(flujo, "(−) Comisiones de agencias y plataformas")?.[3])).toMatch(
      /^Supuestos!\$B\$\d+\*D\d+$/,
    );
    expect(row(flujo, "Costos variables totales")).toBeDefined();
    expect(row(flujo, "Costos fijos totales")).toBeDefined();
    // Sin préstamos no hay hoja del inversionista.
    expect(workbook(TRANSPORT_FORM).some((entry) => entry.name === "Inversionista")).toBe(false);
  });

  it("aguanta proyectos sin activos, sin préstamos y de un año", () => {
    expect(() =>
      workbook(CAFE_FORM, { assets: [], loans: [], workingCapital: 1000 }),
    ).not.toThrow();
    expect(() =>
      workbook({ ...CAFE_FORM, years: "1", demand: ["100"] }, { years: 1, demand: [100] }),
    ).not.toThrow();
  });

  it("los supuestos editables van resaltados y el horizonte no", () => {
    const supuestos = sheet(workbook(CAFE_FORM), "Supuestos");
    expect(
      (row(supuestos, "Rentabilidad exigida por los socios (TIO)")?.[1] as WorkbookCell).style,
    ).toBe("input");
    expect(formulaOf(row(supuestos, "Costo de capital (WACC)")?.[1])).toMatch(/^SUM\(\$E\$/);
    expect((row(supuestos, "Horizonte de evaluación")?.[1] as WorkbookCell).style).toBeUndefined();
  });
});
