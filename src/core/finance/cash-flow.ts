/**
 * «¿Es mi proyecto rentable?»: flujo de caja proyectado a N años (RF-57).
 *
 * Dos flujos, como se enseña en evaluación de proyectos (caso de referencia:
 * «Confecciones Otún», `cash-flow.test.ts`):
 *
 * Flujo del proyecto (sin financiación), descontado al costo de capital (WACC):
 *   Ingresos (Q × P)
 * − Costos y gastos (cada rubro: fijo, por unidad × Q o % de los ingresos)
 * = Utilidad antes de depreciación (EBITDA)
 * − Depreciación (línea recta: (valor − valor residual contable) ÷ vida útil)
 * = Utilidad antes de intereses e impuestos (EBIT)
 * − Impuesto de renta (cero si hay pérdida)
 * = Utilidad neta
 * + Depreciación (no fue salida de dinero)
 * + Flujo de venta de activos (valor comercial − impuesto sobre la utilidad en la venta)
 * + Recuperación del capital de trabajo (año N)
 * − Inversión (cada activo en el año en que se compra; capital de trabajo en el año 0)
 * = Flujo de caja del proyecto
 *
 * Flujo del inversionista (con financiación), descontado a la TIO de los socios:
 * el mismo, pero los intereses se restan antes de impuestos, entra el dinero
 * de los préstamos en el año 0 y salen los abonos a capital. En el año 0 queda
 * solo el aporte de los socios: la inversión del año 0 menos los préstamos.
 *
 * WACC = Σ participación × costo después de impuestos: cada préstamo cuesta
 * su tasa × (1 − impuesto de renta) y el aporte de los socios, su TIO.
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
  /** Valor residual contable: lo que no se deprecia (0 si se deprecia todo). */
  readonly residual: number;
  /** Valor comercial: en cuánto se vende al final del horizonte (0 si no se vende). */
  readonly salvage: number;
}

/**
 * - `cuota-fija`: cuotas iguales (PAGO de Excel); interés sobre el saldo.
 * - `intereses-anuales`: se pagan los intereses cada año y el capital al final.
 * - `capitalizable`: no hay pagos; el interés se suma al saldo y todo se paga al
 *   final. El interés causado se resta cada año antes de impuestos.
 */
export type LoanKind = "cuota-fija" | "intereses-anuales" | "capitalizable";

export const LOAN_KINDS: readonly { id: LoanKind; label: string }[] = [
  { id: "cuota-fija", label: "Cuota fija" },
  { id: "intereses-anuales", label: "Intereses cada año" },
  { id: "capitalizable", label: "Todo al final" },
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
  /** Plazo en años, dentro del horizonte. */
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
  /** Préstamos, desembolsados en el año 0. Lo que no cubren lo ponen los socios. */
  readonly loans: readonly Loan[];
  /** Impuesto de renta, proporción (Colombia: 0,35). */
  readonly taxRate: number;
  /** Impuesto sobre la utilidad en la venta de activos (ganancia ocasional en Colombia: 0,15). */
  readonly gainTaxRate: number;
  /** Rentabilidad exigida por los socios (TIO), proporción. Sin préstamos, es la tasa de descuento. */
  readonly equityRate: number;
}

/** Renglones comunes a los dos flujos. */
interface FlowYear {
  readonly year: number;
  readonly depreciation: number;
  readonly ebit: number;
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

export interface CashFlowYear extends FlowYear {
  readonly units: number;
  readonly revenue: number;
  /** Cada rubro del año, en el orden de `input.costs`. */
  readonly costItems: readonly number[];
  readonly costs: number;
  readonly ebitda: number;
}

export interface InvestorYear extends FlowYear {
  readonly interest: number;
  readonly taxableIncome: number;
  /** Dinero de los préstamos (año 0). */
  readonly disbursement: number;
  /** Abono a capital del año (cuota − interés; con «Todo al final», negativo antes del pago). */
  readonly principal: number;
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

/** Una fuente de financiación en el cálculo del WACC. */
export interface FundingSource {
  readonly name: string;
  readonly amount: number;
  /** Tasa antes de impuestos. */
  readonly rate: number;
  /** Costo después de impuestos: tasa × (1 − renta) en préstamos; la TIO en el aporte. */
  readonly cost: number;
  readonly share: number;
  readonly weighted: number;
}

export interface Indicators {
  readonly npv: number;
  /** `null` si no hay tasa que haga el VPN cero en el rango −99 % a 1.000 %. */
  readonly irr: number | null;
  /** Años hasta recuperar la inversión sin descontar, o `null` si no se recupera. */
  readonly payback: number | null;
  /** Años hasta recuperarla en pesos de hoy, o `null` si no se recupera. */
  readonly discountedPayback: number | null;
}

export interface InvestorResult extends Indicators {
  readonly rows: readonly InvestorYear[];
  /** Aporte de los socios en el año 0. */
  readonly equity: number;
}

/** `revisar`: VPN positivo, pero la inversión tarda en volver más de dos tercios del horizonte. */
export type CashFlowVerdict = "rentable" | "revisar" | "indiferente" | "no-rentable";

export const VERDICT_LABELS: Record<CashFlowVerdict, string> = {
  rentable: "Aceptar",
  revisar: "Revisar supuestos",
  indiferente: "Indiferente",
  "no-rentable": "Rechazar o rediseñar",
};

export interface CashFlowResult extends Indicators {
  /** Flujo del proyecto, sin financiación. */
  readonly rows: readonly CashFlowYear[];
  /** Tasa con la que se descuenta el flujo del proyecto: el WACC (la TIO si no hay préstamos). */
  readonly discountRate: number;
  readonly sources: readonly FundingSource[];
  /** Flujo de los socios, con los préstamos; `null` si no hay préstamos (es el mismo del proyecto). */
  readonly investor: InvestorResult | null;
  readonly loanSchedules: readonly (readonly LoanRow[])[];
  readonly assetSales: readonly AssetSale[];
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
  readonly verdict: CashFlowVerdict;
}

export const MAX_YEARS = 50;

/** Inversión del año 0: activos que se compran antes de operar y capital de trabajo. */
export function initialInvestment(input: CashFlowInput): number {
  return (
    input.assets.filter((asset) => asset.year === 0).reduce((sum, asset) => sum + asset.value, 0) +
    input.workingCapital
  );
}

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
    input.equityRate,
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
  if ([input.equityRate, input.priceGrowth, input.costGrowth].some((rate) => rate <= -1))
    return "Las tasas no pueden ser de −100 % o menos.";
  for (const asset of input.assets) {
    const name = asset.name.trim() || "un activo";
    if (
      ![asset.value, asset.year, asset.life, asset.residual, asset.salvage].every(Number.isFinite)
    )
      return `Revisa los números de ${name}.`;
    if (asset.value <= 0) return `El valor de ${name} debe ser mayor que cero.`;
    if (asset.salvage < 0) return `El valor comercial de ${name} no puede ser negativo.`;
    if (asset.residual < 0 || asset.residual > asset.value)
      return `El valor residual contable de ${name} debe estar entre 0 y su valor.`;
    if (!Number.isInteger(asset.year) || asset.year < 0 || asset.year > years)
      return `El año de compra de ${name} debe ser un entero entre 0 y ${years}.`;
    if (!Number.isInteger(asset.life) || asset.life < 1)
      return `La vida útil de ${name} debe ser un número entero de años, 1 o más.`;
  }
  for (const loan of input.loans) {
    const name = loan.name.trim() || "un préstamo";
    if (![loan.amount, loan.rate, loan.term].every(Number.isFinite))
      return `Revisa los números de ${name}.`;
    if (loan.amount <= 0) return `El monto de ${name} debe ser mayor que cero.`;
    if (loan.rate < 0) return `La tasa de ${name} no puede ser negativa.`;
    if (!Number.isInteger(loan.term) || loan.term < 1 || loan.term > years)
      return `El plazo de ${name} debe ser un número entero de años entre 1 y el horizonte (${years}).`;
  }
  if (input.assets.length === 0 && input.workingCapital === 0)
    return "Agrega al menos un activo o un capital de trabajo: sin inversión no hay proyecto que evaluar.";
  const borrowed = input.loans.reduce((sum, loan) => sum + loan.amount, 0);
  if (borrowed > initialInvestment(input))
    return `Los préstamos (${formatMoney(borrowed)}) superan la inversión del año 0 (${formatMoney(initialInvestment(input))}): los socios ponen la diferencia, no puede ser negativa.`;
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

/**
 * Fuentes de financiación y WACC: los préstamos y el aporte de los socios
 * (la inversión del año 0 que no cubren los préstamos), con su participación.
 */
export function fundingSources(input: CashFlowInput): FundingSource[] {
  const borrowed = input.loans.reduce((sum, loan) => sum + loan.amount, 0);
  const equity = Math.max(0, initialInvestment(input) - borrowed);
  const total = borrowed + equity;
  const sources = [
    ...input.loans.map((loan) => ({
      name: loan.name,
      amount: loan.amount,
      rate: loan.rate,
      cost: loan.rate * (1 - input.taxRate),
    })),
    {
      name: "Aporte de los socios",
      amount: equity,
      rate: input.equityRate,
      cost: input.equityRate,
    },
  ];
  return sources.map((source) => {
    const share = total > 0 ? source.amount / total : 0;
    return { ...source, share, weighted: share * source.cost };
  });
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

/** Depreciación anual en línea recta, como `SLN(valor; residual; vida)`. */
export function annualDepreciation(asset: Asset): number {
  return (asset.value - asset.residual) / asset.life;
}

/** Depreciación de un activo en el año `year`: desde el año siguiente a su compra y durante su vida útil. */
function depreciationIn(asset: Asset, year: number): number {
  return year > asset.year && year <= asset.year + asset.life ? annualDepreciation(asset) : 0;
}

/** Venta de cada activo al final del horizonte. */
function assetSalesAt(assets: readonly Asset[], years: number, gainTaxRate: number): AssetSale[] {
  return assets.map((asset) => {
    const accumulated = annualDepreciation(asset) * Math.min(asset.life, years - asset.year);
    const bookValue = asset.value - accumulated;
    const gain = asset.salvage - bookValue;
    // Vender por debajo del valor en libros es una pérdida: ahorra impuesto (sale negativo).
    const tax = gain * gainTaxRate;
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

/** Valor presente y acumulado de cada flujo a la tasa `rate`. */
function discount(flows: readonly number[], rate: number) {
  let cumulative = 0;
  return flows.map((flow, year) => {
    const presentValue = flow / (1 + rate) ** year;
    cumulative += presentValue;
    return { presentValue, cumulativePresentValue: cumulative };
  });
}

function indicators(flows: readonly number[], rate: number): Indicators {
  return {
    npv: netPresentValue(rate, flows),
    irr: internalRateOfReturn(flows),
    payback: paybackOf(flows),
    discountedPayback: paybackOf(discount(flows, rate).map((row) => row.presentValue)),
  };
}

/** Proyecta los flujos del proyecto y de los socios y calcula sus indicadores. Supone datos ya validados. */
export function projectCashFlow(input: CashFlowInput): CashFlowResult {
  const { years, assets, loans, taxRate } = input;
  const loanSchedules = loans.map(loanSchedule);
  const assetSales = assetSalesAt(assets, years, input.gainTaxRate);
  const saleTotal = assetSales.reduce((sum, sale) => sum + sale.flow, 0);
  const sources = fundingSources(input);
  const discountRate = sources.reduce((sum, source) => sum + source.weighted, 0);

  const base = Array.from({ length: years + 1 }, (_, year) => {
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
    const taxes = Math.max(0, ebit) * taxRate;
    const netIncome = ebit - taxes;
    const assetSale = year === years ? saleTotal : 0;
    const workingCapitalRecovery = year === years ? input.workingCapital : 0;
    const investment =
      -assets.filter((asset) => asset.year === year).reduce((sum, asset) => sum + asset.value, 0) -
      (year === 0 ? input.workingCapital : 0);
    const netFlow = netIncome + depreciation + assetSale + workingCapitalRecovery + investment;
    return {
      year,
      units,
      revenue,
      costItems,
      costs,
      ebitda,
      depreciation,
      ebit,
      taxes,
      netIncome,
      assetSale,
      workingCapitalRecovery,
      investment,
      netFlow,
    };
  });
  const flows = base.map((row) => row.netFlow);
  const discounted = discount(flows, discountRate);
  const rows: CashFlowYear[] = base.map((row, year) => ({ ...row, ...discounted[year]! }));

  let investor: InvestorResult | null = null;
  if (loans.length > 0) {
    const investorBase = base.map((row) => {
      const { year } = row;
      const interest = loanSchedules.reduce(
        (sum, rowsOf) => sum + (rowsOf[year]?.interest ?? 0),
        0,
      );
      const paid = loanSchedules.reduce((sum, rowsOf) => sum + (rowsOf[year]?.payment ?? 0), 0);
      const taxableIncome = row.ebit - interest;
      const taxes = Math.max(0, taxableIncome) * taxRate;
      const netIncome = taxableIncome - taxes;
      const disbursement = year === 0 ? loans.reduce((sum, loan) => sum + loan.amount, 0) : 0;
      const principal = paid - interest;
      return {
        year,
        depreciation: row.depreciation,
        ebit: row.ebit,
        interest,
        taxableIncome,
        taxes,
        netIncome,
        assetSale: row.assetSale,
        workingCapitalRecovery: row.workingCapitalRecovery,
        investment: row.investment,
        disbursement,
        principal,
        netFlow:
          netIncome +
          row.depreciation +
          row.assetSale +
          row.workingCapitalRecovery +
          row.investment +
          disbursement -
          principal,
      };
    });
    const investorFlows = investorBase.map((row) => row.netFlow);
    const investorDiscounted = discount(investorFlows, input.equityRate);
    investor = {
      rows: investorBase.map((row, year) => ({ ...row, ...investorDiscounted[year]! })),
      equity: sources.at(-1)?.amount ?? 0,
      ...indicators(investorFlows, input.equityRate),
    };
  }

  const project = indicators(flows, discountRate);
  const positives = rows.reduce((sum, row) => sum + Math.max(0, row.presentValue), 0);
  const negatives = rows.reduce((sum, row) => sum - Math.min(0, row.presentValue), 0);
  // VPN «cero» relativo al tamaño del proyecto: evita llamar rentable a un redondeo.
  const tolerance = 1e-9 * Math.max(1, negatives);
  const operating = rows.slice(1);
  const average = (pick: (row: CashFlowYear) => number): number =>
    operating.reduce((sum, row) => sum + pick(row), 0) / years;
  const totalRevenue = operating.reduce((sum, row) => sum + row.revenue, 0);
  // «Demasiado largo frente al horizonte»: más de dos tercios de N.
  const longPayback = project.payback === null || project.payback > (2 * years) / 3;

  return {
    ...project,
    rows,
    discountRate,
    sources,
    investor,
    loanSchedules,
    assetSales,
    benefitCost: negatives > 0 ? positives / negatives : null,
    simpleSum: flows.reduce((sum, flow) => sum + flow, 0),
    averageEbitda: average((row) => row.ebitda),
    averageNetIncome: average((row) => row.netIncome),
    averageFlow: average((row) => row.netFlow),
    ebitdaMargin:
      totalRevenue > 0 ? operating.reduce((sum, row) => sum + row.ebitda, 0) / totalRevenue : null,
    multipleSignChanges: signChanges(flows) > 1,
    hasLossYears: rows.some((row) => row.year > 0 && row.ebit < 0),
    verdict:
      Math.abs(project.npv) <= tolerance
        ? "indiferente"
        : project.npv > 0
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

type Line<Row> = readonly [label: string, pick: (row: Row) => number, strong?: true];

const PROJECT_HEAD: readonly Line<CashFlowYear>[] = [
  ["Unidades vendidas (Q)", (row) => row.units],
  ["Ingresos (Q × P)", (row) => row.revenue],
];
const PROJECT_TAIL: readonly Line<CashFlowYear>[] = [
  ["(−) Costos y gastos totales", (row) => row.costs],
  ["Utilidad antes de depreciación (EBITDA)", (row) => row.ebitda, true],
  ["(−) Depreciación", (row) => row.depreciation],
  ["Utilidad antes de intereses e impuestos (EBIT)", (row) => row.ebit, true],
  ["(−) Impuesto de renta", (row) => row.taxes],
  ["Utilidad neta", (row) => row.netIncome, true],
  ["(+) Depreciación", (row) => row.depreciation],
  ["(+) Flujo de venta de activos", (row) => row.assetSale],
  ["(+) Capital de trabajo", (row) => row.workingCapitalRecovery],
  ["(−) Inversión", (row) => row.investment],
  ["Flujo de caja", (row) => row.netFlow, true],
  ["Valor presente", (row) => row.presentValue],
  ["Valor presente acumulado", (row) => row.cumulativePresentValue],
];
const INVESTOR_LINES: readonly Line<InvestorYear>[] = [
  ["Utilidad antes de intereses e impuestos (EBIT)", (row) => row.ebit, true],
  ["(−) Intereses", (row) => row.interest],
  ["Utilidad antes de impuestos", (row) => row.taxableIncome, true],
  ["(−) Impuesto de renta", (row) => row.taxes],
  ["Utilidad neta", (row) => row.netIncome, true],
  ["(+) Depreciación", (row) => row.depreciation],
  ["(+) Flujo de venta de activos", (row) => row.assetSale],
  ["(+) Capital de trabajo", (row) => row.workingCapitalRecovery],
  ["(−) Inversión", (row) => row.investment],
  ["(+) Préstamos", (row) => row.disbursement],
  ["(−) Abono a capital", (row) => row.principal],
  ["Flujo de caja del inversionista", (row) => row.netFlow, true],
  ["Valor presente", (row) => row.presentValue],
  ["Valor presente acumulado", (row) => row.cumulativePresentValue],
];

function lines<Row>(rows: readonly Row[], spec: readonly Line<Row>[]): CashFlowLine[] {
  return spec.map(([label, pick, strong]) => ({
    label,
    values: rows.map(pick),
    ...(strong === true ? { strong } : {}),
  }));
}

/** Filas de la tabla del flujo del proyecto, en el orden en que se leen, con un renglón por rubro de costo. */
export function cashFlowTable(input: CashFlowInput, result: CashFlowResult): CashFlowLine[] {
  const [units, revenue] = lines(result.rows, PROJECT_HEAD);
  return [
    { ...units!, units: true },
    revenue!,
    ...input.costs.map((cost, index) => ({
      label: `(−) ${cost.name.trim() || `Rubro ${index + 1}`}`,
      values: result.rows.map((row) => row.costItems[index] ?? 0),
    })),
    ...lines(result.rows, PROJECT_TAIL),
  ];
}

/** Filas de la tabla del flujo del inversionista, o `[]` si no hay préstamos. */
export function investorTable(result: CashFlowResult): CashFlowLine[] {
  return result.investor === null ? [] : lines(result.investor.rows, INVESTOR_LINES);
}

/** Dinero sin decimales, con signo menos tipográfico: `$1.250.000`, `−$300`. */
export function formatMoney(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "$0";
  return `${rounded < 0 ? "−" : ""}$${formatValue(Math.abs(rounded), 0)}`;
}

/** Proporción como porcentaje con dos decimales: `0.2` → «20,00 %». */
export function percent(proportion: number): string {
  return `${formatValue(proportion * 100, 2)} %`;
}

function yearsText(value: number): string {
  return `${formatValue(value, 1)} años`;
}

/** «tu tasa de oportunidad del 20,00 %» o «el costo de capital (WACC) del 13,54 %». */
export function rateName(input: CashFlowInput, result: CashFlowResult): string {
  return input.loans.length > 0
    ? `el costo de capital (WACC) del ${percent(result.discountRate)}`
    : `tu tasa de oportunidad del ${percent(result.discountRate)}`;
}

/**
 * Lectura en llano (ADR-004) con los criterios de clase: el VPN dice si se
 * espera ganar más o menos que en la alternativa; la TIR, cuánto rinde la inversión.
 */
export function describeCashFlow(input: CashFlowInput, result: CashFlowResult): Interpretation {
  const rate = rateName(input, result);
  const tio = percent(result.discountRate);
  const headline =
    result.verdict === "revisar"
      ? `Revisar supuestos: el VPN es positivo (${formatMoney(result.npv)} con ${rate}), pero ${
          result.payback !== null
            ? `la inversión tarda ${yearsText(result.payback)} en volver`
            : "la inversión no vuelve sin descontar"
        }, más de dos tercios de los ${input.years} años del horizonte. Un error pequeño en los supuestos puede volverlo no rentable.`
      : result.verdict === "rentable"
        ? `Se recomienda: con ${rate}, se espera ganar más que en la alternativa. El proyecto deja ${formatMoney(result.npv)} de más en pesos de hoy (VPN positivo).`
        : result.verdict === "no-rentable"
          ? `No se recomienda: con ${rate}, se espera ganar menos que en la alternativa. En pesos de hoy faltan ${formatMoney(-result.npv)} (VPN negativo).`
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
        : result.irr > result.discountRate
          ? `Supera la tasa del ${tio}: es rentable y se recomienda`
          : result.irr < result.discountRate
            ? `Es positiva, así que el proyecto es rentable, pero no alcanza la tasa del ${tio}: no se recomienda`
            : `Es igual a la tasa del ${tio}`;
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
  const { investor } = result;
  if (investor !== null) {
    const equityRate = percent(input.equityRate);
    details.push(
      `Para los socios, que ponen ${formatMoney(investor.equity)}: a su TIO del ${equityRate}, el VPN es ${formatMoney(investor.npv)}${
        investor.irr !== null ? ` y la TIR, ${percent(investor.irr)}` : ""
      }. ${
        investor.npv > 0
          ? "Ganan más de lo que exigen."
          : investor.npv < 0
            ? "Ganan menos de lo que exigen."
            : "Ganan justo lo que exigen."
      }${
        investor.irr !== null && result.irr !== null && investor.irr > result.irr
          ? " Su TIR supera la del proyecto porque la deuda cuesta menos de lo que rinde el proyecto (apalancamiento)."
          : ""
      }`,
    );
  }
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
  if (input.loans.some((loan) => loan.kind === "capitalizable"))
    caveats.push(
      "Con «Todo al final», el interés de cada año se resta antes de impuestos pero no se paga: el abono a capital sale negativo hasta el pago final.",
    );
  if (result.multipleSignChanges)
    caveats.push(
      "Los flujos cambian de signo más de una vez: puede haber más de una TIR. Decide con el VPN.",
    );

  return { headline, details, caveats };
}

/** Letra de columna de Excel para un índice desde 0 (`0` → A, `26` → AA). */
export function excelColumn(index: number): string {
  let name = "";
  for (let i = index + 1; i > 0; i = Math.floor((i - 1) / 26))
    name = String.fromCharCode(65 + ((i - 1) % 26)) + name;
  return name;
}

/** Paso a paso con los números del proyecto, para «Ver cómo se calculó». */
export function cashFlowSteps(input: CashFlowInput, result: CashFlowResult): CalculationStep[] {
  const n = input.years;
  const rate = formatValue(result.discountRate, 4);
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
      text: "Cada activo pierde valor por su uso: su costo menos el valor residual contable, dividido por su vida útil, cada año desde el siguiente a su compra. Se resta antes de impuestos y luego se suma de vuelta, porque no es una salida de dinero.",
      table: {
        columns: ["Activo", "Valor", "Valor residual", "Vida útil", "Depreciación anual"],
        rows: input.assets.map((asset) => [
          asset.name,
          formatMoney(asset.value),
          formatMoney(asset.residual),
          `${formatValue(asset.life, 0)} años`,
          formatMoney(annualDepreciation(asset)),
        ]),
      },
      ...(first !== undefined
        ? {
            excel: `=SLN(${formatValue(first.value, 0)}; ${formatValue(first.residual, 0)}; ${formatValue(first.life, 0)})`,
          }
        : {}),
    });
    steps.push({
      title: "Flujo de venta de activos",
      text: "Valor en libros = costo − depreciación acumulada. Si el activo se vende por encima del valor en libros, la diferencia paga impuesto (o lo ahorra, si se vende por debajo). Entra el valor comercial menos ese impuesto.",
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
  }
  if (input.loans.length > 0) {
    const fixed = input.loans.find((loan) => loan.kind === "cuota-fija");
    steps.push({
      title: "Costo de capital (WACC)",
      text: "Cada fuente pesa según su participación en la inversión del año 0. Los intereses se descuentan de la renta, así que un préstamo cuesta su tasa × (1 − impuesto); el aporte de los socios cuesta su TIO.",
      table: {
        columns: ["Fuente", "Monto", "Participación", "Costo después de impuestos", "Ponderado"],
        rows: result.sources.map((source) => [
          source.name,
          formatMoney(source.amount),
          percent(source.share),
          percent(source.cost),
          percent(source.weighted),
        ]),
      },
      formula: `WACC = Σ participación × costo = ${percent(result.discountRate)}`,
    });
    steps.push({
      title: "Flujo del inversionista",
      text: "Se parte de la utilidad operacional, se restan los intereses antes de impuestos, entra el dinero de los préstamos en el año 0 y salen los abonos a capital. En el año 0 queda solo el aporte de los socios. Se descuenta a su TIO.",
      ...(fixed !== undefined
        ? {
            formula: `Cuota de ${fixed.name} = ${formatMoney(fixedPayment(fixed.amount, fixed.rate, fixed.term))}`,
            excel: `=PAGO(${formatValue(fixed.rate, 4)}; ${fixed.term}; -${formatValue(fixed.amount, 0)})`,
          }
        : {}),
    });
  }
  steps.push(
    {
      title: "Valor presente neto (VPN)",
      text: `Cada flujo del proyecto se trae a pesos de hoy dividiéndolo por (1 + tasa) elevado al año, y se suman. La tasa es ${rateName(input, result)}. En Excel, VNA va desde el año 1 y se le suma el año 0.`,
      formula: `VPN = Σ Flujoₜ ÷ (1 + ${rate})ᵗ = ${formatMoney(result.npv)}`,
      excel: `=VNA(${rate}; C${row}:${last}${row}) + B${row}   (con la tabla copiada pegada en A1)`,
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
