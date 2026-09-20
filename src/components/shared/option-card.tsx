import type { ComponentType, ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface OptionCardProps {
  /** Identificador único, usado como `id`/`htmlFor` y `value` en modo radio. */
  id: string;
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** "checkbox" (selección múltiple) o "radio" (dentro de un RadioGroup). */
  type?: "checkbox" | "radio";
  disabled?: boolean;
  /** Motivo visible cuando `disabled` es true (docs/05-diseno.md #6). */
  disabledReason?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Tarjeta grande de selección (checkbox o radio) con título, descripción de
 * una línea e ícono opcional. Usada para elegir cálculos y gráficas.
 */
export function OptionCard({
  id,
  title,
  description,
  icon: Icon,
  checked,
  onCheckedChange,
  type = "checkbox",
  disabled = false,
  disabledReason,
  className,
  children,
}: OptionCardProps) {
  const card = (
    <label
      htmlFor={id}
      className={cn(
        "border-border bg-card flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors",
        !disabled && "hover:border-primary/60",
        checked && !disabled && "border-primary bg-primary/5",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {type === "checkbox" ? (
          <Checkbox
            id={id}
            checked={checked ?? false}
            disabled={disabled}
            onCheckedChange={(value) => onCheckedChange?.(value === true)}
            {...(disabled && disabledReason ? { "aria-describedby": `${id}-disabled-reason` } : {})}
          />
        ) : (
          <RadioGroupItem
            id={id}
            value={id}
            disabled={disabled}
            {...(disabled && disabledReason ? { "aria-describedby": `${id}-disabled-reason` } : {})}
          />
        )}
        {Icon ? <Icon className="text-muted-foreground size-5 shrink-0" /> : null}
        <div className="flex-1">
          <span className="text-foreground block text-base font-medium">{title}</span>
          {description ? (
            <span className="text-muted-foreground mt-0.5 block text-sm">{description}</span>
          ) : null}
        </div>
      </div>
      {disabled && disabledReason ? (
        <p id={`${id}-disabled-reason`} className="text-muted-foreground pl-8 text-sm">
          {disabledReason}
        </p>
      ) : null}
      {children}
    </label>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    );
  }

  return card;
}
