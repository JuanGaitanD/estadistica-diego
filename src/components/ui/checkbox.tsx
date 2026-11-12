"use client";

import * as React from "react";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

/*
 * Casilla de 20×20, radio 3 y borde de 1,5 px. Marcada: relleno de acción y
 * marca en --sobre-accion. El área de pulsación se amplía con un pseudo-elemento
 * (28 px, 44 px en táctil); la etiqueta que la envuelve completa la fila.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-input bg-card hover:border-muted-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:border-border disabled:bg-secondary aria-invalid:border-destructive relative size-5 shrink-0 rounded-sm border-[1.5px] transition-[background-color,border-color] duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] after:absolute after:-inset-1 disabled:cursor-not-allowed motion-reduce:transition-none pointer-coarse:after:-inset-3",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
