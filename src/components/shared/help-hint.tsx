import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface HelpHintProps {
  /** Texto explicativo mostrado en el tooltip. */
  label: string;
  className?: string;
}

/**
 * Ícono ⓘ con tooltip accesible, para aclaraciones breves en lenguaje llano.
 * Caja de 24×24 y área táctil de 44×44 (pseudo-elemento) con puntero grueso.
 */
export function HelpHint({ label, className }: HelpHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-muted-foreground hover:text-foreground relative inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors pointer-coarse:after:absolute pointer-coarse:after:-inset-2.5",
            className,
          )}
          aria-label={label}
        >
          <Info className="size-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-balance">{label}</TooltipContent>
    </Tooltip>
  );
}
