"use client";

import { ArrowRight } from "lucide-react";

import { StepHeader } from "@/components/layout/step-header";
import { Button } from "@/components/ui/button";

import { useWizardStore } from "../store/wizard-store";

interface Question {
  readonly id: string;
  readonly question: string;
  readonly example: string;
  readonly method: string;
  /** `false` si todavía no está en StatLab. */
  readonly available: boolean;
}

/**
 * Preguntas en llano y el método que responde cada una (docs/09 §5.3). Se
 * irán activando por fases; las que aún no existen se dicen como tal, sin
 * botones que no lleven a ningún sitio.
 */
const QUESTIONS: readonly Question[] = [
  {
    id: "describir",
    question: "¿Cómo son mis datos?",
    example: "La nota típica del curso, cuánto varía, si hay casos raros.",
    method: "Estadística descriptiva",
    available: true,
  },
  {
    id: "predecir",
    question: "¿Puedo predecir un número a partir de otro?",
    example: "Cuánto sube la nota por cada hora de estudio.",
    method: "Regresión lineal",
    available: false,
  },
  {
    id: "relacionar",
    question: "¿Se mueven juntas dos cosas?",
    example: "Si a más horas de sueño, mejor rendimiento.",
    method: "Correlación · chi-cuadrado",
    available: false,
  },
  {
    id: "comparar",
    question: "¿Es real la diferencia entre grupos?",
    example: "Si un grupo sacó más que otro o fue casualidad.",
    method: "Prueba t · ANOVA",
    available: false,
  },
  {
    id: "estimar",
    question: "¿Qué puedo decir de toda la población?",
    example: "Entre qué valores está el promedio de todos los estudiantes.",
    method: "Intervalos de confianza",
    available: false,
  },
  {
    id: "probabilidad",
    question: "¿Qué tan probable es…?",
    example: "La probabilidad de sacar menos de 3,0.",
    method: "Distribuciones de probabilidad",
    available: false,
  },
];

/** Zona «Analizar»: elegir por la pregunta, no por el nombre del cálculo (RF-42). */
export function AnalyzeHub() {
  const goToZone = useWizardStore((state) => state.goToZone);

  return (
    <div className="flex flex-col gap-8">
      <StepHeader
        title="¿Qué quieres saber?"
        subtitle="Elige la pregunta que se parece a la tuya; StatLab usa el método adecuado y te explica el resultado."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {QUESTIONS.map((item) => (
          <li
            key={item.id}
            className="sl-surface flex flex-col gap-3 p-5"
            aria-labelledby={`pregunta-${item.id}`}
          >
            <p className="sl-label">{item.method}</p>
            <h2 id={`pregunta-${item.id}`} className="text-foreground text-lg font-semibold">
              {item.question}
            </h2>
            <p className="text-muted-foreground text-sm">Por ejemplo: {item.example}</p>
            <div className="mt-auto pt-2">
              {item.available ? (
                <Button type="button" onClick={() => goToZone("explorar")}>
                  Ver qué dicen tus datos
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <p className="text-muted-foreground text-sm font-semibold">
                  Llega en una próxima versión
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
