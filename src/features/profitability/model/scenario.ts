/**
 * Formulario de un escenario de «¿Es rentable?» (RF-57). Todo es texto tal
 * como lo escribe la persona; `toCashFlowInput` lo convierte y dice qué falta.
 */
import { readNumber } from "@/components/shared/form-fields";
import type { CashFlowInput, CostKind, LoanKind } from "@/core/finance";

export interface AssetForm {
  readonly name: string;
  readonly value: string;
  readonly year: string;
  readonly life: string;
  readonly salvage: string;
}

export interface CostForm {
  readonly name: string;
  readonly kind: CostKind;
  /** Pesos, o porcentaje de los ingresos (10 = 10 %). */
  readonly amount: string;
}

export interface LoanForm {
  readonly name: string;
  readonly kind: LoanKind;
  readonly amount: string;
  readonly rate: string;
  readonly term: string;
}

export interface ScenarioForm {
  readonly years: string;
  /** Año calendario del año 0, solo para rotular columnas. */
  readonly startYear: string;
  /** Unidades de los años 1..N (se ajusta al cambiar el horizonte). */
  readonly demand: readonly string[];
  /** Ventas históricas, separadas por espacios, comas o punto y coma. */
  readonly history: string;
  /** Año calendario del último dato histórico. */
  readonly historyLastYear: string;
  readonly price: string;
  readonly priceGrowth: string;
  readonly costs: readonly CostForm[];
  readonly costGrowth: string;
  readonly workingCapital: string;
  readonly taxRate: string;
  readonly gainTaxRate: string;
  readonly discountRate: string;
  readonly assets: readonly AssetForm[];
  readonly loans: readonly LoanForm[];
}

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly form: ScenarioForm;
}

/** Ejemplo de clase: ampliación de planta de Café Cordillera S.A. (Pereira). */
export const CAFE_FORM: ScenarioForm = {
  years: "5",
  startYear: "2026",
  demand: ["63900", "67900", "71900", "75900", "79900"],
  history: "40000; 44000; 47500; 52000; 56000",
  historyLastYear: "2025",
  price: "12.000",
  priceGrowth: "0",
  costs: [
    { name: "Costos fijos", kind: "fijo", amount: "230.000.000" },
    { name: "Costo variable por unidad", kind: "por-unidad", amount: "7.500" },
  ],
  costGrowth: "0",
  workingCapital: "20.000.000",
  taxRate: "35",
  gainTaxRate: "15",
  discountRate: "20",
  assets: [
    {
      name: "Maquinaria (tostadora y empacadora)",
      value: "150.000.000",
      year: "0",
      life: "10",
      salvage: "90.000.000",
    },
    { name: "Adecuación de la planta", value: "30.000.000", year: "0", life: "5", salvage: "0" },
  ],
  loans: [
    { name: "Préstamo del banco", kind: "cuota-fija", amount: "80.000.000", rate: "14", term: "4" },
    {
      name: "Préstamo de los socios",
      kind: "capitalizable",
      amount: "50.000.000",
      rate: "10",
      term: "5",
    },
    {
      name: "Aporte de capital",
      kind: "capitalizable",
      amount: "70.000.000",
      rate: "20",
      term: "5",
    },
  ],
};

const fixed = (name: string, amount: string): CostForm => ({ name, kind: "fijo", amount });
const perUnit = (name: string, amount: string): CostForm => ({ name, kind: "por-unidad", amount });

/**
 * Ejemplo del prompt de evaluación de proyectos: 10 vehículos de transporte
 * turístico privado en Pereira, flujo libre sin deuda, 10 años al 10 %. Las
 * cifras son referenciales para mostrar el modelo; se ajustan con datos reales.
 * Unidades = servicios al año = 10 vehículos × 60 servicios al mes × 12 × 70 % de uso.
 */
export const TRANSPORT_FORM: ScenarioForm = {
  years: "10",
  startYear: "2026",
  demand: growDemand(5040, 0.03, 10).map(String),
  history: "",
  historyLastYear: "2025",
  price: "250.000",
  priceGrowth: "4",
  costs: [
    perUnit("Combustible por servicio", "24.000"),
    perUnit("Mantenimiento variable por servicio", "6.000"),
    perUnit("Limpieza por servicio", "5.000"),
    perUnit("Peajes y parqueaderos por servicio", "12.000"),
    { name: "Comisiones de agencias y plataformas", kind: "porcentaje", amount: "10" },
    fixed("Nómina de conductores con prestaciones", "419.520.000"),
    fixed("Coordinador operativo", "72.960.000"),
    fixed("Seguros todo riesgo", "45.000.000"),
    fixed("SOAT", "11.000.000"),
    fixed("Mantenimiento preventivo", "24.000.000"),
    fixed("Parqueadero", "30.000.000"),
    fixed("Plataforma de reservas y software", "12.000.000"),
    fixed("Publicidad y marketing", "36.000.000"),
    fixed("Contabilidad, administración y comunicaciones", "30.000.000"),
    fixed("Otros gastos fijos", "12.000.000"),
  ],
  costGrowth: "4",
  workingCapital: "60.000.000",
  taxRate: "35",
  gainTaxRate: "15",
  discountRate: "10",
  assets: [
    {
      name: "10 vehículos SUV nuevos",
      value: "980.000.000",
      year: "0",
      life: "10",
      salvage: "294.000.000",
    },
    {
      name: "Matrícula, accesorios, GPS e imagen",
      value: "80.000.000",
      year: "0",
      life: "5",
      salvage: "0",
    },
    {
      name: "Puesta en marcha (legales, habilitación, plataforma)",
      value: "40.000.000",
      year: "0",
      life: "5",
      salvage: "0",
    },
  ],
  loans: [],
};

export const EXAMPLES = [
  { id: "cafe", label: "Café Cordillera (clase)", form: CAFE_FORM },
  { id: "transporte", label: "Transporte turístico (10 vehículos)", form: TRANSPORT_FORM },
] as const;

export type ExampleId = (typeof EXAMPLES)[number]["id"];

export const EMPTY_COST: CostForm = { name: "", kind: "fijo", amount: "" };
export const EMPTY_ASSET: AssetForm = { name: "", value: "", year: "0", life: "", salvage: "0" };
export const EMPTY_LOAN: LoanForm = {
  name: "",
  kind: "cuota-fija",
  amount: "",
  rate: "",
  term: "",
};

/** Ajusta la demanda a `years` años: recorta o repite la última cifra. */
export function resizeDemand(demand: readonly string[], years: number): string[] {
  if (!Number.isInteger(years) || years < 1) return [...demand];
  const last = demand.at(-1) ?? "";
  return Array.from({ length: Math.min(years, 50) }, (_, index) => demand[index] ?? last);
}

/** Demanda que crece a una tasa fija desde las unidades del año 1, redondeada. */
export function growDemand(first: number, growth: number, years: number): number[] {
  return Array.from({ length: years }, (_, index) => Math.round(first * (1 + growth) ** index));
}

/** Lee la lista de ventas históricas; `null` si algún dato no es un número. */
export function parseHistory(text: string): number[] | null {
  const parts = text.split(/[\s;]+/).filter((part) => part.length > 0);
  const values = parts.map(readNumber);
  return values.every((value): value is number => value !== null) ? values : null;
}

type Read = (text: string, label: string) => number;

/** Convierte el formulario; devuelve el texto del primer campo que no es un número. */
export function toCashFlowInput(form: ScenarioForm): CashFlowInput | string {
  let missing: string | null = null;
  const read: Read = (text, label) => {
    const value = readNumber(text);
    if (value === null && missing === null) missing = label;
    return value ?? Number.NaN;
  };
  const pct: Read = (text, label) => read(text, label) / 100;

  const input: CashFlowInput = {
    years: read(form.years, "Horizonte"),
    demand: form.demand.map((text, index) => read(text, `Unidades del año ${index + 1}`)),
    price: read(form.price, "Precio de venta"),
    priceGrowth: pct(form.priceGrowth, "Crecimiento del precio"),
    costs: form.costs.map((cost, index) => {
      const name = cost.name.trim() || `Rubro ${index + 1}`;
      const label = `Monto de ${name}`;
      return {
        name,
        kind: cost.kind,
        amount: cost.kind === "porcentaje" ? pct(cost.amount, label) : read(cost.amount, label),
      };
    }),
    costGrowth: pct(form.costGrowth, "Crecimiento de los costos"),
    workingCapital: read(form.workingCapital, "Capital de trabajo"),
    taxRate: pct(form.taxRate, "Impuesto de renta"),
    gainTaxRate: pct(form.gainTaxRate, "Impuesto de ganancia ocasional"),
    discountRate: pct(form.discountRate, "Tasa de oportunidad"),
    assets: form.assets.map((asset, index) => {
      const name = asset.name.trim() || `Activo ${index + 1}`;
      return {
        name,
        value: read(asset.value, `Valor de ${name}`),
        year: read(asset.year, `Año de compra de ${name}`),
        life: read(asset.life, `Vida útil de ${name}`),
        salvage: read(asset.salvage, `Valor comercial de ${name}`),
      };
    }),
    loans: form.loans.map((loan, index) => {
      const name = loan.name.trim() || `Préstamo ${index + 1}`;
      return {
        name,
        kind: loan.kind,
        amount: read(loan.amount, `Monto de ${name}`),
        rate: pct(loan.rate, `Tasa de ${name}`),
        term: read(loan.term, `Plazo de ${name}`),
      };
    }),
  };
  return missing === null ? input : `Escribe un número en «${missing}».`;
}
