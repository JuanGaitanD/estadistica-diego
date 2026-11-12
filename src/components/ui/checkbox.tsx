"use client";

import * as React from "react";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

/*
 * Casilla: caja operable de 24×24 (mínimo AA) con el cuadro dibujado de 20×20, radio 3
 * y borde de 1,5 px. Marcada: relleno de acción y marca en --sobre-accion. Con puntero
 * grueso el área sube a 44 px; la etiqueta que la envuelve completa la fila.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative size-6 shrink-0 rounded-sm disabled:cursor-not-allowed pointer-coarse:after:absolute pointer-coarse:after:-inset-2.5",
        "before:border-input before:bg-card hover:before:border-muted-foreground before:absolute before:inset-0.5 before:rounded-sm before:border-[1.5px] before:transition-[background-color,border-color] before:duration-[120ms] before:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:before:transition-none",
        "data-[state=checked]:before:border-primary data-[state=checked]:before:bg-primary data-[state=checked]:text-primary-foreground",
        "disabled:before:border-border disabled:before:bg-secondary aria-invalid:before:border-destructive",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="relative z-10 grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
