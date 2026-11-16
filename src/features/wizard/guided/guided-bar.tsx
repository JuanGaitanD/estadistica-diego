"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AddToReportButton, type ReportItemInput } from "@/features/report";

import { useWizardStore } from "../store/wizard-store";
import { PHASES, preparationLog, QUESTION_TYPES, semaphore } from "./guided-model";
import { useGuidedStore } from "./guided-store";

const LIGHT_TEXT = {
  verde: "Comprobado todo",
  amarillo: "Comprobado en parte",
  rojo: "Sin comprobar",
} as const;

const LIGHT_CLASS = {
  verde: "bg-exito",
  amarillo: "bg-aviso",
  rojo: "bg-destructive",
} as const;

/**
 * Modo guiado CRISP-DM (M9, RF-56): una barra de fases sobre el espacio de
 * trabajo que lleva de la pregunta al informe, con las mismas vistas.
 */
export function GuidedBar() {
  const ids = { question: useId(), type: useId() };
  const guided = useGuidedStore();
  const dataset = useWizardStore((state) => state.dataset);
  const columns = useWizardStore((state) => state.columns);
  const goToZone = useWizardStore((state) => state.goToZone);
  const zoneBlockedReason = useWizardStore((state) => state.zoneBlockedReason);

  if (!guided.active) return null;
  const phase = PHASES[guided.phase]!;
  const type = QUESTION_TYPES.find((entry) => entry.id === guided.questionType);
  const log = dataset !== null ? preparationLog(dataset, columns) : [];
  const done = type ? type.checks.filter((check) => guided.checks.includes(check)).length : 0;
  const light = semaphore(done, type?.checks.length ?? 0);

  const go = (index: number) => {
    guided.setPhase(index);
    const zone = PHASES[index]!.zone;
    goToZone(zoneBlockedReason(zone) === null ? zone : "datos");
  };

  const summary = (): ReportItemInput => ({
    title: "Recorrido CRISP-DM",
    interpretation: {
      headline: guided.question.trim() === "" ? "Pregunta sin escribir." : guided.question.trim(),
      details: [
        `Tipo de pregunta: ${type?.label ?? "sin elegir"}.`,
        ...(type ? [`Método: ${type.method}`] : []),
        `Evaluación: ${LIGHT_TEXT[light].toLowerCase()} (${done} de ${type?.checks.length ?? 0}).`,
      ],
      caveats: [],
    },
    steps: [],
    tables: [
      {
        title: "Bitácora de preparación",
        columns: ["Cambio"],
        rows: (log.length > 0 ? log : ["Se usaron los datos tal como se cargaron."]).map(
          (entry) => [entry],
        ),
      },
      ...(type
        ? [
            {
              title: "Lista de evaluación",
              columns: ["Comprobación", "¿Hecha?"],
              rows: type.checks.map((check) => [
                check,
                guided.checks.includes(check) ? "Sí" : "No",
              ]),
            },
          ]
        : []),
    ],
    images: [],
  });

  return (
    <section aria-label="Modo guiado" className="sl-surface flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sl-label">Modo guiado · CRISP-DM</p>
          <h2 className="text-lg font-semibold">
            Fase {guided.phase + 1} de 6: {phase.title}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={guided.stop}>
          <X aria-hidden="true" />
          Salir del modo guiado
        </Button>
      </div>

      <ol className="grid grid-cols-6 gap-1.5" aria-label="Fases">
        {PHASES.map((entry, index) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => go(index)}
              aria-current={index === guided.phase ? "step" : undefined}
              aria-label={`Fase ${index + 1}: ${entry.title}`}
              className={cn(
                "block h-11 w-full rounded-[var(--radius)] border text-sm font-semibold",
                index === guided.phase
                  ? "border-primary bg-primary text-primary-foreground"
                  : index < guided.phase
                    ? "border-[var(--accion)] text-[var(--accion)]"
                    : "border-rule text-muted-foreground",
              )}
            >
              {index + 1}
            </button>
          </li>
        ))}
      </ol>

      <p className="text-muted-foreground">{phase.explanation}</p>

      {phase.id === "problema" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.question}>Tu pregunta en una frase</Label>
            <Textarea
              id={ids.question}
              value={guided.question}
              onChange={(event) => guided.setQuestion(event.target.value)}
              placeholder="Por ejemplo: ¿las horas de estudio ayudan a sacar mejor nota?"
              rows={2}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Qué tipo de pregunta es</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUESTION_TYPES.map((entry) => (
                <label
                  key={entry.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-[var(--radius)] border p-3",
                    guided.questionType === entry.id ? "border-[var(--accion)]" : "border-rule",
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name={ids.type}
                      value={entry.id}
                      checked={guided.questionType === entry.id}
                      onChange={() => guided.setQuestionType(entry.id)}
                      className="accent-[var(--accion)]"
                    />
                    {entry.label}
                  </span>
                  <span className="text-muted-foreground text-sm">{entry.example}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {phase.id === "datos" && dataset === null ? (
        <p role="status" className="font-semibold">
          Primero carga tus datos aquí abajo (o usa los de ejemplo).
        </p>
      ) : null}

      {phase.id === "preparacion" ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Bitácora de preparación</h3>
          {log.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sin cambios por ahora: los datos se usan tal como se cargaron.
            </p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {log.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {phase.id === "modelado" ? (
        <p className="font-semibold">
          {type
            ? `Para «${type.label.toLowerCase()}»: ${type.method}`
            : "Vuelve a la fase 1 y elige el tipo de pregunta para ver qué método usar."}
        </p>
      ) : null}

      {phase.id === "evaluacion" ? (
        type === undefined ? (
          <p className="font-semibold">
            Elige el tipo de pregunta en la fase 1 para ver qué revisar.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-semibold" role="status">
              <span
                aria-hidden="true"
                className={cn("block h-3 w-3 flex-none rounded-full", LIGHT_CLASS[light])}
              />
              {LIGHT_TEXT[light]} ({done} de {type.checks.length})
            </p>
            {type.checks.map((check) => {
              const id = `${ids.type}-${type.checks.indexOf(check)}`;
              return (
                <div key={check} className="flex min-h-11 items-start gap-3">
                  <Checkbox
                    id={id}
                    checked={guided.checks.includes(check)}
                    onCheckedChange={(checked) => guided.toggleCheck(check, checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor={id} className="leading-snug font-normal">
                    {check}
                  </Label>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {phase.id === "despliegue" ? (
        <div className="flex flex-wrap items-center gap-3">
          <AddToReportButton
            what="el recorrido CRISP-DM"
            label="Añadir el recorrido CRISP-DM al informe"
            build={summary}
          />
        </div>
      ) : null}

      <div className="border-rule flex flex-wrap justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={guided.phase === 0}
          onClick={() => go(guided.phase - 1)}
        >
          <ArrowLeft aria-hidden="true" />
          Fase anterior
        </Button>
        {guided.phase < 5 ? (
          <Button type="button" onClick={() => go(guided.phase + 1)}>
            Siguiente: {PHASES[guided.phase + 1]!.title}
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </section>
  );
}
