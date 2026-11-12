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
  icon?: ComponentType<{ className?: string | undefined }>;
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
 * Fila de lista de selección (checkbox o radio) dentro de una hoja: casilla a
 * la izquierda alineada con la primera línea del título, descripción secundaria
 * y miniatura opcional. Las filas se separan por renglones; marcada = tinte de acción.
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
        "border-rule flex min-h-11 cursor-pointer flex-col gap-2 rounded-md border-t px-3 py-3 transition-colors duration-[120ms] first:border-t-0",
        "has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 [&_[data-slot=checkbox]:focus-visible]:shadow-none [&_[data-slot=checkbox]:focus-visible]:outline-none [&_[data-slot=radio-group-item]:focus-visible]:shadow-none [&_[data-slot=radio-group-item]:focus-visible]:outline-none",
        !disabled && "hover:bg-secondary",
        checked && !disabled && "bg-accent hover:bg-accent",
        disabled && "text-muted-foreground cursor-not-allowed",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-6 shrink-0 items-center">
          {type === "checkbox" ? (
            <Checkbox
              id={id}
              checked={checked ?? false}
              disabled={disabled}
              onCheckedChange={(value) => onCheckedChange?.(value === true)}
              {...(disabled && disabledReason
                ? { "aria-describedby": `${id}-disabled-reason` }
                : {})}
            />
          ) : (
            <RadioGroupItem
              id={id}
              value={id}
              disabled={disabled}
              {...(disabled && disabledReason
                ? { "aria-describedby": `${id}-disabled-reason` }
                : {})}
            />
          )}
        </span>
        {Icon ? <Icon className="text-muted-foreground h-6 w-8 shrink-0" /> : null}
        <div className="flex-1">
          <span
            className={cn(
              "block text-base leading-6 font-semibold",
              disabled ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {title}
          </span>
          {description ? (
            <span className="text-muted-foreground mt-0.5 block text-sm leading-snug">
              {description}
            </span>
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
