import type { ComponentType, ReactNode } from "react";
import { TallyMarks } from "@/components/layout/tally-marks";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Por defecto lleva un grupo de palotes incompleto (cuatro rayas, sin la quinta). */
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}

/** Estado vacío estándar (docs/05-diseno.md #7: mensajes en lenguaje llano). */
export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "border-rule bg-card flex flex-col items-center gap-3 rounded-[var(--radius)] border px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon className="text-muted-foreground size-6" aria-hidden="true" />
      ) : (
        <TallyMarks count={4} className="text-muted-foreground" />
      )}
      <p className="text-foreground text-lg font-semibold">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-md text-base">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
