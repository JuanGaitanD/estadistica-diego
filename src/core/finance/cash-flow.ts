/**
 * «¿Es mi proyecto rentable?»: flujo de caja proyectado a N años (RF-57).
 *
 * Sigue la estructura que se enseña en evaluación de proyectos (caso de
 * referencia: «Café Cordillera», `cash-flow.test.ts`):
 *
 *   Ingresos (Q × P)
 * − Costos y gastos (cada rubro: fijo, por unidad × Q o % de los ingresos)
 * = Utilidad antes de depreciación
 * − Depreciación (línea recta: valor ÷ vida útil, por activo)
 * = Utilidad antes de intereses e impuestos
 * − Intereses (suma de los préstamos del año)
 * = Utilidad antes de impuestos
 * − Impuesto de renta (cero si hay pérdida)
 * = Utilidad neta
 * + Depreciación (no fue salida de dinero)
 * + Flujo de venta de activos (valor comercial − impuesto de ganancia ocasional)
 * + Recuperación del capital de trabajo (año N)
 * − Inversión (cada activo en el año en que se compra; capital de trabajo en el año 0)
 * = Flujo de caja
 *
 * Los préstamos solo restan sus intereses (no el desembolso ni el abono a
 * capital), como en la clase de referencia. Las inversiones pueden caer en
 * cualquier año: una máquina nueva en el año 3 entra como inversión ese año.
 */
import type { CalculationStep, Interpretation } from "../statistics/types";
import { formatValue } from "../statistics/interpretation/text";

export interface Asset {
  readonly name: string;
  /** Costo de compra. */
  readonly value: number;
  /** Año en que se compra (0 = antes de empezar a operar). */
  readonly year: number;
  /** Vida útil en años, para la depreciación en línea recta. */
  readonly life: number;
  /** Valor comercial: en cuánto se vende al final del horizonte (0 si no se vende). */
  readonly salvage: number;
}

/**
 * - `cuota-fija`: cuotas iguales (PAGO de Excel); interés sobre el saldo.
 * - `intereses-anuales`: se pagan los intereses cada año y el capital al final.
 * - `capitalizable`: no hay pagos; el interés se suma al saldo y todo se paga al
 *   final. Al flujo pasa el interés causado cada año (préstamo de socios y
 *   aporte de capital en la clase de referencia).
 */
export type LoanKind = "cuota-fija" | "intereses-anuales" | "capitalizable";

export const LOAN_KINDS: readonly { id: LoanKind; label: string }[] = [
  { id: "cuota-fija", label: "Cuota fija" },
  { id: "intereses-anuales", label: "Intereses cada año, capital al final" },
  { id: "capitalizable", label: "Todo al final (interés capitalizado)" },
];

/**
 * Un rubro de costos o gastos:
 * - `fijo`: monto del año 1 que no depende de Q (nómina, seguros, arriendo).
 * - `por-unidad`: costo por unidad vendida en el año 1 (combustible por servicio).
 * - `porcentaje`: proporción de los ingresos de cada año (comisiones).
 * Los dos primeros crecen con `costGrowth`; el porcentaje sigue a los ingresos.
 */
export type CostKind = "fijo" | "por-unidad" | "porcentaje";

export const COST_KINDS: readonly { id: CostKind; label: string }[] = [
  { id: "fijo", label: "Fijo por año" },
  { id: "por-unidad", label: "Por unidad vendida" },
  { id: "porcentaje", label: "% de los ingresos" },
];

export interface CostItem {
  readonly name: string;
  readonly kind: CostKind;
  /** Pesos (fijo o por unidad) o proporción de los ingresos (porcentaje). */
  readonly amount: number;
}

export interface Loan {
  readonly name: string;
  readonly kind: LoanKind;
  readonly amount: number;
  /** Tasa efectiva anual, proporción. */
  readonly rate: number;
  /** Plazo en años. */
  readonly term: number;
}

export interface CashFlowInput {
  /** Horizonte N en años, entero entre 1 y 50. */
  readonly years: number;
  /** Unidades vendidas en los años 1..N (largo N). */
  readonly demand: readonly number[];
  /** Precio de venta por unidad en el año 1. */
  readonly price: number;
  /** Crecimiento anual del precio (inflación), proporción; 0 = precios constantes. */
  readonly priceGrowth: number;
  readonly costs: readonly CostItem[];
  /** Crecimiento anual de los costos fijos y por unidad, proporción. */
  readonly costGrowth: number;
  readonly assets: readonly Asset[];
  /** Capital de trabajo: sale en el año 0 y se recupera en el año N. */
  readonly workingCapital: number;
  readonly loans: readonly Loan[];
  /** Impuesto de renta, proporción (Colombia: 0,35). */
  readonly taxRate: number;
  /** Impuesto de ganancia ocasional sobre la venta de activos (Colombia: 0,15). */
  readonly gainTaxRate: number;
  /** Tasa de oportunidad o TMAR con la que se descuenta, proporción. */
  readonly discountRate: number;
}

export interface CashFlowYear {
  readonly year: number;
  readonly units: number;
  readonly revenue: number;
  /** Cada rubro del año, en el orden de `input.costs`. */
  readonly costItems: readonly number[];
  readonly costs: number;
  readonly ebitda: number;
  readonly depreciation: number;
  readonly ebit: number;
  readonly interest: number;
  readonly taxableIncome: number;
  readonly taxes: number;
  readonly netIncome: number;
  readonly assetSale: number;
  readonly workingCapitalRecovery: number;
  /** Inversión del año, en negativo. */
  readonly investment: number;
  readonly netFlow: number;
  readonly presentValue: number;
  readonly cumulativePresentValue: number;
}

export interface LoanRow {
  readonly year: number;
  readonly payment: number;
  readonly interest: number;
  readonly amortization: number;
  readonly balance: number;
}

export interface AssetSale {
  readonly name: string;
  readonly accumulated: number;
  readonly bookValue: number;
  readonly salvage: number;
  readonly gain: number;
  readonly tax: number;
  readonly flow: number;
}

/** `revisar`: VPN positivo, pero la inversión tarda en volver más de dos tercios del horizonte. */
export type CashFlowVerdict = "rentable" | "revisar" | "indiferente" | "no-rentable";

export const VERDICT_LABELS: Record<CashFlowVerdict, string> = {
  rentable: "Aceptar",
  revisar: "Revisar supuestos",
  indiferente: "Indiferente",
  "no-rentable": "Rechazar o rediseñar",
};

export interface CashFlowResult {
  readonly rows: readonly CashFlowYear[];
  readonly loanSchedules: readonly (readonly LoanRow[])[];
  readonly assetSales: readonly AssetSale[];
  readonly npv: number;
  /** `null` si no hay tasa que haga el VPN cero en el rango −99 % a 1.000 %. */
  readonly irr: number | null;
  /** Años hasta recuperar la inversión sin descontar, o `null` si no se recupera. */
  readonly payback: number | null;
  /** Años hasta recuperarla en pesos de hoy, o `null` si no se recupera. */
  readonly discountedPayback: number | null;
  /** VP de los flujos positivos / VP de los negativos, o `null` sin flujos negativos. */
  readonly benefitCost: number | null;
  /** Suma simple de los flujos, sin descontar. */
  readonly simpleSum: number;
  /** Promedios de los años 1..N. */
  readonly averageEbitda: number;
  readonly averageNetIncome: number;
  readonly averageFlow: number;
  /** EBITDA total ÷ ingresos totales, o `null` sin ingresos. */
  readonly ebitdaMargin: number | null;
  readonly multipleSignChanges: boolean;
  readonly hasLossYears: boolean;
  /** Algún préstamo dura más que el horizonte: sus intereses posteriores no entran. */
  readonly loansBeyondHorizon: boolean;
  readonly verdict: CashFlowVerdict;
}

export const MAX_YEARS = 50;

/** Motivo en español si los datos no sirven, o `null` si se puede calcular. */
export function validateCashFlowInput(input: CashFlowInput): string | null {
  const { years } = input;
  if (!Number.isInteger(years) || years < 1 || years > MAX_YEARS)
    return `El horizonte debe ser un número entero de años entre 1 y ${MAX_YEARS}.`;
  if (input.demand.length !== years) return `Escribe las unidades vendidas de los ${years} años.`;
  const scalars = [
    input.price,
    input.priceGrowth,
    ...input.costs.map((cost) => cost.amount),
    input.costGrowth,
    input.workingCapital,
    input.taxRate,
    input.gainTaxRate,
    input.discountRate,
  ];
  if ([...input.demand, ...scalars].some((value) => !Number.isFinite(value)))
    return "Revisa que todos los campos tengan un número.";
  if (
    [
      ...input.demand,
      input.price,
      ...input.costs.map((cost) => cost.amount),
      input.workingCapital,
    ].some((value) => value < 0)
  )
    return "Unidades, precio, costos y capital de trabajo no pueden ser negativos.";
  const share = input.costs.find((cost) => cost.kind === "porcentaje" && cost.amount >= 1);
  if (share !== undefined)
    return `«${share.name.trim() || "Un rubro"}» debe ser menor que el 100 % de los ingresos.`;
  if ([input.taxRate, input.gainTaxRate].some((rate) => rate < 0 || rate >= 1))
    return "Los impuestos deben estar entre 0 % y 99 %.";
  if ([input.discountRate, input.priceGrowth, input.costGrowth].some((rate) => rate <= -1))
    return "Las tasas no pueden ser de −100 % o menos.";
  for (const asset of input.assets) {
    const name = asset.name.trim() || "un activo";
    if (![asset.value, asset.year, asset.life, asset.salvage].every(Number.isFinite))
      return `Revisa los números de ${name}.`;
    if (asset.value <= 0) return `El valor de ${name} debe ser mayor que cero.`;
    if (asset.salvage < 0) return `El valor comercial de ${name} no puede ser negativo.`;
    if (!Number.isInteger(asset.year) || asset.year < 0 || asset.year > years)
      return `El año de compra de ${name} debe ser un entero entre 0 y ${years}.`;
    if (asset.life <= 0) return `La vida útil de ${name} debe ser mayor que cero.`;
  }
  for (const loan of input.loans) {
    const name = loan.name.trim() || "un préstamo";
    if (![loan.amount, loan.rate, loan.term].every(Number.isFinite))
      return `Revisa los números de ${name}.`;
    if (loan.amount <= 0) return `El monto de ${name} debe ser mayor que cero.`;
    if (loan.rate < 0) return `La tasa de ${name} no puede ser negativa.`;
    if (!Number.isInteger(loan.term) || loan.term < 1 || loan.term > MAX_YEARS)
      return `El plazo de ${name} debe ser un número entero de años entre 1 y ${MAX_YEARS}.`;
  }
  if (input.assets.length === 0 && input.workingCapital === 0)
    return "Agrega al menos un activo o un capital de trabajo: sin inversión no hay proyecto que evaluar.";
  return null;
}

/** Cuota fija de un préstamo, como `PAGO(tasa; n; −monto)` de Excel. */
export function fixedPayment(amount: number, rate: number, term: number): number {
  return rate === 0 ? amount / term : (amount * rate) / (1 - (1 + rate) ** -term);
}

/** Tabla de amortización, del año 0 (desembolso) al último pago. */
export function loanSchedule(loan: Loan): LoanRow[] {
  const rows: LoanRow[] = [
    { year: 0, payment: 0, interest: 0, amortization: 0, balance: loan.amount },
  ];
  const payment = fixedPayment(loan.amount, loan.rate, loan.term);
  let balance = loan.amount;
  for (let year = 1; year <= loan.term; year += 1) {
    const last = year === loan.term;
    const interest = balance * loan.rate;
    let paid: number;
    let amortization: number;
    if (loan.kind === "cuota-fija") {
      amortization = last ? balance : payment - interest;
      paid = interest + amortization;
    } else if (loan.kind === "intereses-anuales") {
      amortization = last ? balance : 0;
      paid = interest + amortization;
    } else {
      // Capitalizable: el interés se suma al saldo y todo se paga en la última cuota.
      balance += interest;
      amortization = last ? balance : 0;
      paid = amortization;
    }
    balance -= amortization;
    rows.push({
      year,
      payment: paid,
      interest,
      amortization,
      balance: Math.abs(balance) < 1e-6 ? 0 : balance,
    });
  }
  return rows;
}

/** Valor presente neto de `flows` (el primero es el año 0) a la tasa `rate`. */
export function netPresentValue(rate: number, flows: readonly number[]): number {
  return flows.reduce((sum, flow, year) => sum + flow / (1 + rate) ** year, 0);
}

/**
 * Tasa interna de retorno: la tasa que hace cero el VPN. Recorre de −99 % a
 * 1.000 % buscando el primer cambio de signo y lo afina por bisección; con
 * flujos convencionales (un solo cambio de signo) la raíz es única, como `TIR`.
 */
export function internalRateOfReturn(flows: readonly number[]): number | null {
  // ponytail: rejilla fija de 0,5 puntos; dos raíces más juntas que eso se ven como una.
  let low = -0.99;
  let lowValue = netPresentValue(low, flows);
  for (let high = -0.985; high <= 10; high += 0.005) {
    const highValue = netPresentValue(high, flows);
    if (lowValue === 0) return low;
    if (Math.sign(lowValue) !== Math.sign(highValue)) {
      let a = low;
      let b = high;
      let fa = lowValue;
      for (let i = 0; i < 200 && b - a > 1e-12; i += 1) {
        const mid = (a + b) / 2;
        const fm = netPresentValue(mid, flows);
        if (Math.sign(fm) === Math.sign(fa)) {
          a = mid;
          fa = fm;
        } else b = mid;
      }
      return (a + b) / 2;
    }
    low = high;
    lowValue = highValue;
  }
  return null;
}

/** Años (con fracción) hasta que el acumulado deja de ser negativo, o `null`. */
function paybackOf(flows: readonly number[]): number | null {
  let cumulative = flows[0] ?? 0;
  if (cumulative >= 0) return 0;
  for (let year = 1; year < flows.length; year += 1) {
    const flow = flows[year] ?? 0;
    if (cumulative + flow >= 0) return year - 1 + -cumulative / flow;
    cumulative += flow;
  }
  return null;
}

function signChanges(flows: readonly number[]): number {
  const signs = flows.filter((flow) => flow !== 0).map(Math.sign);
  return signs.slice(1).filter((sign, index) => sign !== signs[index]).length;
}

/** Depreciación de un activo en el año `year`: desde el año siguiente a su compra y durante su vida útil. */
function depreciationIn(asset: Asset, year: number): number {
  return year > asset.year && year <= asset.year + asset.life ? asset.value / asset.life : 0;
}

/** Venta de cada activo al final del horizonte. */
function assetSalesAt(assets: readonly Asset[], years: number, gainTaxRate: number): AssetSale[] {
  return assets.map((asset) => {
    const accumulated = (asset.value / asset.life) * Math.min(asset.life, years - asset.year);
    const bookValue = asset.value - accumulated;
    const gain = asset.salvage - bookValue;
    // Vender por debajo del valor en libros no paga ganancia ocasional.
    const tax = Math.max(0, gain) * gainTaxRate;
    return {
      name: asset.name,
      accumulated,
      bookValue,
      salvage: asset.salvage,
      gain,
      tax,
      flow: asset.salvage - tax,
    };
  });
}

/** Proyecta el flujo de caja y calcula sus indicadores. Supone datos ya validados. */
export function projectCashFlow(input: CashFlowInput): CashFlowResult {
  const { years, assets, loans, taxRate, discountRate } = input;
  const loanSchedules = loans.map(loanSchedule);
  const assetSales = assetSalesAt(assets, years, input.gainTaxRate);
  const saleTotal = assetSales.reduce((sum, sale) => sum + sale.flow, 0);
  const rows: CashFlowYear[] = [];
  let cumulative = 0;

  for (let year = 0; year <= years; year += 1) {
    const operating = year > 0;
    const units = operating ? (input.demand[year - 1] ?? 0) : 0;
    const growth = Math.max(0, year - 1);
    const revenue = units * input.price * (1 + input.priceGrowth) ** growth;
    const inflation = (1 + input.costGrowth) ** growth;
    const costItems = input.costs.map((cost) => {
      if (!operating) return 0;
      if (cost.kind === "porcentaje") return cost.amount * revenue;
      return (cost.kind === "fijo" ? cost.amount : cost.amount * units) * inflation;
    });
    const costs = costItems.reduce((sum, cost) => sum + cost, 0);
    const ebitda = revenue - costs;
    const depreciation = assets.reduce((sum, asset) => sum + depreciationIn(asset, year), 0);
    const ebit = ebitda - depreciation;
    const interest = loanSchedules.reduce(
      (sum, schedule) => sum + (schedule[year]?.interest ?? 0),
      0,
    );
    const taxableIncome = ebit - interest;
    const taxes = Math.max(0, taxableIncome) * taxRate;
    const netIncome = taxableIncome - taxes;
    const assetSale = year === years ? saleTotal : 0;
    const workingCapitalRecovery = year === years ? input.workingCapital : 0;
    const investment =
      -assets.filter((asset) => asset.year === year).reduce((sum, asset) => sum + asset.value, 0) -
      (year === 0 ? input.workingCapital : 0);
    const netFlow = netIncome + depreciation + assetSale + workingCapitalRecovery + investment;
    const presentValue = netFlow / (1 + discountRate) ** year;
    cumulative += presentValue;
    rows.push({
      year,
      units,
      revenue,
      costItems,
      costs,
      ebitda,
      depreciation,
      ebit,
      interest,
      taxableIncome,
      taxes,
      netIncome,
      assetSale,
      workingCapitalRecovery,
      investment,
      netFlow,
      presentValue,
      cumulativePresentValue: cumulative,
    });
  }

  const flows = rows.map((row) => row.netFlow);
  const positives = rows.reduce((sum, row) => sum + Math.max(0, row.presentValue), 0);
  const negatives = rows.reduce((sum, row) => sum - Math.min(0, row.presentValue), 0);
  // VPN «cero» relativo al tamaño del proyecto: evita llamar rentable a un redondeo.
  const tolerance = 1e-9 * Math.max(1, negatives);
  const operating = rows.slice(1);
  const average = (pick: (row: CashFlowYear) => number): number =>
    operating.reduce((sum, row) => sum + pick(row), 0) / years;
  const totalRevenue = operating.reduce((sum, row) => sum + row.revenue, 0);
  const payback = paybackOf(flows);
  // «Demasiado largo frente al horizonte»: más de dos tercios de N.
  const longPayback = payback === null || payback > (2 * years) / 3;

  return {
    rows,
    loanSchedules,
    assetSales,
    npv: cumulative,
    irr: internalRateOfReturn(flows),
    payback,
    discountedPayback: paybackOf(rows.map((row) => row.presentValue)),
    benefitCost: negatives > 0 ? positives / negatives : null,
    simpleSum: flows.reduce((sum, flow) => sum + flow, 0),
    averageEbitda: average((row) => row.ebitda),
    averageNetIncome: average((row) => row.netIncome),
    averageFlow: average((row) => row.netFlow),
    ebitdaMargin:
      totalRevenue > 0 ? operating.reduce((sum, row) => sum + row.ebitda, 0) / totalRevenue : null,
    multipleSignChanges: signChanges(flows) > 1,
    hasLossYears: rows.some((row) => row.year > 0 && row.taxableIncome < 0),
    loansBeyondHorizon: loans.some((loan) => loan.term > years),
    verdict:
      Math.abs(cumulative) <= tolerance
        ? "indiferente"
        : cumulative > 0
          ? longPayback
            ? "revisar"
            : "rentable"
          : "no-rentable",
  };
}

/**
 * Proyecta la demanda con la recta de mínimos cuadrados sobre el tiempo, como
 * `TENDENCIA` o arrastrar la serie en Excel. Los k datos históricos son X = 1..k;
 * `gap` es cuántos años hay entre el último dato y el año 1 del proyecto (1 si
 * el año 1 sigue al último dato; 2 si en medio queda el año 0 de preinversión).
 * Devuelve `null` con menos de 2 datos.
 */
export function projectDemand(history: readonly number[], years: number, gap = 1): number[] | null {
  const k = history.length;
  if (k < 2 || history.some((value) => !Number.isFinite(value))) return null;
  const meanX = (k + 1) / 2;
  const meanY = history.reduce((sum, value) => sum + value, 0) / k;
  let sxy = 0;
  let sxx = 0;
  history.forEach((value, index) => {
    sxy += (index + 1 - meanX) * (value - meanY);
    sxx += (index + 1 - meanX) ** 2;
  });
  const b1 = sxy / sxx;
  const b0 = meanY - b1 * meanX;
  return Array.from({ length: years }, (_, index) =>
    Math.max(0, Math.round(b0 + b1 * (k + gap + index))),
  );
}

export interface CashFlowLine {
  readonly label: string;
  readonly values: readonly number[];
  readonly strong?: boolean;
  /** Unidades (no dinero). */
  readonly units?: boolean;
}

type Line = readonly [label: string, key: Exclude<keyof CashFlowYear, "costItems">, strong?: true];

const HEAD: readonly Line[] = [
  ["Unidades vendidas (Q)", "units"],
  ["Ingresos (Q × P)", "revenue"],
];
const TAIL: readonly Line[] = [
  ["(−) Costos y gastos totales", "costs"],
  ["Utilidad antes de depreciación (EBITDA)", "ebitda", true],
  ["(−) Depreciación", "depreciation"],
  ["Utilidad antes de intereses e impuestos (EBIT)", "ebit", true],
  ["(−) Intereses", "interest"],
  ["Utilidad antes de impuestos", "taxableIncome", true],
  ["(−) Impuesto de renta", "taxes"],
  ["Utilidad neta", "netIncome", true],
  ["(+) Depreciación", "depreciation"],
  ["(+) Flujo de venta de activos", "assetSale"],
  ["(+) Capital de trabajo", "workingCapitalRecovery"],
  ["(−) Inversión", "investment"],
  ["Flujo de caja", "netFlow", true],
  ["Valor presente", "presentValue"],
  ["Valor presente acumulado", "cumulativePresentValue"],
];

/** Filas de la tabla del flujo de caja, en el orden en que se leen, con un renglón por rubro de costo. */
export function cashFlowTable(input: CashFlowInput, result: CashFlowResult): CashFlowLine[] {
  const line = ([label, key, strong]: Line): CashFlowLine => ({
    label,
    values: result.rows.map((row) => row[key]),
    ...(strong === true ? { strong } : {}),
    ...(key === "units" ? { units: true } : {}),
  });
  return [
    ...HEAD.map(line),
    ...input.costs.map((cost, index) => ({
      label: `(−) ${cost.name.trim() || `Rubro ${index + 1}`}`,
      values: result.rows.map((row) => row.costItems[index] ?? 0),
    })),
    ...TAIL.map(line),
  ];
}

/** Dinero sin decimales, con signo menos tipográfico: `$1.250.000`, `−$300`. */
export function formatMoney(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "$0";
  return `${rounded < 0 ? "−" : ""}$${formatValue(Math.abs(rounded), 0)}`;
}

function percent(proportion: number): string {
  return `${formatValue(proportion * 100, 2)} %`;
}

function yearsText(value: number): string {
  return `${formatValue(value, 1)} años`;
}

/**
 * Lectura en llano (ADR-004) con los criterios de clase: el VPN dice si se
 * espera ganar más o menos que en la alternativa; la TIR, cuánto rinde la inversión.
 */
export function describeCashFlow(input: CashFlowInput, result: CashFlowResult): Interpretation {
  const tio = percent(input.discountRate);
  const headline =
    result.verdict === "revisar"
      ? `Revisar supuestos: el VPN es positivo (${formatMoney(result.npv)} a una tasa del ${tio}), pero ${
          result.payback !== null
            ? `la inversión tarda ${yearsText(result.payback)} en volver`
            : "la inversión no vuelve sin descontar"
        }, más de dos tercios de los ${input.years} años del horizonte. Un error pequeño en los supuestos puede volverlo no rentable.`
      : result.verdict === "rentable"
        ? `Se recomienda: a una tasa de oportunidad del ${tio}, se espera ganar más que en la alternativa. El proyecto deja ${formatMoney(result.npv)} de más en pesos de hoy (VPN positivo).`
        : result.verdict === "no-rentable"
          ? `No se recomienda: a una tasa de oportunidad del ${tio}, se espera ganar menos que en la alternativa. En pesos de hoy faltan ${formatMoney(-result.npv)} (VPN negativo).`
          : `Queda justo: se espera ganar lo mismo que en la alternativa del ${tio} (VPN de cero). La decisión depende de otras razones.`;

  const details: string[] = [];
  if (result.verdict === "no-rentable" && result.simpleSum > 0)
    details.push(
      `VPN negativo no quiere decir pérdida. Sin descontar, los flujos suman ${formatMoney(result.simpleSum)}: el proyecto gana dinero, pero menos de lo que exiges.`,
    );
  if (result.irr !== null) {
    const reading =
      result.irr < 0
        ? "Es negativa: el proyecto da pérdida"
        : result.irr > input.discountRate
          ? `Supera tu tasa del ${tio}: es rentable y se recomienda`
          : result.irr < input.discountRate
            ? `Es positiva, así que el proyecto es rentable, pero no alcanza tu tasa del ${tio}: no se recomienda`
            : `Es igual a tu tasa del ${tio}`;
    details.push(
      `La rentabilidad que genera la inversión (TIR) es ${percent(result.irr)} al año. ${reading}.`,
    );
  } else {
    details.push(
      "No hay una TIR que se pueda calcular con estos flujos: el VPN no llega a cero con ninguna tasa razonable.",
    );
  }
  details.push(
    result.payback !== null
      ? `Recuperación simple (payback): la inversión vuelve en ${yearsText(result.payback)}${
          result.discountedPayback !== null
            ? `; en pesos de hoy, en ${yearsText(result.discountedPayback)}`
            : "; en pesos de hoy no alcanza a volver dentro del horizonte"
        }.`
      : `La inversión no se recupera dentro de los ${input.years} años del horizonte.`,
  );
  if (result.ebitdaMargin !== null)
    details.push(
      `En promedio, cada año deja ${formatMoney(result.averageEbitda)} de EBITDA (margen del ${percent(result.ebitdaMargin)} sobre los ingresos), ${formatMoney(result.averageNetIncome)} de utilidad neta y ${formatMoney(result.averageFlow)} de flujo de caja.`,
    );
  if (result.benefitCost !== null)
    details.push(
      `Por cada peso que sale, en valor presente vuelven $${formatValue(result.benefitCost, 2)} (relación beneficio/costo).`,
    );

  const caveats = [
    "Es una proyección con valores fijos. El precio y la demanda pueden variar: arma escenarios (pesimista, optimista) y compáralos.",
  ];
  if (result.hasLossYears)
    caveats.push(
      "Hay años con pérdida. Ese año el impuesto de renta es cero y no genera saldo a favor.",
    );
  if (result.loansBeyondHorizon)
    caveats.push(
      "Algún préstamo dura más que el horizonte: sus intereses después del año N no entran en el flujo.",
    );
  if (result.multipleSignChanges)
    caveats.push(
      "Los flujos cambian de signo más de una vez: puede haber más de una TIR. Decide con el VPN.",
    );

  return { headline, details, caveats };
}

/** Letra de columna de Excel para un índice desde 0 (`0` → A, `26` → AA). */
function excelColumn(index: number): string {
  let name = "";
  for (let i = index + 1; i > 0; i = Math.floor((i - 1) / 26))
    name = String.fromCharCode(65 + ((i - 1) % 26)) + name;
  return name;
}

/** Paso a paso con los números del proyecto, para «Ver cómo se calculó». */
export function cashFlowSteps(input: CashFlowInput, result: CashFlowResult): CalculationStep[] {
  const n = input.years;
  const tio = formatValue(input.discountRate, 4);
  const last = excelColumn(n + 1); // El año 0 va en B; el año N, n columnas después.
  // Fila del flujo de caja si la tabla copiada se pega en A1 (encabezado en la fila 1).
  const row = cashFlowTable(input, result).findIndex((line) => line.label === "Flujo de caja") + 2;
  const steps: CalculationStep[] = [
    {
      title: "Ingresos, costos y gastos",
      text: "Los ingresos son las unidades vendidas por el precio. Cada rubro de costo es fijo (no depende de cuánto se venda), por unidad (se multiplica por Q) o un porcentaje de los ingresos, como una comisión.",
      formula: [
        `Ingresos = Q × ${formatMoney(input.price)}`,
        ...input.costs.map(
          (cost, index) =>
            `${cost.name.trim() || `Rubro ${index + 1}`} = ${
              cost.kind === "fijo"
                ? formatMoney(cost.amount)
                : cost.kind === "por-unidad"
                  ? `${formatMoney(cost.amount)} × Q`
                  : `${percent(cost.amount)} × Ingresos`
            }`,
        ),
      ].join("\n"),
    },
  ];
  if (input.assets.length > 0) {
    const first = input.assets[0];
    steps.push({
      title: "Depreciación en línea recta",
      text: "Cada activo pierde valor por su uso: su costo dividido por su vida útil, cada año desde el siguiente a su compra. Se resta antes de impuestos y luego se suma de vuelta, porque no es una salida de dinero.",
      table: {
        columns: ["Activo", "Valor", "Año de compra", "Vida útil", "Depreciación anual"],
        rows: input.assets.map((asset) => [
          asset.name,
          formatMoney(asset.value),
          String(asset.year),
          `${formatValue(asset.life, 0)} años`,
          formatMoney(asset.value / asset.life),
        ]),
      },
      ...(first !== undefined
        ? {
            excel: `=SLN(${formatValue(first.value, 0)}; 0; ${formatValue(first.life, 0)})`,
          }
        : {}),
    });
  }
  if (input.loans.length > 0) {
    const fixed = input.loans.find((loan) => loan.kind === "cuota-fija");
    steps.push({
      title: "Intereses de los préstamos",
      text: "Interés = tasa × saldo del año anterior. Con cuota fija, la amortización es la cuota menos el interés. Con interés capitalizado, el interés se suma al saldo y todo se paga al final. Al flujo pasa la suma de los intereses de cada año.",
      ...(fixed !== undefined
        ? {
            formula: `Cuota de ${fixed.name} = ${formatMoney(fixedPayment(fixed.amount, fixed.rate, fixed.term))}`,
            excel: `=PAGO(${formatValue(fixed.rate, 4)}; ${fixed.term}; -${formatValue(fixed.amount, 0)})`,
          }
        : {}),
    });
  }
  if (input.assets.length > 0)
    steps.push({
      title: "Flujo de venta de activos",
      text: "Valor en libros = costo − depreciación acumulada. Si el activo se vende por encima del valor en libros, la diferencia paga impuesto de ganancia ocasional. Entra el valor comercial menos ese impuesto.",
      table: {
        columns: ["Activo", "Valor comercial", "Valor en libros", "Utilidad", "Impuesto", "Flujo"],
        rows: result.assetSales.map((sale) => [
          sale.name,
          formatMoney(sale.salvage),
          formatMoney(sale.bookValue),
          formatMoney(sale.gain),
          formatMoney(sale.tax),
          formatMoney(sale.flow),
        ]),
      },
    });
  steps.push(
    {
      title: "Valor presente neto (VPN)",
      text: "Cada flujo se trae a pesos de hoy dividiéndolo por (1 + TIO) elevado al año, y se suman. En Excel, VNA va desde el año 1 y se le suma el año 0.",
      formula: `VPN = Σ Flujoₜ ÷ (1 + ${tio})ᵗ = ${formatMoney(result.npv)}`,
      excel: `=VNA(${tio}; C${row}:${last}${row}) + B${row}   (con la tabla copiada pegada en A1)`,
    },
    {
      title: "Tasa interna de retorno (TIR)",
      text: "Es la tasa con la que el VPN da exactamente cero: la rentabilidad que genera la inversión.",
      formula:
        result.irr !== null
          ? `VPN(TIR) = 0  →  TIR = ${percent(result.irr)}`
          : "No hay tasa entre −99 % y 1.000 % que haga cero el VPN.",
      excel: `=TIR(B${row}:${last}${row})`,
    },
  );
  return steps.map((step, index) => ({ ...step, title: `${index + 1}. ${step.title}` }));
}

/** Índice del escenario con VPN positivo más alto, o `null` si ninguno lo tiene. */
export function bestScenario(results: readonly (CashFlowResult | null)[]): number | null {
  let best: number | null = null;
  let bestNpv = -Infinity;
  results.forEach((result, index) => {
    if ((result?.verdict === "rentable" || result?.verdict === "revisar") && result.npv > bestNpv) {
      best = index;
      bestNpv = result.npv;
    }
  });
  return best;
}
