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

/**
 * Tarjeta de métrica de resultados (docs/05-diseno.md #5e).
 *
 * Orden de lectura fijo: etiqueta → cifra → contexto, con la cifra alineada
 * al mismo punto en todas las tarjetas de una fila (`min-h` en la zona de
 * etiqueta y `mt-auto` en el pie) para que la rejilla tenga ritmo aunque los
 * nombres de las medidas ocupen una o dos líneas.
 */
export function MetricCard(props: MetricCardProps) {
  const { name, badge, meaning, purpose, formula, className } = props;
  const hasHelp = Boolean(meaning || purpose || formula);

  return (
    <div
      className={cn(
        "sl-surface group flex min-h-[8.5rem] flex-col gap-3 p-4 transition-colors sm:p-5",
        className,
      )}
    >
      <div className="flex min-h-[2.1rem] items-start justify-between gap-2">
        <span className="sl-label pt-0.5">{name}</span>
        {hasHelp ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Qué significa ${name}`}
                className="text-muted-foreground/60 hover:text-foreground hover:bg-secondary -mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
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
        <div className="mt-auto">
          <p className="text-muted-foreground/80 text-sm font-medium">No disponible</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{props.reason}</p>
        </div>
      ) : (
        <p className="sl-number text-foreground mt-auto text-[2rem] leading-none break-words">
          {props.value}
          {props.unit ? (
            <span className="text-muted-foreground ml-1 align-baseline text-base font-medium">
              {props.unit}
            </span>
          ) : null}
        </p>
      )}

      {badge ? (
        <Badge variant="secondary" className="w-fit text-[0.6875rem] font-medium">
          {badge}
        </Badge>
      ) : null}
    </div>
  );
}
