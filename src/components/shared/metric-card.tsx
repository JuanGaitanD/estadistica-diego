import { HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MetricCardAvailable {
  available?: true;
  /** Valor ya formateado para mostrar (usar `formatNumber`/`formatPercent`). */
  value: string;
  unit?: string;
}

export interface MetricCardUnavailable {
  available: false;
  /** Motivo por el cual la medida no está disponible. */
  reason: string;
}

export type MetricCardProps = (MetricCardAvailable | MetricCardUnavailable) & {
  name: string;
  /** Etiqueta de tipo de medida (ej. "Tendencia central"). */
  badge?: string;
  meaning?: string;
  purpose?: string;
  formula?: string;
  className?: string;
};

/** Tarjeta de métrica de resultados (docs/05-diseno.md #5e). */
export function MetricCard(props: MetricCardProps) {
  const { name, badge, meaning, purpose, formula, className } = props;
  const hasHelp = Boolean(meaning || purpose || formula);

  return (
    <div
      className={cn("border-border bg-card flex flex-col gap-2 rounded-lg border p-4", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {name}
        </span>
        {hasHelp ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Qué significa ${name}`}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <HelpCircle className="size-4" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 text-sm">
              <div className="flex flex-col gap-3">
                {meaning ? (
                  <div>
                    <p className="text-foreground font-semibold">Qué significa</p>
                    <p className="text-muted-foreground">{meaning}</p>
                  </div>
                ) : null}
                {purpose ? (
                  <div>
                    <p className="text-foreground font-semibold">Para qué sirve</p>
                    <p className="text-muted-foreground">{purpose}</p>
                  </div>
                ) : null}
                {formula ? (
                  <div>
                    <p className="text-foreground font-semibold">Fórmula</p>
                    <p className="text-muted-foreground font-mono text-xs">{formula}</p>
                  </div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {props.available === false ? (
        <div>
          <p className="text-muted-foreground text-sm font-medium">No disponible</p>
          <p className="text-muted-foreground mt-0.5 text-sm">{props.reason}</p>
        </div>
      ) : (
        <p className="text-foreground text-4xl font-bold tabular-nums">
          {props.value}
          {props.unit ? (
            <span className="text-muted-foreground ml-1 text-lg font-medium">{props.unit}</span>
          ) : null}
        </p>
      )}

      {badge ? (
        <Badge variant="secondary" className="w-fit">
          {badge}
        </Badge>
      ) : null}
    </div>
  );
}
