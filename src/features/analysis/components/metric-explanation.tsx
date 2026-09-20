import type { Explanation } from "@/core/statistics";
import { cn } from "@/lib/utils";

export interface MetricExplanationProps {
  explanation: Explanation;
  /** Muestra la fórmula (modo docente). Por defecto `true`. */
  showFormula?: boolean;
  className?: string;
}

/**
 * Formato común de los microtextos obligatorios (RF-30): "qué significa",
 * "para qué sirve" y, opcionalmente, la fórmula.
 */
export function MetricExplanation({
  explanation,
  showFormula = true,
  className,
}: MetricExplanationProps) {
  return (
    <div className={cn("flex flex-col gap-2 text-sm", className)}>
      <div>
        <p className="text-foreground font-semibold">Qué significa</p>
        <p className="text-muted-foreground">{explanation.what}</p>
      </div>
      <div>
        <p className="text-foreground font-semibold">Para qué sirve</p>
        <p className="text-muted-foreground">{explanation.why}</p>
      </div>
      {showFormula && explanation.formula ? (
        <div>
          <p className="text-foreground font-semibold">Fórmula</p>
          <p className="text-muted-foreground font-mono text-xs">{explanation.formula}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Versión en una sola línea del microtexto, para `aria-label`, tooltips y
 * atributos `aria-describedby` donde no cabe un bloque.
 *
 * @param explanation - Microtexto del dominio.
 */
export function explanationText(explanation: Explanation): string {
  return `${explanation.what}. ${explanation.why}.`;
}
