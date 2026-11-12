import * as React from "react";
import { cn } from "cn";

/*
 * Campo del sistema: 44 px, radio 4, borde de 1 px en --borde-campo (3:1) y
 * texto de 16 px (evita el zoom de iOS). El foco lo da la regla global
 * (anillo doble); el borde no cambia al enfocar para que foco y cursor se
 * distingan. Error: borde en --peligro (1 px + 1 px interior, sin mover el texto).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-card text-foreground placeholder:text-muted-foreground file:text-foreground hover:border-muted-foreground disabled:bg-secondary disabled:text-muted-foreground h-11 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[border-color] duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold disabled:pointer-events-none disabled:cursor-not-allowed motion-reduce:transition-none",
        "aria-invalid:border-destructive aria-invalid:hover:border-destructive aria-invalid:shadow-[inset_0_0_0_1px_var(--peligro)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
