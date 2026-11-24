import { describe, expect, it } from "vitest";

import {
  bestScenario,
  cashFlowSteps,
  describeCashFlow,
  fixedPayment,
  formatMoney,
  internalRateOfReturn,
  loanSchedule,
  netPresentValue,
  projectCashFlow,
  projectDemand,
  validateCashFlowInput,
  type CashFlowInput,
} from "./cash-flow";

/**
 * Caso de referencia: «Confecciones Otún S.A.S.» (ejercicio de evaluación de
 * proyectos), resuelto a mano en Excel. Año 0 = 2025, años 1..5 = 2026–2030.
 */
const OTUN: CashFlowInput = {
  years: 5,
  demand: [27240, 29100, 30960, 32820, 34680],
  price: 65000,
  priceGrowth: 0,
  costs: [
    { name: "Costos fijos", kind: "fijo", amount: 680_000_000 },
    { name: "Costo variable", kind: "por-unidad", amount: 38000 },
  ],
  costGrowth: 0,
  assets: [
    {
      name: "Maquinaria",
      value: 180_000_000,
      year: 0,
      life: 8,
      residual: 20_000_000,
      salvage: 105_000_000,
    },
    { name: "Adecuación", value: 40_000_000, year: 0, life: 5, residual: 0, salvage: 0 },
  ],
  workingCapital: 30_000_000,
  loans: [
    { name: "Banco", kind: "cuota-fija", amount: 100_000_000, rate: 0.15, term: 4 },
    { name: "Socios", kind: "intereses-anuales", amount: 60_000_000, rate: 0.11, term: 5 },
  ],
  taxRate: 0.35,
  gainTaxRate: 0.35,
  equityRate: 0.22,
};

describe("caso Confecciones Otún (Excel resuelto a mano)", () => {
  const result = projectCashFlow(OTUN);

  it("proyecta la demanda con la recta de mínimos cuadrados (Y = 16.080 + 1.860X)", () => {
    expect(projectDemand([18000, 19800, 21500, 23600, 25400], 5, 1)).toEqual(OTUN.demand);
  });

  it("deprecia sobre el costo menos el valor residual y grava la venta", () => {
    expect(result.rows[1]?.depreciation).toBe(28_000_000);
    expect(result.assetSales[0]).toMatchObject({
      bookValue: 80_000_000,
      gain: 25_000_000,
      tax: 8_750_000,
      flow: 96_250_000,
    });
  });

  it("WACC con el costo de la deuda después de impuestos", () => {
    expect(result.sources.map((source) => source.amount)).toEqual([
      100_000_000, 60_000_000, 90_000_000,
    ]);
    expect(result.sources[0]?.cost).toBeCloseTo(0.0975, 10);
    expect(result.discountRate).toBeCloseTo(0.13536, 10);
  });

  it("flujo del proyecto: sin intereses, al WACC", () => {
    const expected = [-250_000_000, 45_862_000, 78_505_000, 111_148_000, 143_791_000, 302_684_000];
    result.rows.forEach((row, index) => expect(row.netFlow).toBeCloseTo(expected[index] ?? 0, 4));
    expect(result.npv).toBeCloseTo(174_220_714.54626, 3);
    expect(result.irr).toBeCloseTo(0.321610737785465, 8);
    expect(result.payback).toBeCloseTo(3.10073648559367, 8);
    expect(result.discountedPayback).toBeCloseTo(3.84078969254136, 8);
    expect(result.verdict).toBe("rentable");
  });

  it("flujo del inversionista: con préstamos y abonos, a la TIO de los socios", () => {
    const investor = result.investor!;
    const expected = [
      -90_000_000, 11_795_464.8409142, 43_387_071.7450622, 74_820_969.6848324, 106_073_502.315568,
      238_394_000,
    ];
    investor.rows.forEach((row, index) => expect(row.netFlow).toBeCloseTo(expected[index] ?? 0, 4));
    expect(investor.equity).toBe(90_000_000);
    expect(investor.rows[1]?.interest).toBeCloseTo(21_600_000, 4);
    expect(investor.rows[5]?.principal).toBeCloseTo(60_000_000, 4);
    expect(investor.npv).toBeCloseTo(126_110_063.389092, 3);
    expect(investor.irr).toBeCloseTo(0.553939505676435, 8);
    expect(investor.payback).toBeCloseTo(2.46534365380033, 8);
    expect(investor.discountedPayback).toBeCloseTo(3.20836908441992, 8);
  });

  it("lo lee en llano: proyecto al WACC y socios a su TIO, con apalancamiento", () => {
    const text = describeCashFlow(OTUN, result);
    expect(text.headline).toMatch(/^Se recomienda: con el costo de capital \(WACC\) del 13,54 %/);
    expect(text.details.join(" ")).toMatch(
      /socios, que ponen \$90\.000\.000.*TIO del 22,00 %.*apalancamiento/,
    );
  });

  it("sin préstamos, el WACC es la TIO y no hay flujo del inversionista", () => {
    const free = projectCashFlow({ ...OTUN, loans: [] });
    expect(free.discountRate).toBe(0.22);
    expect(free.investor).toBeNull();
  });
});

/** Caso Café Cordillera (clase), con la deuda del banco y de los socios. */
const CORDILLERA: CashFlowInput = {
  years: 5,
  demand: [63900, 67900, 71900, 75900, 79900],
  price: 12000,
  priceGrowth: 0,
  costs: [
    { name: "Costos fijos", kind: "fijo", amount: 230_000_000 },
    { name: "Costo variable", kind: "por-unidad", amount: 7500 },
  ],
  costGrowth: 0,
  assets: [
    {
      name: "Maquinaria",
      value: 150_000_000,
      year: 0,
      life: 10,
      residual: 0,
      salvage: 90_000_000,
    },
    {
      name: "Adecuación de la planta",
      value: 30_000_000,
      year: 0,
      life: 5,
      residual: 0,
      salvage: 0,
    },
  ],
  workingCapital: 20_000_000,
  loans: [
    { name: "Banco", kind: "cuota-fija", amount: 80_000_000, rate: 0.14, term: 4 },
    { name: "Socios", kind: "capitalizable", amount: 50_000_000, rate: 0.1, term: 5 },
  ],
  taxRate: 0.35,
  gainTaxRate: 0.15,
  equityRate: 0.2,
};

describe("caso Café Cordillera", () => {
  const result = projectCashFlow(CORDILLERA);

  it("proyecta la demanda saltando el año 0", () => {
    // 2021–2025: Ŷ = 35.900 + 4.000·X; 2026 (X = 6) es el año 0 y el año 1 es X = 7.
    expect(projectDemand([40000, 44000, 47500, 52000, 56000], 5, 2)).toEqual(CORDILLERA.demand);
    expect(projectDemand([40000, 44000, 47500, 52000, 56000], 1)).toEqual([59900]);
  });

  it("ingresos, egresos y depreciación de cada año; los socios ponen el resto", () => {
    const [, y1, , , , y5] = result.rows;
    expect(y1?.revenue).toBe(766_800_000);
    expect(y1?.costs).toBe(709_250_000);
    expect(y1?.depreciation).toBe(21_000_000);
    expect(y5?.assetSale).toBeCloseTo(87_750_000, 4);
    expect(result.investor?.equity).toBe(70_000_000);
  });

  it("con «Todo al final», el inversionista paga capital e intereses en el último año", () => {
    const investor = result.investor!;
    // Año 1: el interés causado del préstamo de socios no se paga (abono negativo).
    expect(investor.rows[1]?.principal).toBeCloseTo(16_256_382.662243 - 5_000_000, 4);
    // Lo que sale de caja en total = lo que se pagó: cuotas del banco y el pago final de los socios.
    const cash = investor.rows.reduce((sum, row) => sum + row.interest + row.principal, 0);
    expect(cash).toBeCloseTo(4 * 27_456_382.662243 + 80_525_500, 3);
  });
});

describe("préstamos", () => {
  it("cuota fija como PAGO y la tabla del banco", () => {
    expect(fixedPayment(80_000_000, 0.14, 4)).toBeCloseTo(27_456_382.662243, 4);
    const rows = loanSchedule(CORDILLERA.loans[0]!);
    expect(rows[1]?.amortization).toBeCloseTo(16_256_382.662243, 4);
    expect(rows[4]?.balance).toBe(0);
  });

  it("capitalizable: el saldo crece y se paga todo al final", () => {
    const rows = loanSchedule(CORDILLERA.loans[1]!);
    expect(rows.map((row) => Math.round(row.balance))).toEqual([
      50_000_000, 55_000_000, 60_500_000, 66_550_000, 73_205_000, 0,
    ]);
    expect(rows[5]?.payment).toBeCloseTo(80_525_500, 4);
  });

  it("intereses cada año: el saldo no cambia hasta el último pago", () => {
    const rows = loanSchedule({
      name: "x",
      kind: "intereses-anuales",
      amount: 100,
      rate: 0.1,
      term: 3,
    });
    expect(rows.map((row) => row.payment)).toEqual([0, 10, 10, 110]);
  });
});

describe("inversiones en distintos años", () => {
  it("un activo comprado en el año 2 sale ese año y se deprecia desde el 3", () => {
    const input: CashFlowInput = {
      ...CORDILLERA,
      loans: [],
      assets: [
        ...CORDILLERA.assets,
        { name: "Segunda línea", value: 40_000_000, year: 2, life: 4, residual: 0, salvage: 0 },
      ],
    };
    const rows = projectCashFlow(input).rows;
    expect(rows[2]?.investment).toBe(-40_000_000);
    expect(rows[2]?.depreciation).toBe(21_000_000);
    expect(rows[3]?.depreciation).toBe(31_000_000);
    // Al final le quedan 10 millones en libros y se vende por 0: no paga ganancia ocasional.
    expect(projectCashFlow(input).assetSales[2]?.bookValue).toBe(10_000_000);
  });
});

describe("validateCashFlowInput", () => {
  it("acepta el caso de referencia y rechaza datos imposibles", () => {
    expect(validateCashFlowInput(CORDILLERA)).toBeNull();
    expect(validateCashFlowInput({ ...CORDILLERA, years: 0 })).toMatch(/horizonte/);
    expect(validateCashFlowInput({ ...CORDILLERA, demand: [1, 2] })).toMatch(/unidades/);
    expect(validateCashFlowInput({ ...CORDILLERA, taxRate: 1 })).toMatch(/impuestos/);
    expect(validateCashFlowInput({ ...CORDILLERA, equityRate: -1 })).toMatch(/tasas/);
    expect(validateCashFlowInput({ ...CORDILLERA, price: Number.NaN })).toMatch(/número/);
    expect(
      validateCashFlowInput({
        ...CORDILLERA,
        assets: [{ name: "Horno", value: 10, year: 9, life: 2, residual: 0, salvage: 0 }],
      }),
    ).toMatch(/año de compra de Horno/);
    expect(
      validateCashFlowInput({
        ...CORDILLERA,
        assets: [{ name: "Horno", value: 10, year: 0, life: 2.5, residual: 0, salvage: 0 }],
      }),
    ).toMatch(/vida útil de Horno.*entero/);
    expect(
      validateCashFlowInput({
        ...CORDILLERA,
        loans: [{ name: "Banco", kind: "cuota-fija", amount: 10, rate: 0.1, term: 0 }],
      }),
    ).toMatch(/plazo de Banco/);
    expect(
      validateCashFlowInput({ ...CORDILLERA, assets: [], workingCapital: 0, loans: [] }),
    ).toMatch(/sin inversión/);
    expect(
      validateCashFlowInput({
        ...CORDILLERA,
        assets: [{ ...CORDILLERA.assets[0]!, residual: 200_000_000 }],
      }),
    ).toMatch(/residual contable de Maquinaria/);
    expect(
      validateCashFlowInput({
        ...CORDILLERA,
        loans: [{ name: "Banco", kind: "cuota-fija", amount: 10, rate: 0.1, term: 6 }],
      }),
    ).toMatch(/plazo de Banco.*horizonte/);
    expect(
      validateCashFlowInput({
        ...CORDILLERA,
        loans: [{ name: "Banco", kind: "cuota-fija", amount: 300_000_000, rate: 0.1, term: 4 }],
      }),
    ).toMatch(/superan la inversión del año 0/);
  });
});

describe("indicadores y textos", () => {
  it("VPN y TIR como VNA y TIR de Excel", () => {
    expect(netPresentValue(0.1, [-100, 60, 60])).toBeCloseTo(4.132231, 5);
    expect(internalRateOfReturn([-100, 60, 60])).toBeCloseTo(0.1306624, 6);
    expect(internalRateOfReturn([100, 10, 10])).toBeNull();
  });

  it("da las fórmulas de Excel sobre la fila del flujo de caja", () => {
    const excel = cashFlowSteps(CORDILLERA, projectCashFlow(CORDILLERA)).map((step) => step.excel);
    expect(excel).toContain("=TIR(B16:G16)");
    expect(excel).toContain("=PAGO(0,1400; 4; -80.000.000)");
    const long = { ...CORDILLERA, years: 30, demand: Array<number>(30).fill(70000) };
    expect(cashFlowSteps(long, projectCashFlow(long)).map((step) => step.excel)).toContain(
      "=TIR(B16:AF16)",
    );
  });

  it("elige el escenario rentable con mayor VPN", () => {
    const base = projectCashFlow({ ...CORDILLERA, price: 10000 });
    const better = projectCashFlow({ ...CORDILLERA, price: 13000 });
    const best = projectCashFlow({ ...CORDILLERA, price: 14000 });
    expect(bestScenario([base, best, null, better])).toBe(1);
    expect(bestScenario([base, null])).toBeNull();
  });

  it("costos por rubro: fijo, por unidad y porcentaje de los ingresos", () => {
    const input: CashFlowInput = {
      ...CORDILLERA,
      loans: [],
      priceGrowth: 0.1,
      costGrowth: 0.05,
      costs: [
        { name: "Nómina", kind: "fijo", amount: 100 },
        { name: "Insumos", kind: "por-unidad", amount: 2 },
        { name: "Comisiones", kind: "porcentaje", amount: 0.1 },
      ],
    };
    const rows = projectCashFlow(input).rows;
    const y2 = rows[2]!;
    expect(y2.costItems[0]).toBeCloseTo(105, 8);
    expect(y2.costItems[1]).toBeCloseTo(2 * 67900 * 1.05, 6);
    expect(y2.costItems[2]).toBeCloseTo(0.1 * y2.revenue, 6);
    expect(y2.costs).toBeCloseTo(
      y2.costItems.reduce((a, b) => a + b, 0),
      6,
    );
    expect(
      validateCashFlowInput({
        ...input,
        costs: [{ name: "Comisión", kind: "porcentaje", amount: 1 }],
      }),
    ).toMatch(/Comisión.*100 %/);
  });

  it("revisar supuestos: VPN positivo con un payback de más de dos tercios del horizonte", () => {
    const flat: CashFlowInput = {
      ...CORDILLERA,
      years: 10,
      demand: Array<number>(10).fill(10),
      price: 1,
      loans: [],
      costs: [],
      taxRate: 0,
      equityRate: 0.01,
      assets: [{ name: "Local", value: 100, year: 0, life: 10, residual: 0, salvage: 0 }],
      workingCapital: 0,
    };
    // Ingresos de 10 sin costos ni impuesto: flujo de 10 por año; se recupera en el año 9,3.
    const slow = projectCashFlow({ ...flat, assets: [{ ...flat.assets[0]!, salvage: 30 }] });
    expect(slow.npv).toBeGreaterThan(0);
    expect(slow.verdict).toBe("revisar");
    expect(describeCashFlow(flat, slow).headline).toMatch(/^Revisar supuestos/);
    expect(bestScenario([slow])).toBe(0);
  });

  it("promedios de los años 1..N y margen EBITDA", () => {
    const result = projectCashFlow(CORDILLERA);
    const operating = result.rows.slice(1);
    const ebitda = operating.reduce((sum, row) => sum + row.ebitda, 0);
    expect(result.averageEbitda).toBeCloseTo(ebitda / 5, 6);
    expect(result.ebitdaMargin).toBeCloseTo(
      ebitda / operating.reduce((sum, row) => sum + row.revenue, 0),
      10,
    );
    expect(result.averageFlow).toBeCloseTo(
      operating.reduce((sum, row) => sum + row.netFlow, 0) / 5,
      6,
    );
  });

  it("formatea dinero sin decimales y con signo menos", () => {
    expect(formatMoney(1250000.4)).toBe("$1.250.000");
    expect(formatMoney(-300)).toBe("−$300");
    expect(formatMoney(-0.2)).toBe("$0");
  });
});
