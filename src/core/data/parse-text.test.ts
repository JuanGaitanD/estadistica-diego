import { describe, expect, it } from "vitest";
import { detectDelimiter, parsePastedText } from "./parse-text";

describe("detectDelimiter", () => {
  it("detecta coma", () => {
    expect(detectDelimiter(["a,b,c", "1,2,3"])).toBe(",");
  });

  it("detecta punto y coma", () => {
    expect(detectDelimiter(["a;b;c", "1;2;3"])).toBe(";");
  });

  it("detecta tabulador", () => {
    expect(detectDelimiter(["a\tb\tc", "1\t2\t3"])).toBe("\t");
  });

  it("usa coma por defecto cuando no hay delimitador (una columna)", () => {
    expect(detectDelimiter(["1", "2", "3"])).toBe(",");
  });
});

describe("parsePastedText", () => {
  it("parsea una sola columna sin encabezado", () => {
    const result = parsePastedText("1\n2\n3", { hasHeader: false });
    expect(result.headers).toEqual(["Columna 1"]);
    expect(result.rows).toEqual([["1"], ["2"], ["3"]]);
  });

  it("parsea varias columnas con encabezado", () => {
    const result = parsePastedText("edad,ciudad\n20,Lima\n30,Cusco", { hasHeader: true });
    expect(result.headers).toEqual(["edad", "ciudad"]);
    expect(result.rows).toEqual([
      ["20", "Lima"],
      ["30", "Cusco"],
    ]);
  });

  it("parsea varias columnas sin encabezado", () => {
    const result = parsePastedText("20,Lima\n30,Cusco", { hasHeader: false });
    expect(result.headers).toEqual(["Columna 1", "Columna 2"]);
    expect(result.rows).toEqual([
      ["20", "Lima"],
      ["30", "Cusco"],
    ]);
  });

  it("respeta un delimitador forzado", () => {
    const result = parsePastedText("a;b\n1;2", { hasHeader: true, delimiter: ";" });
    expect(result.headers).toEqual(["a", "b"]);
  });

  it("ignora el último salto de línea final", () => {
    const result = parsePastedText("1,2\n3,4\n", { hasHeader: false });
    expect(result.rows).toHaveLength(2);
  });
});
