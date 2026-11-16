"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

import { StepHeader } from "@/components/layout/step-header";
import { Button } from "@/components/ui/button";
import {
  EstimationPanel,
  HypothesisPanel,
  ProbabilityPanel,
  type AnalysisColumn,
} from "@/features/inference";
import { RegressionPanel, type NumericColumn } from "@/features/regression";

import { isQuantitative } from "../model/validation";
import { useWizardStore } from "../store/wizard-store";

/** Dónde lleva cada pregunta disponible. */
type Destination = "explorar" | Panel;

/** Paneles que se abren dentro de Analizar. */
type Panel = "regresion" | "estimar" | "probabilidad" | "probar";

interface Question {
  readonly id: string;
  readonly question: string;
  readonly example: string;
  readonly method: string;
  /** Adónde lleva, o `null` si todavía no está en StatLab. */
  readonly destination: Destination | null;
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
    destination: "explorar",
  },
  {
    id: "predecir",
    question: "¿Puedo predecir un número a partir de otro?",
    example: "Cuánto sube la nota por cada hora de estudio.",
    method: "Regresión lineal",
    destination: "regresion",
  },
  {
    id: "relacionar",
    question: "¿Se mueven juntas dos cosas?",
    example: "Si a más horas de sueño, mejor rendimiento.",
    method: "Correlación",
    destination: "regresion",
  },
  {
    id: "comparar",
    question: "¿Es real la diferencia entre grupos?",
    example: "Si un grupo sacó más que otro o fue casualidad.",
    method: "Pruebas de hipótesis",
    destination: "probar",
  },
  {
    id: "estimar",
    question: "¿Qué puedo decir de toda la población?",
    example: "Entre qué valores está el promedio de todos los estudiantes.",
    method: "Intervalos de confianza",
    destination: "estimar",
  },
  {
    id: "probabilidad",
    question: "¿Qué tan probable es…?",
    example: "La probabilidad de sacar menos de 3,0.",
    method: "Distribuciones de probabilidad",
    destination: "probabilidad",
  },
];

/** Texto del botón de cada pregunta. */
const ACTION: Readonly<Record<string, string>> = {
  comparar: "Probar si es real",
  predecir: "Ajustar una recta",
  relacionar: "Ver si se mueven juntas",
  estimar: "Estimar con mi muestra",
  probabilidad: "Calcular una probabilidad",
};

/** Columnas incluidas en el análisis, con sus valores y si son numéricas. */
function useAnalysisColumns(): AnalysisColumn[] {
  const dataset = useWizardStore((state) => state.dataset);
  const columns = useWizardStore((state) => state.columns);
  return useMemo(() => {
    if (dataset === null) return [];
    return columns
      .filter((column) => column.include)
      .flatMap((column) => {
        const data = dataset.columns.find((entry) => entry.variable.id === column.id);
        return data === undefined
          ? []
          : [
              {
                id: column.id,
                name: column.name,
                quantitative: isQuantitative(column.kind),
                values: data.values,
              },
            ];
      });
  }, [dataset, columns]);
}

const PANEL_TEXT: Readonly<Record<Panel, { title: string; subtitle: string }>> = {
  regresion: {
    title: "¿Puedo predecir un número a partir de otro?",
    subtitle:
      "Elige las dos variables. StatLab ajusta la recta que mejor resume la relación, te dice qué significa y, si quieres, te muestra los 5 pasos con tus números.",
  },
  probar: {
    title: "¿Es real la diferencia o pudo ser casualidad?",
    subtitle:
      "Elige qué quieres saber; StatLab usa la prueba que corresponde, te dice en llano si la diferencia es real y cuánto importa, y deja los 5 pasos plegados.",
  },
  estimar: {
    title: "¿Qué puedo decir de toda la población?",
    subtitle:
      "Con tu muestra, StatLab calcula entre qué valores está el dato de toda la población y qué tan seguro puedes estar.",
  },
  probabilidad: {
    title: "¿Qué tan probable es…?",
    subtitle:
      "Elige una distribución y la pregunta; la parte sombreada de la gráfica es la probabilidad.",
  },
};

/** Zona «Analizar»: elegir por la pregunta, no por el nombre del cálculo (RF-42). */
export function AnalyzeHub() {
  const goToZone = useWizardStore((state) => state.goToZone);
  const columns = useAnalysisColumns();
  const numeric: NumericColumn[] = columns.filter((column) => column.quantitative);
  const [open, setOpen] = useState<Panel | null>(null);

  if (open !== null) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="ghost"
            className="-ml-4 self-start"
            onClick={() => setOpen(null)}
          >
            <ArrowLeft aria-hidden="true" />
            Todas las preguntas
          </Button>
          <StepHeader title={PANEL_TEXT[open].title} subtitle={PANEL_TEXT[open].subtitle} />
        </div>
        {open === "regresion" ? <RegressionPanel columns={numeric} /> : null}
        {open === "estimar" ? <EstimationPanel columns={columns} /> : null}
        {open === "probar" ? <HypothesisPanel columns={columns} /> : null}
        {open === "probabilidad" ? <ProbabilityPanel columns={numeric} /> : null}
      </div>
    );
  }

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
              {item.destination === "explorar" ? (
                <Button type="button" onClick={() => goToZone("explorar")}>
                  Ver qué dicen tus datos
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : item.destination !== null ? (
                <Button type="button" onClick={() => setOpen(item.destination as Panel)}>
                  {ACTION[item.id] ?? "Empezar"}
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
