import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Tarjeta genérica con título, descripción opcional y zona de acciones. */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("border-border bg-card rounded-lg border p-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-card-foreground text-xl font-semibold">{title}</h2>
          {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
