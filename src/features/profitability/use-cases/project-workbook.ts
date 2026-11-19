/**
 * Libro de Excel del proyecto, con la estructura del prompt de evaluación de
 * proyectos: Resumen, Supuestos, Flujo, Data histórica, Fuentes y Control de
 * calidad. Todo el flujo son fórmulas conectadas a la hoja Supuestos: al
 * cambiar un supuesto, Excel recalcula VPN, TIR y payback.
 *
 * Lo que fija la forma del libro (horizonte, cuántos rubros, activos y
 * préstamos, el tipo de cada uno) queda como texto: para cambiarlo se vuelve
 * a exportar desde StatLab.
 */
import {
  COST_KINDS,
  describeCashFlow,
  excelColumn,
  LOAN_KINDS,
  type CashFlowInput,
  type CashFlowResult,
} from "@/core/finance";
import type { WorkbookCell, WorkbookEntry, WorkbookSheet } from "@/infrastructure/export";

import { parseHistory, type ScenarioForm } from "../model/scenario";

const MONEY = '"$"#,##0;[Red]-"$"#,##0';
const PERCENT = "0.00%";
const UNITS = "#,##0";
const YEARS = '0.0 "años"';
const FACTOR = "0.0000";

const input = (value: string | number, format?: string): WorkbookCell => ({
  value,
  style: "input",
  ...(format !== undefined ? { format } : {}),
});
const formula = (text: string, format?: string, style?: WorkbookCell["style"]): WorkbookCell => ({
  formula: text,
  ...(format !== undefined ? { format } : {}),
  ...(style !== undefined ? { style } : {}),
});
const header = (...labels: string[]): WorkbookCell[] =>
  labels.map((value) => ({ value, style: "header" }));
const section = (value: string, span: number): WorkbookCell[] => [
  { value, style: "section", span },
];
const note = (value: string, span: number): WorkbookCell[] => [{ value, style: "note", span }];

/** Filas que se van agregando; `add` devuelve el número de fila de Excel (desde 1). */
function sheetRows() {
  const rows: WorkbookEntry[][] = [];
  return {
    rows,
    add: (...cells: WorkbookEntry[]): number => rows.push(cells),
    blank: (): number => rows.push([]),
  };
}

const abs = (sheet: string, column: string, row: number): string => `${sheet}!$${column}$${row}`;

export interface ProjectWorkbookArgs {
  readonly name: string;
  readonly form: ScenarioForm;
  readonly input: CashFlowInput;
  readonly result: CashFlowResult;
}

export function buildProjectWorkbook({
  name,
  form,
  input: data,
  result,
}: ProjectWorkbookArgs): WorkbookSheet[] {
  const n = data.years;
  const startYear = Number(form.startYear);
  const hasStart = form.startYear.trim() !== "" && Number.isInteger(startYear);

  // ── Supuestos ───────────────────────────────────────────────────────────
  const s = sheetRows();
  const S = (row: number, column = "B"): string => abs("Supuestos", column, row);
  s.add({ value: "Supuestos del modelo", style: "title" });
  s.add({
    value:
      "Las celdas amarillas con texto azul se pueden editar: el libro se recalcula solo. Montos en pesos colombianos (COP).",
    style: "subtitle",
  });
  s.blank();
  s.add(...section("Supuestos generales", 6));
  s.add(...header("Supuesto", "Valor", "Unidad", "Comentario técnico y fuente o criterio"));
  s.add("Escenario", name.trim() || "Escenario base", "", "Un solo escenario por libro.");
  s.add("Moneda", "COP", "", "Pesos colombianos.");
  const horizon = s.add(
    "Horizonte de evaluación",
    { value: n, format: "0" },
    "años",
    "Fija las columnas del flujo. Para cambiarlo, vuelve a exportar desde StatLab.",
  );
  const start = hasStart
    ? s.add(
        "Año 0 (año calendario de la inversión)",
        input(startYear, "0"),
        "año",
        "Solo rotula las columnas.",
      )
    : null;
  const tmar = s.add(
    "Tasa de descuento (TMAR)",
    input(data.discountRate, PERCENT),
    "% anual",
    "Rentabilidad mínima que se exige; con ella se descuentan los flujos.",
  );
  const tax = s.add(
    "Impuesto de renta",
    input(data.taxRate, PERCENT),
    "%",
    "Sobre la utilidad antes de impuestos; cero en los años con pérdida.",
  );
  const gainTax = s.add(
    "Impuesto de ganancia ocasional",
    input(data.gainTaxRate, PERCENT),
    "%",
    "Sobre la utilidad en la venta de activos al final.",
  );
  s.blank();
  s.add(...section("Supuestos de ingresos", 6));
  s.add(...header("Supuesto", "Valor", "Unidad", "Comentario técnico y fuente o criterio"));
  const price = s.add(
    "Precio de venta por unidad (año 1)",
    input(data.price, MONEY),
    "COP",
    "Ingresos = unidades × precio.",
  );
  const priceGrowth = s.add(
    "Crecimiento anual del precio",
    input(data.priceGrowth, PERCENT),
    "% anual",
    "Inflación o actualización de tarifas; 0 = precios constantes.",
  );
  s.blank();
  s.add(...section("Demanda: unidades vendidas por año", 6));
  s.add(...header("Año", "Unidades", "", "Comentario"));
  const demandRows = data.demand.map((units, index) =>
    s.add(
      hasStart ? `Año ${index + 1} (${startYear + index + 1})` : `Año ${index + 1}`,
      input(units, UNITS),
      "",
      index === 0 ? "Productos o servicios vendidos en el año." : "",
    ),
  );
  s.blank();
  s.add(...section("Costos y gastos (montos del año 1)", 6));
  s.add(...header("Supuesto", "Valor", "Unidad", "Comentario técnico y fuente o criterio"));
  const costGrowth = s.add(
    "Crecimiento anual de los costos",
    input(data.costGrowth, PERCENT),
    "% anual",
    "Aplica a los rubros fijos y por unidad; los porcentajes siguen a los ingresos.",
  );
  s.add(...header("Rubro", "Monto del año 1", "Tipo", "Comentario"));
  const costRows = data.costs.map((cost) =>
    s.add(
      cost.name,
      input(cost.amount, cost.kind === "porcentaje" ? PERCENT : MONEY),
      COST_KINDS.find((kind) => kind.id === cost.kind)?.label ?? cost.kind,
      cost.kind === "por-unidad"
        ? "Se multiplica por las unidades de cada año."
        : cost.kind === "porcentaje"
          ? "Porcentaje de los ingresos de cada año."
          : "No depende de cuánto se venda.",
    ),
  );
  s.blank();
  s.add(...section("Inversión, depreciación (línea recta) y valor residual", 6));
  s.add(
    ...header(
      "Activo",
      "Valor",
      "Año de compra",
      "Vida útil (años)",
      "Valor comercial al final",
      "Depreciación anual",
    ),
  );
  const assetRows = data.assets.map((asset) => {
    const row = s.rows.length + 1;
    return s.add(
      asset.name,
      input(asset.value, MONEY),
      input(asset.year, "0"),
      input(asset.life, "0"),
      input(asset.salvage, MONEY),
      formula(`B${row}/D${row}`, MONEY),
    );
  });
  const workingCapital = s.add(
    "Capital de trabajo inicial",
    input(data.workingCapital, MONEY),
    "COP",
    "Sale en el año 0 y se recupera en el último año.",
  );
  s.blank();
  s.add(...section("Financiación", 6));
  const loanRows: number[] = [];
  if (data.loans.length === 0) {
    s.add(...note("Sin préstamos: el flujo es libre y no apalancado (sin deuda ni intereses).", 6));
  } else {
    s.add(...header("Préstamo", "Monto", "Tasa efectiva anual", "Plazo (años)", "Forma de pago"));
    for (const loan of data.loans)
      loanRows.push(
        s.add(
          loan.name,
          input(loan.amount, MONEY),
          input(loan.rate, PERCENT),
          input(loan.term, "0"),
          LOAN_KINDS.find((kind) => kind.id === loan.kind)?.label ?? loan.kind,
        ),
      );
  }

  // ── Flujo ───────────────────────────────────────────────────────────────
  const f = sheetRows();
  const col = (t: number): string => excelColumn(t + 1); // B = año 0.
  const last = col(n);
  const years = Array.from({ length: n + 1 }, (_, t) => t);
  f.add({ value: "Flujo de caja libre proyectado", style: "title" });
  f.add({
    value:
      "Pesos colombianos (COP). Todo sale de la hoja Supuestos; no hay valores escritos a mano.",
    style: "subtitle",
  });
  f.add(
    { value: "Concepto", style: "header" },
    ...years.map((t): WorkbookCell =>
      start !== null
        ? { formula: `"Año "&${col(t)}$4&" ("&(${S(start)}+${col(t)}$4)&")"`, style: "header" }
        : { value: `Año ${t}`, style: "header" },
    ),
  );
  const T = 4;
  f.add(
    { value: "Periodo (t)", style: "section" },
    ...years.map((t) => ({ value: t, style: "section" as const })),
  );
  const line = (
    label: string,
    cell: (c: string, t: number) => WorkbookEntry,
    style?: WorkbookCell["style"],
    format = MONEY,
  ): number =>
    f.add(
      style !== undefined ? { value: label, style } : label,
      ...years.map((t): WorkbookEntry => {
        const value = cell(col(t), t);
        if (typeof value === "string") return formula(value, format, style);
        if (typeof value === "number")
          return { value, format, ...(style !== undefined ? { style } : {}) };
        return value;
      }),
    );
  const t = (c: string): string => `${c}$${T}`;
  const prev = (tt: number): string => col(tt - 1);
  const sumRows = (c: string, rows: readonly number[]): string =>
    rows.length === 0 ? "0" : `SUM(${c}${rows[0]}:${c}${rows.at(-1)})`;

  // Las filas de detalle (depreciación por activo, intereses por préstamo y
  // venta de activos) van debajo del flujo; se reservan sus números antes.
  const variable = data.costs.flatMap((cost, index) => (cost.kind === "fijo" ? [] : [index]));
  const fixed = data.costs.flatMap((cost, index) => (cost.kind === "fijo" ? [index] : []));
  const mainRows =
    4 + // título, subtítulo, encabezado, periodo
    1 +
    3 + // sección e ingresos (unidades, ingresos, crecimiento)
    1 +
    variable.length +
    1 +
    fixed.length +
    1 +
    1 + // costos
    1 +
    7 + // estado de resultados
    1 +
    7 +
    6; // flujo libre, descuentos y años de recuperación
  const depStart = mainRows + 3;
  const depRows = data.assets.map((_, index) => depStart + index);
  const intStart = depStart + data.assets.length + (data.assets.length > 0 ? 2 : 0);
  const intRows = data.loans.map((_, index) => intStart + index);
  const saleStart = intStart + data.loans.length + (data.loans.length > 0 ? 2 : 0) + 1;
  const saleRows = data.assets.map((_, index) => saleStart + index);

  f.add(...section("Ingresos", n + 2));
  const units = line(
    "Unidades vendidas (Q)",
    (_, tt) => (tt === 0 ? 0 : S(demandRows[tt - 1] ?? 0)),
    undefined,
    UNITS,
  );
  const revenue = line(
    "Ingresos por ventas (Q × P)",
    (c) => `${c}${units}*${S(price)}*(1+${S(priceGrowth)})^MAX(0,${t(c)}-1)`,
  );
  line(
    "Crecimiento de ingresos",
    (c, tt) =>
      tt < 2 ? null : `IF(${prev(tt)}${revenue}=0,"",${c}${revenue}/${prev(tt)}${revenue}-1)`,
    undefined,
    PERCENT,
  );
  f.add(...section("Costos y gastos", n + 2));
  const costLine = (index: number): number => {
    const cost = data.costs[index]!;
    const amount = S(costRows[index] ?? 0);
    return line(`(−) ${cost.name}`, (c) => {
      const g = `(1+${S(costGrowth)})^(${t(c)}-1)`;
      if (cost.kind === "porcentaje") return `${amount}*${c}${revenue}`;
      if (cost.kind === "por-unidad") return `IF(${t(c)}=0,0,${amount}*${c}${units}*${g})`;
      return `IF(${t(c)}=0,0,${amount}*${g})`;
    });
  };
  const variableRows = variable.map(costLine);
  const variableTotal = line("Costos variables totales", (c) => sumRows(c, variableRows), "total");
  const fixedRows = fixed.map(costLine);
  const fixedTotal = line("Costos fijos totales", (c) => sumRows(c, fixedRows), "total");
  const costTotal = line(
    "Costos y gastos totales",
    (c) => `${c}${variableTotal}+${c}${fixedTotal}`,
    "total",
  );
  f.add(...section("Estado de resultados", n + 2));
  const ebitda = line("EBITDA", (c) => `${c}${revenue}-${c}${costTotal}`, "total");
  const depreciation = line("(−) Depreciación", (c) => sumRows(c, depRows));
  const ebit = line(
    "EBIT (utilidad operacional)",
    (c) => `${c}${ebitda}-${c}${depreciation}`,
    "total",
  );
  const interest = line("(−) Intereses", (c) => sumRows(c, intRows));
  const taxable = line(
    "Utilidad antes de impuestos",
    (c) => `${c}${ebit}-${c}${interest}`,
    "total",
  );
  const taxes = line("(−) Impuesto de renta", (c) => `MAX(0,${c}${taxable})*${S(tax)}`);
  const netIncome = line("Utilidad neta", (c) => `${c}${taxable}-${c}${taxes}`, "total");
  f.add(...section("Flujo de caja libre", n + 2));
  line("Utilidad neta", (c) => `${c}${netIncome}`);
  line("(+) Depreciación", (c) => `${c}${depreciation}`);
  const assetYears =
    assetRows.length > 0 ? `Supuestos!$C$${assetRows[0]}:$C$${assetRows.at(-1)}` : null;
  const assetValues =
    assetRows.length > 0 ? `Supuestos!$B$${assetRows[0]}:$B$${assetRows.at(-1)}` : null;
  const investment = line("(−) Inversión en activos", (c) =>
    assetYears !== null && assetValues !== null
      ? `-SUMIF(${assetYears},${t(c)},${assetValues})`
      : "0",
  );
  const wcOut = line("(−) Capital de trabajo", (_, tt) => (tt === 0 ? `-${S(workingCapital)}` : 0));
  line("(+) Recuperación del capital de trabajo", (_, tt) => (tt === n ? S(workingCapital) : 0));
  const residual = line("(+) Valor residual (venta de activos, neto de impuesto)", (_, tt) =>
    tt === n && saleRows.length > 0 ? `SUM($G$${saleRows[0]}:$G$${saleRows.at(-1)})` : 0,
  );
  const first = netIncome + 2; // «Utilidad neta» repetida al inicio del bloque.
  const flow = line("Flujo de caja libre", (c) => `SUM(${c}${first}:${c}${residual})`, "highlight");
  const factor = line("Factor de descuento", (c) => `1/(1+${S(tmar)})^${t(c)}`, undefined, FACTOR);
  const discounted = line("Flujo descontado", (c) => `${c}${flow}*${c}${factor}`);
  const cumulative = line("Flujo acumulado", (c, tt) =>
    tt === 0 ? `${c}${flow}` : `${prev(tt)}${f.rows.length + 1}+${c}${flow}`,
  );
  const cumulativeDiscounted = line("Flujo descontado acumulado", (c, tt) =>
    tt === 0 ? `${c}${discounted}` : `${prev(tt)}${f.rows.length + 1}+${c}${discounted}`,
  );
  const recovery = (label: string, cum: number, flows: number): number =>
    line(
      label,
      (c, tt) =>
        tt === 0
          ? `IF(${c}${cum}>=0,0,"")`
          : `IF(AND(${prev(tt)}${cum}<0,${c}${cum}>=0),${prev(tt)}$${T}-${prev(tt)}${cum}/${c}${flows},"")`,
      undefined,
      "0.00",
    );
  const paybackRow = recovery("Año en que se recupera (simple)", cumulative, flow);
  const discountedPaybackRow = recovery(
    "Año en que se recupera (descontado)",
    cumulativeDiscounted,
    discounted,
  );
  if (f.rows.length !== mainRows)
    throw new Error(`Filas del flujo descuadradas: ${f.rows.length} ≠ ${mainRows}`);

  f.blank();
  if (data.assets.length > 0) {
    f.add(
      ...section(
        "Depreciación por activo (línea recta, desde el año siguiente a la compra)",
        n + 2,
      ),
    );
    data.assets.forEach((asset, index) => {
      const r = assetRows[index]!;
      line(
        asset.name,
        (c) =>
          `IF(AND(${t(c)}>${S(r, "C")},${t(c)}<=${S(r, "C")}+${S(r, "D")}),${S(r)}/${S(r, "D")},0)`,
      );
    });
    f.blank();
  }
  if (data.loans.length > 0) {
    f.add(...section("Intereses por préstamo (solo los intereses entran al flujo)", n + 2));
    data.loans.forEach((loan, index) => {
      const r = loanRows[index]!;
      const [amount, rate, term] = [S(r), S(r, "C"), S(r, "D")];
      line(loan.name, (c) => {
        const inTerm = `AND(${t(c)}>=1,${t(c)}<=${term})`;
        const value =
          loan.kind === "cuota-fija"
            ? `IPMT(${rate},${t(c)},${term},-${amount})`
            : loan.kind === "intereses-anuales"
              ? `${amount}*${rate}`
              : `${amount}*${rate}*(1+${rate})^(${t(c)}-1)`;
        return `IF(${inTerm},${value},0)`;
      });
    });
    f.blank();
  }
  f.add(...section("Venta de activos al final del horizonte", n + 2));
  f.add(
    ...header(
      "Activo",
      "Valor comercial",
      "Depreciación acumulada",
      "Valor en libros",
      "Utilidad en la venta",
      "Impuesto de ganancia ocasional",
      "Flujo de la venta",
    ),
  );
  data.assets.forEach((asset, index) => {
    const r = assetRows[index]!;
    const row = f.rows.length + 1;
    f.add(
      asset.name,
      formula(S(r, "E"), MONEY),
      formula(`${S(r)}/${S(r, "D")}*MIN(${S(r, "D")},MAX(0,${S(horizon)}-${S(r, "C")}))`, MONEY),
      formula(`${S(r)}-C${row}`, MONEY),
      formula(`B${row}-D${row}`, MONEY),
      formula(`MAX(0,E${row})*${S(gainTax)}`, MONEY),
      formula(`B${row}-F${row}`, MONEY),
    );
  });
  if (data.assets.length > 0 && f.rows.length !== saleRows.at(-1))
    throw new Error("Filas de la venta de activos descuadradas.");

  // ── Resumen ─────────────────────────────────────────────────────────────
  const F = (column: string, row: number): string => abs("Flujo", column, row);
  const range = (row: number, from = "B"): string => `Flujo!$${from}$${row}:$${last}$${row}`;
  const r = sheetRows();
  r.add({ value: `Resumen ejecutivo · ${name.trim() || "Escenario base"}`, style: "title" });
  r.add({
    value:
      "Evaluación financiera con flujo de caja libre. Los indicadores se recalculan al cambiar la hoja Supuestos.",
    style: "subtitle",
  });
  r.blank();
  r.add(...section("Indicadores financieros", 3));
  r.add(...header("Indicador", "Valor", "Criterio"));
  const investmentTotal = r.add(
    "Inversión inicial total",
    formula(`-(${F("B", investment)}+${F("B", wcOut)})`, MONEY),
    "Activos del año 0 más capital de trabajo.",
  );
  r.add("Tasa de descuento", formula(S(tmar), PERCENT), "TMAR de la hoja Supuestos.");
  r.add("Horizonte de evaluación", formula(S(horizon), '0 "años"'), "");
  const npv = r.add(
    "VPN",
    formula(`NPV(${S(tmar)},${range(flow, "C")})+${F("B", flow)}`, MONEY, "highlight"),
    "Aceptar si es positivo: se gana más que en la alternativa.",
  );
  const irr = r.add(
    "TIR",
    formula(`IFERROR(IRR(${range(flow)}),"No se puede calcular")`, PERCENT, "highlight"),
    "Aceptar si supera la tasa de descuento.",
  );
  const payback = r.add(
    "Payback simple",
    formula(`IF(COUNT(${range(paybackRow)})=0,"No se recupera",MIN(${range(paybackRow)}))`, YEARS),
    "Revisar si se acerca al horizonte (más de dos tercios).",
  );
  r.add(
    "Payback descontado",
    formula(
      `IF(COUNT(${range(discountedPaybackRow)})=0,"No se recupera",MIN(${range(discountedPaybackRow)}))`,
      YEARS,
    ),
    "Recuperación con los flujos en pesos de hoy.",
  );
  r.add(
    "Valor residual estimado de los activos",
    formula(
      assetRows.length > 0 ? `SUM(Supuestos!$E$${assetRows[0]}:$E$${assetRows.at(-1)})` : "0",
      MONEY,
    ),
    "Valor comercial al final, antes del impuesto de ganancia ocasional.",
  );
  r.add("EBITDA promedio anual", formula(`AVERAGE(${range(ebitda, "C")})`, MONEY), "");
  r.add(
    "Margen EBITDA",
    formula(`IFERROR(SUM(${range(ebitda, "C")})/SUM(${range(revenue, "C")}),0)`, PERCENT),
    "EBITDA total sobre ingresos totales.",
  );
  r.add("Utilidad neta promedio anual", formula(`AVERAGE(${range(netIncome, "C")})`, MONEY), "");
  r.add("Flujo de caja libre promedio anual", formula(`AVERAGE(${range(flow, "C")})`, MONEY), "");
  r.blank();
  r.add(...section("Decisión sugerida", 3));
  r.add(
    "Decisión",
    formula(
      `IF(B${npv}<0,"Rechazar o rediseñar el proyecto",IF(OR(ISTEXT(B${payback}),B${payback}>2/3*${S(horizon)}),"Revisar supuestos","Aceptar el proyecto"))`,
      undefined,
      "highlight",
    ),
    "VPN positivo y TIR mayor que la tasa: aceptar. VPN positivo con payback largo: revisar. VPN negativo: rechazar o rediseñar.",
  );
  r.blank();
  r.add(...section("Supuestos principales", 3));
  r.add(...header("Supuesto", "Valor"));
  r.add("Precio de venta por unidad (año 1)", formula(S(price), MONEY));
  r.add("Unidades vendidas en el año 1", formula(S(demandRows[0] ?? 0), UNITS));
  r.add("Crecimiento anual del precio", formula(S(priceGrowth), PERCENT));
  r.add("Crecimiento anual de los costos", formula(S(costGrowth), PERCENT));
  r.add("Impuesto de renta", formula(S(tax), PERCENT));
  r.add("Capital de trabajo inicial", formula(S(workingCapital), MONEY));
  r.blank();
  r.add(...section("Interpretación ejecutiva (StatLab, al exportar)", 3));
  const reading = describeCashFlow(data, result);
  for (const text of [reading.headline, ...reading.details]) r.add(...note(text, 3));
  r.add(
    ...note(
      "Este texto se escribió con los supuestos del momento de exportar. Si los cambias, los indicadores de arriba se recalculan, pero este texto no.",
      3,
    ),
  );

  // ── Data histórica ──────────────────────────────────────────────────────
  const h = sheetRows();
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  h.add({ value: "Data histórica", style: "title" });
  h.add({
    value:
      "Para validar los supuestos y para análisis de sensibilidad o simulación. Las celdas amarillas se completan con fuentes oficiales (hoja Fuentes).",
    style: "subtitle",
  });
  h.blank();
  h.add(...section("1. Ventas históricas del proyecto", 9));
  const history = parseHistory(form.history) ?? [];
  const lastYear = Number(form.historyLastYear);
  if (history.length === 0) h.add(...note("No se escribieron ventas históricas en StatLab.", 6));
  else {
    h.add(...header("Año", "Unidades", "Fuente"));
    history.forEach((units, index) =>
      h.add(
        Number.isInteger(lastYear) ? lastYear - history.length + 1 + index : index + 1,
        { value: units, format: UNITS },
        "Ingresadas en StatLab",
      ),
    );
  }
  h.blank();
  h.add(...section("2. Información mensual (enero de 2022 a diciembre de 2025)", 9));
  h.add(
    ...header(
      "Año",
      "Mes",
      "Fecha",
      "Precio de referencia del insumo clave (p. ej., gasolina corriente, $/galón)",
      "Variación mensual del precio",
      "Inflación mensual Colombia",
      "Inflación anual Colombia",
      "Observaciones",
      "Fuente",
    ),
  );
  const monthly: number[] = [];
  for (let year = 2022; year <= 2025; year += 1)
    months.forEach((month, index) => {
      const row = h.rows.length + 1;
      monthly.push(
        h.add(
          year,
          month,
          formula(`DATE(A${row},${index + 1},1)`, "mmm-yyyy"),
          input("", MONEY),
          monthly.length === 0
            ? null
            : formula(`IF(OR(D${row}="",D${row - 1}=""),"",D${row}/D${row - 1}-1)`, PERCENT),
          input("", PERCENT),
          input("", PERCENT),
          input(""),
          input(""),
        ),
      );
    });
  h.blank();
  h.add(...section("3. Información anual (2022 a 2025)", 9));
  h.add(
    ...header(
      "Año",
      "Precio promedio anual del insumo clave",
      "Inflación anual Colombia (diciembre)",
      "Variación anual del precio",
      "Fuente",
      "Observaciones",
    ),
  );
  const [m1, m48] = [monthly[0]!, monthly.at(-1)!];
  [2022, 2023, 2024, 2025].forEach((year, index) => {
    const row = h.rows.length + 1;
    const december = monthly[index * 12 + 11]!;
    h.add(
      year,
      formula(`IFERROR(AVERAGEIF($A$${m1}:$A$${m48},A${row},$D$${m1}:$D$${m48}),"")`, MONEY),
      formula(`IF(G${december}="","",G${december})`, PERCENT),
      index === 0 ? null : formula(`IFERROR(B${row}/B${row - 1}-1,"")`, PERCENT),
      input("Promedio de la tabla mensual"),
      input(""),
    );
  });
  h.blank();
  h.add(
    ...section(
      "4. Indicador de demanda del sector (p. ej., pasajeros del Aeropuerto Internacional Matecaña)",
      9,
    ),
  );
  h.add(
    ...header(
      "Año",
      "Mes (si hay dato mensual)",
      "Nacionales",
      "Internacionales",
      "Totales",
      "Variación anual",
      "Fuente",
      "Observaciones",
    ),
  );
  [2022, 2023, 2024, 2025].forEach((year, index) => {
    const row = h.rows.length + 1;
    h.add(
      year,
      input(""),
      input("", UNITS),
      input("", UNITS),
      formula(`IF(AND(C${row}="",D${row}=""),"",C${row}+D${row})`, UNITS),
      index === 0 ? null : formula(`IFERROR(E${row}/E${row - 1}-1,"")`, PERCENT),
      input(""),
      input(""),
    );
  });
  h.blank();
  h.add(...section("5. Nota metodológica", 9));
  for (const text of [
    "Los datos de esta hoja no los descarga StatLab: se consultan en las fuentes de la hoja Fuentes (DANE, Ministerio de Minas y Energía o SICOM, Aerocivil, CITUR) y se escriben en las celdas amarillas.",
    "Si no hay dato mensual de la ciudad (por ejemplo, gasolina en Pereira), se usa la serie nacional o una ciudad comparable como proxy y se deja anotado en Observaciones.",
    "La inflación anual sirve para fijar el crecimiento de precios y costos; la variación del precio del insumo clave, para ajustar el costo por unidad; el indicador de demanda, para el crecimiento de las unidades.",
    "Con estas series se pueden hacer análisis de sensibilidad o simulaciones (por ejemplo, Monte Carlo) sobre los supuestos del flujo de caja.",
  ])
    h.add(...note(text, 9));

  // ── Fuentes ─────────────────────────────────────────────────────────────
  const fuentes = sheetRows();
  fuentes.add({ value: "Fuentes", style: "title" });
  fuentes.add({
    value: "Trazabilidad de los supuestos. Completa el periodo consultado al usar cada fuente.",
    style: "subtitle",
  });
  fuentes.blank();
  fuentes.add(
    ...header(
      "Variable",
      "Fuente",
      "Entidad",
      "Enlace",
      "Periodo consultado",
      "Observación metodológica",
    ),
  );
  for (const row of [
    [
      "Inflación mensual y anual",
      "Índice de Precios al Consumidor (IPC)",
      "DANE",
      "https://www.dane.gov.co",
      "Variación mensual y anual del IPC total nacional.",
    ],
    [
      "Impuesto de renta",
      "Estatuto Tributario, art. 240",
      "DIAN",
      "https://www.dian.gov.co",
      "Tarifa general de personas jurídicas (35 %).",
    ],
    [
      "Ganancia ocasional",
      "Estatuto Tributario, arts. 299 a 317",
      "DIAN",
      "https://www.dian.gov.co",
      "Tarifa del 15 % sobre la utilidad en la venta de activos poseídos dos años o más.",
    ],
    [
      "Precio de los activos (p. ej., vehículos nuevos)",
      "Cotizaciones de concesionarios o proveedores",
      "Proveedores",
      "",
      "Dejar el precio editable en Supuestos y anotar la fecha de la cotización.",
    ],
    [
      "Precio de la gasolina (si aplica)",
      "Precios de combustibles líquidos",
      "Ministerio de Minas y Energía; SICOM",
      "https://www.minenergia.gov.co",
      "Si no hay serie de la ciudad, usar la nacional como proxy.",
    ],
    [
      "Pasajeros nacionales e internacionales (si aplica)",
      "Estadísticas de transporte aéreo",
      "Aerocivil",
      "https://www.aerocivil.gov.co",
      "Aeropuerto Internacional Matecaña (Pereira).",
    ],
    [
      "Turismo y movilidad turística (si aplica)",
      "Centro de Información Turística (CITUR)",
      "Ministerio de Comercio, Industria y Turismo",
      "https://www.citur.gov.co",
      "Llegadas de visitantes y ocupación hotelera de Risaralda.",
    ],
    [
      "SOAT y seguros (si aplica)",
      "Tarifas del SOAT y cotizaciones de seguros",
      "Fasecolda; aseguradoras",
      "https://www.fasecolda.com",
      "Usar la tarifa de la categoría del vehículo.",
    ],
    [
      "Demás supuestos (precio, demanda, costos)",
      "Criterio de quien formula el proyecto",
      "—",
      "",
      "Reemplazar por estudios de mercado o cotizaciones antes de decidir.",
    ],
  ] as const)
    fuentes.add(row[0], row[1], row[2], row[3], input("Por consultar"), row[4]);

  // ── Control de calidad ──────────────────────────────────────────────────
  const q = sheetRows();
  const R = (row: number): string => abs("Resumen", "B", row);
  q.add({ value: "Control de calidad", style: "title" });
  q.add({
    value: "Cada control compara un valor esperado con el observado en el libro.",
    style: "subtitle",
  });
  q.blank();
  q.add(...header("Control", "Valor esperado", "Valor observado", "Estado"));
  const firstCheck = q.rows.length + 1;
  const check = (
    label: string,
    expected: WorkbookEntry,
    observed: WorkbookEntry,
    ok: (row: number) => string,
  ) => {
    const row = q.rows.length + 1;
    q.add(label, expected, observed, formula(`IF(${ok(row)},"OK","Revisar")`));
  };
  const equal = (row: number): string => `ABS(B${row}-C${row})<1`;
  check(
    "Inversión inicial total = activos del año 0 + capital de trabajo",
    formula(
      assetYears !== null && assetValues !== null
        ? `SUMIF(${assetYears},0,${assetValues})+${S(workingCapital)}`
        : S(workingCapital),
      MONEY,
    ),
    formula(R(investmentTotal), MONEY),
    equal,
  );
  check(`Horizonte igual a ${n} años`, n, formula(S(horizon)), (row) => `B${row}=C${row}`);
  check(
    "Tasa de descuento igual a la del escenario exportado",
    { value: data.discountRate, format: PERCENT },
    formula(S(tmar), PERCENT),
    (row) => `ABS(B${row}-C${row})<0.000001`,
  );
  check("Flujo del año 0 negativo", "< 0", formula(F("B", flow), MONEY), (row) => `C${row}<0`);
  check(
    `Valor residual incluido en el año ${n}`,
    formula(
      saleRows.length > 0 ? `SUM(Flujo!$G$${saleRows[0]}:$G$${saleRows.at(-1)})` : "0",
      MONEY,
    ),
    formula(F(last, residual), MONEY),
    equal,
  );
  check("VPN calculado", "Número", formula(R(npv), MONEY), (row) => `ISNUMBER(C${row})`);
  check("TIR calculada", "Número", formula(R(irr), PERCENT), (row) => `ISNUMBER(C${row})`);
  check("Payback calculado", "Número", formula(R(payback), YEARS), (row) => `ISNUMBER(C${row})`);
  check(
    "VPN igual al de StatLab al exportar (cambia si editas supuestos)",
    { value: Math.round(result.npv), format: MONEY },
    formula(R(npv), MONEY),
    equal,
  );
  check(
    "Sin errores (#REF!, #DIV/0!, #VALUE!, #NAME?, #N/A) en el libro",
    0,
    formula(
      [
        `Resumen!A1:C${r.rows.length}`,
        `Supuestos!A1:F${s.rows.length}`,
        `Flujo!A1:${excelColumn(Math.max(n + 1, 6))}${f.rows.length}`,
        `'Data histórica'!A1:I${h.rows.length}`,
      ]
        .map((area) => `SUMPRODUCT(--ISERROR(${area}))`)
        .join("+"),
    ),
    (row) => `C${row}=0`,
  );
  const lastCheck = q.rows.length;
  q.blank();
  q.add(
    { value: "Estado general", style: "highlight" },
    null,
    null,
    formula(
      `IF(COUNTIF(D${firstCheck}:D${lastCheck},"Revisar")=0,"OK","Revisar")`,
      undefined,
      "highlight",
    ),
  );
  q.add(
    ...note(
      "«TIR calculada» o «Payback calculado» en Revisar no siempre es un error: puede que el proyecto no tenga TIR o no se recupere en el horizonte.",
      4,
    ),
  );

  return [
    { name: "Resumen", rows: r.rows, widths: [40, 22, 70] },
    { name: "Supuestos", rows: s.rows, widths: [46, 20, 18, 18, 22, 20] },
    {
      name: "Flujo",
      rows: f.rows,
      widths: [52, ...years.map(() => 17), 17, 17, 17, 17, 17, 17],
      freeze: { rows: T, columns: 1 },
    },
    { name: "Data histórica", rows: h.rows, widths: [10, 14, 12, 26, 14, 14, 14, 24, 24] },
    { name: "Fuentes", rows: fuentes.rows, widths: [40, 40, 34, 30, 20, 60] },
    { name: "Control de calidad", rows: q.rows, widths: [62, 22, 22, 12] },
  ];
}
