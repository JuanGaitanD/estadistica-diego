import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ValueLocator } from "./value-locator";

describe("ValueLocator", () => {
  it("ubica un valor escrito con coma decimal y explica cómo", async () => {
    const user = userEvent.setup();
    render(<ValueLocator variableName="Y" sortedValues={[3, 3, 4, 5, 5]} />);
    await user.type(screen.getByLabelText("Valor"), "4,5");
    await user.click(screen.getByRole("button", { name: "Ubicar" }));
    expect(screen.getByText(/4,5 está en el percentil 63/)).toBeTruthy();
    expect(screen.getByText("Ver cómo se calculó")).toBeTruthy();
  });

  it("explica el error si no es un número", async () => {
    const user = userEvent.setup();
    render(<ValueLocator variableName="Y" sortedValues={[3, 3, 4, 5, 5]} />);
    await user.type(screen.getByLabelText("Valor"), "abc");
    await user.click(screen.getByRole("button", { name: "Ubicar" }));
    expect(screen.getByRole("alert").textContent).toBe("Escribe un número, por ejemplo 4,5.");
  });
});
