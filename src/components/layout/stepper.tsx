"use client";

import type { KeyboardEvent } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  title: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** Índice (0-based) del paso actual. */
  currentIndex: number;
  /**
   * Llamado cuando el usuario navega a un paso ya completado (hacia atrás).
   * No se permite avanzar saltando pasos futuros.
   */
  onStepSelect?: (index: number) => void;
  className?: string;
}

type StepStatus = "completed" | "current" | "pending";

function statusFor(index: number, currentIndex: number): StepStatus {
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "current";
  return "pending";
}

/**
 * Stepper horizontal (vertical/compacto en móvil), controlado por props
 * (docs/05-diseno.md #5a). Solo permite navegar hacia atrás con teclado/click.
 *
 * Detalle visual: la línea de conexión se dibuja entre círculos (no al borde
 * del elemento de lista) y se tiñe con el color de acento en los tramos ya
 * recorridos; encima, una etiqueta "Paso N de M" da contexto textual.
 */
export function Stepper({ steps, currentIndex, onStepSelect, className }: StepperProps) {
  const canNavigateTo = (index: number) => index < currentIndex && Boolean(onStepSelect);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!canNavigateTo(index)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onStepSelect?.(index);
    }
  };

  return (
    <nav aria-label="Progreso del análisis" className={cn("w-full", className)}>
      <p className="sl-label mb-3">
        Paso {currentIndex + 1} de {steps.length}
        <span className="text-foreground/70 ml-2 normal-case">
          · {steps[currentIndex]?.title ?? ""}
        </span>
      </p>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-0">
        {steps.map((step, index) => {
          const status = statusFor(index, currentIndex);
          const navigable = canNavigateTo(index);
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="relative flex flex-1 flex-col sm:items-center">
              {/* Línea de conexión: de este círculo al siguiente. */}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute hidden sm:block",
                    "top-5 right-[calc(-50%+1.5rem)] left-[calc(50%+1.5rem)] h-px",
                    status === "completed" ? "bg-primary" : "bg-rule",
                  )}
                />
              ) : null}
              <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-col sm:gap-2">
                <button
                  type="button"
                  disabled={!navigable}
                  aria-current={status === "current" ? "step" : undefined}
                  aria-label={`Paso ${index + 1}: ${step.title} (${statusLabel(status)})`}
                  onClick={() => navigable && onStepSelect?.(index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={cn(
                    "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border text-sm transition-all",
                    "sl-number",
                    status === "completed" &&
                      "border-primary bg-primary text-primary-foreground hover:scale-105",
                    status === "current" &&
                      "border-primary text-primary bg-background ring-primary/20 ring-4",
                    status === "pending" && "border-rule bg-background text-muted-foreground",
                    navigable ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  {status === "completed" ? (
                    <Check className="size-4" aria-hidden="true" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </button>
                <span
                  className={cn(
                    "text-sm sm:text-center",
                    status === "current"
                      ? "text-foreground font-semibold"
                      : status === "completed"
                        ? "text-foreground/80 font-medium"
                        : "text-muted-foreground font-medium",
                  )}
                >
                  {step.title}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function statusLabel(status: StepStatus): string {
  if (status === "completed") return "completado";
  if (status === "current") return "actual";
  return "pendiente";
}
