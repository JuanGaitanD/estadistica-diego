import { describe, expect, it } from "vitest";
import { detectColumnDecimal, parseLocaleNumber } from "./parse-number";
import { buildDataset } from "./build-dataset";

describe("parseLocaleNumber", () => {
  it("interpreta enteros simples", () => {
    expect(parseLocaleNumber("42").value).toBe(42);
    expect(parseLocaleNumber("-7").value).toBe(-7);
  });

  it("interpreta decimales con coma (es) cuando hay 1-2 dígitos tras el separador", () => {
    expect(parseLocaleNumber("1,5").value).toBe(1.5);
    expect(parseLocaleNumber("1,50").value).toBe(1.5);
  });

  it("interpreta decimales con punto (en) cuando hay 1-2 dígitos tras el separador", () => {
    expect(parseLocaleNumber("1.5").value).toBe(1.5);
  });

  it("desambigua correctamente cuando aparecen ambos separadores", () => {
    expect(parseLocaleNumber("1.234,56").value).toBeCloseTo(1234.56, 10);
    expect(parseLocaleNumber("1,234.56").value).toBeCloseTo(1234.56, 10);
  });

  it("marca ambigüedad cuando hay 3 dígitos tras un único separador", () => {
    const result = parseLocaleNumber("1,234");
    expect(result.ambiguous).toBe(true);
    expect(result.value).toBe(1234);
  });

  it("fuerza el formato explícito sin ambigüedad", () => {
    const es = parseLocaleNumber("1,234", "es");
    expect(es.ambiguous).toBe(false);
    expect(es.value).toBeCloseTo(1.234, 10);

    const en = parseLocaleNumber("1,234", "en");
    expect(en.ambiguous).toBe(false);
    expect(en.value).toBe(1234);
  });

  it("devuelve null para cadenas vacías o no numéricas", () => {
    expect(parseLocaleNumber("").value).toBeNull();
    expect(parseLocaleNumber("abc").ambiguous).toBe(false);
  });
});

describe("parseLocaleNumber · casos límite en automático", () => {
  it("sin pruebas en la columna, 4.125 y 1,234 siguen siendo miles y avisan", () => {
    for (const raw of ["4.125", "1,234"]) {
      const result = parseLocaleNumber(raw);
      expect(result.value).toBe(raw === "4.125" ? 4125 : 1234);
      expect(result.ambiguous).toBe(true);
    }
  });

  it("1.234.567 y 1,234,567 son miles repetidos", () => {
    expect(parseLocaleNumber("1.234.567")).toMatchObject({ value: 1234567, ambiguous: false });
    expect(parseLocaleNumber("1,234,567")).toMatchObject({ value: 1234567, ambiguous: false });
    expect(parseLocaleNumber("-12.345.678").value).toBe(-12345678);
  });

  it("grupos mal formados no son un número", () => {
    for (const raw of ["1.2.3", "1,2,3", "1.234.56", "0.123.456", "1234.567.890"]) {
      expect(parseLocaleNumber(raw).value, raw).toBeNull();
    }
  });

  it("1,5, 1.5 y 12.5 son decimales; 1.234,5 y 1,234.5 llevan miles", () => {
    expect(parseLocaleNumber("1,5").value).toBe(1.5);
    expect(parseLocaleNumber("12.5").value).toBe(12.5);
    expect(parseLocaleNumber("1.234,5").value).toBe(1234.5);
    expect(parseLocaleNumber("1,234.5").value).toBe(1234.5);
  });

  it("una parte entera que no puede ser un grupo de miles hace decimal al separador", () => {
    for (const [raw, value] of [
      ["0.125", 0.125],
      ["0,125", 0.125],
      ["-0.125", -0.125],
      [".125", 0.125],
      ["1234.567", 1234.567],
      ["12345,678", 12345.678],
    ] as const) {
      expect(parseLocaleNumber(raw), raw).toMatchObject({ value, ambiguous: false });
    }
  });

  it("con decimal de columna punto, 4.125 es 4,125 y 1,234 es 1234", () => {
    expect(parseLocaleNumber("4.125", undefined, ".")).toMatchObject({
      value: 4.125,
      ambiguous: false,
    });
    expect(parseLocaleNumber("1,234", undefined, ".")).toMatchObject({
      value: 1234,
      ambiguous: false,
    });
  });

  it("con decimal de columna coma, 4,125 es 4,125 y 1.234 es 1234", () => {
    expect(parseLocaleNumber("4,125", undefined, ",")).toMatchObject({
      value: 4.125,
      ambiguous: false,
    });
    expect(parseLocaleNumber("1.234", undefined, ",")).toMatchObject({
      value: 1234,
      ambiguous: false,
    });
  });

  it("el formato forzado ignora la columna", () => {
    expect(parseLocaleNumber("4.125", "es", ".").value).toBe(4125);
    expect(parseLocaleNumber("4.125", "en", ",").value).toBe(4.125);
  });
});

describe("detectColumnDecimal", () => {
  it("el punto es decimal si alguna celda lo usa así", () => {
    expect(detectColumnDecimal(["2.5", "3.75", "4.125"])).toBe(".");
  });

  it("la coma es decimal si alguna celda lo usa así", () => {
    expect(detectColumnDecimal(["2,5", "3,75", "4,125"])).toBe(",");
  });

  it("un punto de miles prueba que el decimal es la coma, y al revés", () => {
    expect(detectColumnDecimal(["1.234.567", "4,125"])).toBe(",");
    expect(detectColumnDecimal(["1.234,5", "4,125"])).toBe(",");
    expect(detectColumnDecimal(["1,234.5", "4,125"])).toBe(".");
    expect(detectColumnDecimal(["1,234,567", "4.125"])).toBe(".");
  });

  it("sin pruebas (solo celdas ambiguas o enteros) no decide", () => {
    expect(detectColumnDecimal(["4.125", "2.500", "7"])).toBeUndefined();
    expect(detectColumnDecimal(["10", "20", "abc", ""])).toBeUndefined();
  });

  it("pruebas contradictorias en la misma columna no deciden", () => {
    expect(detectColumnDecimal(["2.5", "3,5"])).toBeUndefined();
    expect(detectColumnDecimal(["1.234.567", "2.5"])).toBeUndefined();
  });
});

describe("buildDataset · decimal Automático", () => {
  const build = (values: readonly string[], numberFormat?: "es" | "en") =>
    buildDataset(
      values.map((v) => [v]),
      { source: "texto", headers: ["x"], ...(numberFormat ? { numberFormat } : {}) },
    );

  it("lee 4.125 como 4,125 cuando el resto de la columna usa punto decimal", () => {
    const column = build(["2.5", "3.75", "4.125", "5.0"]).columns[0];
    expect(column?.values).toEqual([2.5, 3.75, 4.125, 5]);
    expect(column?.variable.decimals).toBe(3);
  });

  it("sin aviso de decimal ambiguo cuando la columna lo resuelve", () => {
    const dataset = build(["2.5", "4.125"]);
    expect(dataset.warnings.some((w) => w.code === "decimal-ambiguo")).toBe(false);
  });

  it("columna solo con 4.125 sigue leyéndose como miles y avisa", () => {
    const dataset = build(["4.125", "3.750"]);
    expect(dataset.columns[0]?.values).toEqual([4125, 3750]);
    expect(dataset.warnings.some((w) => w.code === "decimal-ambiguo")).toBe(true);
  });

  it("columna con coma decimal: 1.234 es mil doscientos treinta y cuatro", () => {
    expect(build(["1,5", "1.234", "2,25"]).columns[0]?.values).toEqual([1.5, 1234, 2.25]);
  });

  it("columnas distintas se resuelven por separado", () => {
    const dataset = buildDataset(
      [
        ["2.5", "1,5"],
        ["4.125", "4,125"],
      ],
      { source: "texto", headers: ["a", "b"] },
    );
    expect(dataset.columns.map((c) => c.values)).toEqual([
      [2.5, 4.125],
      [1.5, 4.125],
    ]);
  });

  it("con formato forzado nada cambia: es lee 4.125 como 4125 y en como 4,125", () => {
    expect(build(["2.5", "4.125"], "es").columns[0]?.values[1]).toBe(4125);
    expect(build(["2.5", "4.125"], "en").columns[0]?.values[1]).toBe(4.125);
  });
});
