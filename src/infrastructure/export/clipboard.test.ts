import { afterEach, describe, expect, it, vi } from "vitest";

import { ClipboardError, copyText, tableToTsv } from "./clipboard";

describe("tableToTsv", () => {
  it("une con tabuladores y saltos, y limpia celdas con tabuladores", () => {
    expect(
      tableToTsv(
        ["Valor", "fi"],
        [
          ["Bogotá", 10],
          ["Cali\tnorte", 4],
        ],
      ),
    ).toBe("Valor\tfi\nBogotá\t10\nCali norte\t4");
  });

  it("al pegar en Excel no ejecuta celdas que empiezan como fórmula", () => {
    expect(
      tableToTsv(
        ['=HYPERLINK("http://x")', "fi"],
        [
          ["=1+1", -3],
          ["+57 300", 1],
          ["@SUMA(A1)", 2],
          ["-0,4", 3],
          ["- ruido", 4],
        ],
      ),
    ).toBe(
      "'=HYPERLINK(\"http://x\")\tfi\n'=1+1\t-3\n'+57 300\t1\n'@SUMA(A1)\t2\n-0,4\t3\n'- ruido\t4",
    );
  });
});

describe("copyText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa navigator.clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copyText("hola");
    expect(writeText).toHaveBeenCalledWith("hola");
  });

  it("falla con mensaje en español si no hay portapapeles", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyText("x")).rejects.toBeInstanceOf(ClipboardError);
  });
});
