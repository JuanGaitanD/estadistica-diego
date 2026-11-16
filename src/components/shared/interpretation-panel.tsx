import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import type { CalculationStep, Interpretation } from "@/core/statistics";
import { cn } from "@/lib/utils";

export interface InterpretationPanelProps {
  interpretation: Interpretation;
  /** Paso a paso; se muestra plegado detrás de «Ver cómo se calculó». */
  steps?: readonly CalculationStep[];
  /** Título visible del bloque. */
  title?: string;
  /** De qué es la interpretación (variable, prueba); distingue el nombre accesible. */
  name?: string;
  /** Acciones (copiar, añadir al informe…), a la derecha del título. */
  actions?: ReactNode;
  className?: string;
}

/** Texto plano de una interpretación, para copiar o exportar. */
export function interpretationToText(interpretation: Interpretation): string {
  return [interpretation.headline, ...interpretation.details, ...interpretation.caveats].join("\n");
}

/**
 * Bloque «Qué significa» (ADR-004): la interpretación en llano va primero y
 * visible; el cálculo queda oculto en un `<details>` nativo cerrado.
 */
export function InterpretationPanel({
  interpretation,
  steps = [],
  title = "Qué significa",
  name,
  actions,
  className,
}: InterpretationPanelProps) {
  return (
    <section
      className={cn("sl-surface border-l-primary border-l-4 p-5 sm:p-6", className)}
      aria-label={name ? `${title}: ${name}` : title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="sl-label pt-1">{title}</p>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <p className="text-foreground mt-3 text-lg leading-relaxed font-medium">
        {interpretation.headline}
      </p>
      {interpretation.details.length > 0 ? (
        <ul className="text-foreground/90 mt-3 flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
          {interpretation.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {interpretation.caveats.length > 0 ? (
        <div className="border-rule bg-muted/50 mt-4 rounded-[var(--radius)] border px-4 py-3 text-sm">
          <p className="font-semibold">Ten en cuenta</p>
          <ul className="text-muted-foreground mt-1 flex list-disc flex-col gap-1 pl-5">
            {interpretation.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {steps.length > 0 ? <StepsDisclosure steps={steps} /> : null}
    </section>
  );
}

/** «Ver cómo se calculó»: pasos con sus números, cerrado por defecto. */
export function StepsDisclosure({ steps }: { steps: readonly CalculationStep[] }) {
  return (
    <details className="border-rule group mt-5 border-t pt-4">
      <summary className="text-primary hover:bg-accent -mx-2 flex min-h-11 w-fit cursor-pointer items-center gap-1 rounded-md px-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-4 transition-transform duration-100 group-open:rotate-90 motion-reduce:transition-none"
        />
        Ver cómo se calculó
      </summary>
      <ol className="mt-4 flex flex-col gap-5">
        {steps.map((step) => (
          <li key={step.title} className="flex flex-col gap-2">
            <p className="font-semibold">{step.title}</p>
            {step.text ? <p className="text-muted-foreground text-sm">{step.text}</p> : null}
            {step.table ? <StepTableView table={step.table} caption={step.title} /> : null}
            {step.formula ? (
              <p className="bg-muted/60 overflow-x-auto rounded-md px-3 py-2 font-mono text-sm">
                {step.formula}
              </p>
            ) : null}
            {step.excel ? (
              <p className="text-muted-foreground text-sm">
                En Excel: <code className="font-mono">{step.excel}</code>
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}

function StepTableView({
  table,
  caption,
}: {
  table: NonNullable<CalculationStep["table"]>;
  caption: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-auto border-collapse font-mono text-sm">
        <caption className="sr-only">Tabla de trabajo: {caption}</caption>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-rule border-b px-3 py-1.5 text-right font-semibold"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-1 text-right">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {table.footer ? (
          <tfoot>
            <tr>
              {table.footer.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-foreground border-t px-3 py-1.5 text-right font-bold"
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
      {table.omittedRows ? (
        <p className="text-muted-foreground mt-1 text-xs">
          … y {table.omittedRows} filas más (se usan todas en el cálculo).
        </p>
      ) : null}
    </div>
  );
}
