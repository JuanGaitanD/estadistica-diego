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
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
        {steps.map((step, index) => {
          const status = statusFor(index, currentIndex);
          const navigable = canNavigateTo(index);
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex flex-1 flex-col sm:items-center">
              <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-col sm:gap-2">
                <button
                  type="button"
                  disabled={!navigable}
                  aria-current={status === "current" ? "step" : undefined}
                  aria-label={`Paso ${index + 1}: ${step.title} (${statusLabel(status)})`}
                  onClick={() => navigable && onStepSelect?.(index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    status === "completed" && "border-primary bg-primary text-primary-foreground",
                    status === "current" && "border-primary bg-background text-primary",
                    status === "pending" && "border-border bg-background text-muted-foreground",
                    navigable ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  {status === "completed" ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </button>
                <span
                  className={cn(
                    "text-sm font-medium sm:text-center",
                    status === "pending" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>
              {!isLast ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    "my-2 ml-4 h-6 w-px sm:my-0 sm:mt-4 sm:ml-0 sm:h-px sm:w-full sm:flex-1 sm:self-start",
                    status === "completed" ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
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
