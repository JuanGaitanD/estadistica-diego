import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface HelpHintProps {
  /** Texto explicativo mostrado en el tooltip. */
  label: string;
  className?: string;
}

/** Ícono ⓘ con tooltip accesible, para aclaraciones breves en lenguaje llano. */
export function HelpHint({ label, className }: HelpHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none",
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
