import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MetricCard } from "@/components/shared/metric-card";

describe("MetricCard", () => {
  it("muestra el valor formateado y la unidad", () => {
    render(<MetricCard name="Media" value="8.34" unit="pts" badge="Tendencia central" />);
    expect(screen.getByText("Media")).toBeInTheDocument();
    expect(screen.getByText("8.34")).toBeInTheDocument();
    expect(screen.getByText("pts")).toBeInTheDocument();
    expect(screen.getByText("Tendencia central")).toBeInTheDocument();
  });

  it("muestra el estado no disponible con su razón", () => {
    render(<MetricCard name="Moda" available={false} reason="Todos los valores son distintos." />);
    expect(screen.getByText("No disponible")).toBeInTheDocument();
    expect(screen.getByText("Todos los valores son distintos.")).toBeInTheDocument();
  });

  it("abre el popover de ayuda con qué significa, para qué sirve y fórmula", async () => {
    const user = userEvent.setup();
    render(
      <MetricCard
        name="Media"
        value="8.34"
        meaning="Es el promedio."
        purpose="Da una idea del centro."
        formula="x̄ = Σxᵢ / n"
      />,
    );

    await user.click(screen.getByRole("button", { name: /qué significa media/i }));
    expect(await screen.findByText("Es el promedio.")).toBeInTheDocument();
    expect(screen.getByText("Da una idea del centro.")).toBeInTheDocument();
    expect(screen.getByText("x̄ = Σxᵢ / n")).toBeInTheDocument();
  });
});
