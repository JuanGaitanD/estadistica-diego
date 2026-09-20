import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /**
   * Densidad del relleno interior. "comfortable" (por defecto) para bloques de
   * contenido; "compact" para agrupaciones densas dentro de un listado.
   */
  density?: "comfortable" | "compact";
  className?: string;
}

/** Tarjeta genérica con título, descripción opcional y zona de acciones. */
export function SectionCard({
  title,
  description,
  actions,
  children,
  density = "comfortable",
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "sl-surface",
        density === "comfortable" ? "p-5 sm:p-7" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="border-rule mb-5 flex items-start justify-between gap-4 border-b pb-4">
        <div className="min-w-0">
          <h2 className="text-card-foreground text-lg leading-snug font-semibold">{title}</h2>
          {description ? (
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
