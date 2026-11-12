"use client";

import type { KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { TallyMarks } from "./tally-marks";

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
 * Stepper que cuenta el progreso en palotes (docs/05-diseno.md, firma): cada
 * paso completado es una raya vertical; al llegar al último paso se traza la
 * quinta raya diagonal que cierra el grupo. El paso actual y los pendientes
 * llevan su número en un círculo. Solo permite navegar hacia atrás. En móvil
 * queda una fila compacta con la línea «Paso N de M · Título».
 */
export function Stepper({ steps, currentIndex, onStepSelect, className }: StepperProps) {
  const canNavigateTo = (index: number) => index < currentIndex && Boolean(onStepSelect);
  const isLast = currentIndex === steps.length - 1;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!canNavigateTo(index)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onStepSelect?.(index);
    }
  };

  return (
    <nav aria-label="Progreso del análisis" className={cn("w-full", className)}>
      <p className="sl-label mb-2 flex items-center gap-3">
        <TallyMarks
          count={isLast ? Math.min(4, steps.length) : currentIndex}
          closed={isLast}
          animated
          className="text-primary"
        />
        <span>
          Paso {currentIndex + 1} de {steps.length}
          <span className="text-foreground ml-2">· {steps[currentIndex]?.title ?? ""}</span>
        </span>
      </p>
      <ol className="flex items-start gap-1">
        {steps.map((step, index) => {
          const status = statusFor(index, currentIndex);
          const navigable = canNavigateTo(index);

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center gap-1">
              <button
                type="button"
                disabled={!navigable}
                aria-current={status === "current" ? "step" : undefined}
                aria-label={`Paso ${index + 1}: ${step.title} (${statusLabel(status)})`}
                onClick={() => navigable && onStepSelect?.(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  "relative flex size-11 shrink-0 items-center justify-center rounded-md transition-colors duration-[90ms]",
                  navigable ? "hover:bg-accent cursor-pointer" : "cursor-default",
                )}
              >
                {status === "completed" ? (
                  <svg
                    viewBox="0 0 4 24"
                    width="4"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                    className="text-primary"
                  >
                    <path d="M2 3 V21" />
                  </svg>
                ) : (
                  <span
                    className={cn(
                      "sl-number flex size-8 items-center justify-center rounded-full border text-sm",
                      status === "current"
                        ? "border-primary bg-accent text-foreground border-2 font-bold"
                        : "border-input bg-card text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </button>
              <span
                className={cn(
                  "hidden text-center sm:block",
                  status === "current"
                    ? "text-foreground text-base font-semibold"
                    : "text-muted-foreground text-sm",
                )}
              >
                {step.title}
              </span>
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
