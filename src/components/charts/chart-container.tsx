import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ChartContainerProps {
  /** Identificador único, útil para exportación (captura/descarga) posterior. */
  id: string;
  title: string;
  description?: string;
  /** Botones de acción (p. ej. "Descargar imagen"). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Envoltorio visual para gráficas: título, descripción y zona de acciones.
 * No renderiza ninguna librería de gráficas todavía (fase de base visual).
 */
export function ChartContainer({
  id,
  title,
  description,
  actions,
  children,
  className,
}: ChartContainerProps) {
  return (
    <figure id={id} className={cn("border-border bg-card rounded-lg border p-4 sm:p-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-card-foreground text-base font-semibold">{title}</h3>
          {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="min-h-[280px] w-full sm:min-h-[360px]">{children}</div>
    </figure>
  );
}
