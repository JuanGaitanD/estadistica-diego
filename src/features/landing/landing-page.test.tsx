import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LandingPage } from "./landing-page";

describe("LandingPage", () => {
  it("presenta el lema, lleva a la app y muestra la interpretación real", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Estadística que se entiende",
    );
    const starts = screen.getAllByRole("link", { name: /Empezar con mis datos/ });
    expect(starts.every((link) => link.getAttribute("href") === "/app")).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /Probar con datos de ejemplo/ })
        .every((link) => link.getAttribute("href") === "/app#ejemplo"),
    ).toBe(true);
    expect(screen.getAllByText(/El valor típico es 3,74/).length).toBeGreaterThan(0);
    expect(screen.queryByText("En construcción")).toBeNull();
    expect(screen.getByRole("button", { name: /demostración/ })).toBeTruthy();
  });
});
