import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}

/** Estado vacío estándar (docs/05-diseno.md #7: mensajes en lenguaje llano). */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "border-rule bg-muted/30 flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <span className="bg-secondary text-muted-foreground mb-1 flex size-12 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-foreground text-base font-semibold">{title}</p>
      {description ? <p className="text-muted-foreground max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
