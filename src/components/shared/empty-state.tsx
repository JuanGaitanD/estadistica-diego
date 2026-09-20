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
        "border-border flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="text-muted-foreground size-8" aria-hidden="true" />
      <p className="text-foreground text-base font-medium">{title}</p>
      {description ? <p className="text-muted-foreground max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
