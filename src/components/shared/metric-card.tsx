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
  // La moda llega como «3,75 (4 veces)»: la cifra va en mono grande y el conteo en texto secundario.
  const countMatch =
    props.available === false ? null : /^(.*\S)\s+(\(\d+ veces?\))$/.exec(props.value);
  const valueMain = props.available === false ? "" : (countMatch?.[1] ?? props.value);
  const valueCount = countMatch?.[2];

  return (
    <div
      className={cn(
        "sl-surface group grid min-h-[8.5rem] grid-rows-[auto_1fr_auto] gap-3 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex min-h-[2.1rem] items-start justify-between gap-2">
        <span className="sl-label pt-2">{name}</span>
        {hasHelp ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Qué significa ${name}`}
                className="text-muted-foreground hover:text-foreground hover:bg-accent -mt-1 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors"
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
        <div className="self-end">
          <p className="text-foreground text-base font-semibold">No disponible</p>
          <p className="text-muted-foreground mt-1 text-sm leading-snug">{props.reason}</p>
        </div>
      ) : (
        <p className="sl-number text-foreground self-end text-[1.75rem] leading-none break-words">
          {valueMain}
          {valueCount ? (
            <>
              {" "}
              <span className="text-muted-foreground align-baseline text-sm font-medium">
                {valueCount}
              </span>
            </>
          ) : null}
          {props.unit ? (
            <span className="text-muted-foreground ml-1 align-baseline text-sm font-medium">
              {props.unit}
            </span>
          ) : null}
        </p>
      )}

      {!badge ? <span aria-hidden="true" className="h-6" /> : null}
      {badge ? (
        <Badge variant="secondary" className="w-fit font-medium">
          {badge}
        </Badge>
      ) : null}
    </div>
  );
}
