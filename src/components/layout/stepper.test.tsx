import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Stepper } from "@/components/layout/stepper";

const steps = [
  { id: "a", title: "Datos" },
  { id: "b", title: "Variables" },
  { id: "c", title: "Resultados" },
];

describe("Stepper", () => {
  it("marca el paso actual con aria-current", () => {
    render(<Stepper steps={steps} currentIndex={1} />);
    const current = screen.getByRole("button", { name: /paso 2: variables \(actual\)/i });
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("permite navegar hacia un paso completado con click", async () => {
    const user = userEvent.setup();
    const onStepSelect = vi.fn();
    render(<Stepper steps={steps} currentIndex={2} onStepSelect={onStepSelect} />);

    await user.click(screen.getByRole("button", { name: /paso 1: datos \(completado\)/i }));
    expect(onStepSelect).toHaveBeenCalledWith(0);
  });

  it("permite navegar hacia atrás con teclado (Enter)", async () => {
    const user = userEvent.setup();
    const onStepSelect = vi.fn();
    render(<Stepper steps={steps} currentIndex={2} onStepSelect={onStepSelect} />);

    const button = screen.getByRole("button", { name: /paso 2: variables \(completado\)/i });
    button.focus();
    await user.keyboard("{Enter}");
    expect(onStepSelect).toHaveBeenCalledWith(1);
  });

  it("no permite navegar hacia un paso pendiente (deshabilitado)", () => {
    const onStepSelect = vi.fn();
    render(<Stepper steps={steps} currentIndex={0} onStepSelect={onStepSelect} />);

    const pending = screen.getByRole("button", { name: /paso 3: resultados \(pendiente\)/i });
    expect(pending).toBeDisabled();
  });
});
