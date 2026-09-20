import type { ReactElement, ReactNode } from "react";
import { render, type RenderResult } from "@testing-library/react";

import { TooltipProvider } from "@/components/ui/tooltip";

function Providers({ children }: { children: ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

/** Renderiza un componente con los proveedores globales de la aplicación. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: Providers });
}
