import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartDownloadButton } from "./chart-download-button";
import { CopyButton } from "./copy-button";

describe("botones secundarios de las gráficas", () => {
  it("Copiar, PNG y SVG miden al menos 44 × 44 px", () => {
    render(
      <>
        <ChartDownloadButton elementId="x" filename="x.png" />
        <CopyButton what="la lectura" getText={() => "texto"} />
      </>,
    );
    const buttons = [
      screen.getByRole("button", { name: "Copiar" }),
      screen.getByRole("button", { name: "Descargar la gráfica en PNG" }),
      screen.getByRole("button", { name: "Descargar la gráfica en SVG" }),
      screen.getByRole("button", { name: /la lectura/ }),
    ];
    for (const button of buttons) {
      expect(button).toHaveClass("h-11", "min-w-11");
      // tailwind-merge quita la altura del tamaño pequeño.
      expect(button).not.toHaveClass("h-9");
    }
  });
});
