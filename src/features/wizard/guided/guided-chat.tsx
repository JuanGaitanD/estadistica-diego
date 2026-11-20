"use client";

import { ArrowLeft, ArrowRight, Compass, Minus, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AddToReportButton, type ReportItemInput } from "@/features/report";

import { useWizardStore } from "../store/wizard-store";
import { PHASES, preparationLog, QUESTION_TYPES, semaphore, type GuidedTool } from "./guided-model";
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

/** Burbuja de la conversación: la guía a la izquierda, la persona a la derecha. */
function Bubble({ from = "guia", children }: { from?: "guia" | "tu"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex max-w-[92%] flex-col gap-3 rounded-2xl p-3.5 text-sm",
        from === "guia"
          ? "bg-muted/60 self-start rounded-tl-sm"
          : "bg-primary text-primary-foreground self-end rounded-tr-sm",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Modo guiado CRISP-DM (M9, RF-56): un panel de conversación a la derecha
 * (abajo en pantallas angostas) que lleva de la pregunta al informe mientras
 * el espacio de trabajo muestra las mismas vistas. Se minimiza a un botón.
 */
export function GuidedChat() {
  const [minimized, setMinimized] = useState(false);
  const ids = { question: useId(), type: useId() };
  const guided = useGuidedStore();
  const dataset = useWizardStore((state) => state.dataset);
  const columns = useWizardStore((state) => state.columns);
  const goToZone = useWizardStore((state) => state.goToZone);
  const zoneBlockedReason = useWizardStore((state) => state.zoneBlockedReason);
  const zone = useWizardStore((state) => state.zone);
  const panel = useWizardStore((state) => state.panel);

  if (!guided.active) return null;
  const phase = PHASES[guided.phase]!;

  if (minimized) {
    return (
      <Button
        type="button"
        aria-expanded={false}
        className="fixed right-5 bottom-5 z-40 h-12 rounded-full px-5 shadow-lg"
        onClick={() => setMinimized(false)}
      >
        <Compass aria-hidden="true" />
        Tu guía · fase {guided.phase + 1} de 6
      </Button>
    );
  }

  const type = QUESTION_TYPES.find((entry) => entry.id === guided.questionType);
  const log = dataset !== null ? preparationLog(dataset, columns) : [];
  const done = type ? type.checks.filter((check) => guided.checks.includes(check)).length : 0;
  const light = semaphore(done, type?.checks.length ?? 0);

  /** Abre una herramienta; si aún no hay datos, se queda en Datos. */
  const open = (tool: Pick<GuidedTool, "zone" | "panel">): void => {
    if (zoneBlockedReason(tool.zone) !== null) goToZone("datos");
    else goToZone(tool.zone, tool.panel ?? null);
  };

  const go = (index: number) => {
    guided.setPhase(index);
    const next = PHASES[index]!;
    // El Modelado lleva directo a la herramienta del tipo de pregunta.
    const tool = next.id === "modelado" ? type?.tools[0] : undefined;
    if (tool !== undefined) open(tool);
    else if (next.zone !== null) open({ zone: next.zone });
  };

  const summary = (): ReportItemInput => ({
    title: "Recorrido CRISP-DM",
    interpretation: {
      headline: guided.question.trim() === "" ? "Pregunta sin escribir." : guided.question.trim(),
      details: [
        `Tipo de pregunta: ${type?.label ?? "sin elegir"}.`,
        ...(type ? [`Método: ${type.method.charAt(0).toUpperCase()}${type.method.slice(1)}`] : []),
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
    <aside
      aria-label="Modo guiado"
      className="bg-background border-rule fixed inset-x-0 bottom-0 z-40 flex max-h-[70dvh] flex-col rounded-t-2xl border-t shadow-2xl lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100dvh-4rem)] lg:max-h-none lg:w-[24rem] lg:shrink-0 lg:self-start lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none"
    >
      <div className="border-rule flex items-center gap-3 border-b px-4 py-3">
        <span
          aria-hidden="true"
          className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full"
        >
          <Compass className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="sl-label">Tu guía · CRISP-DM</p>
          <h2 className="leading-snug font-semibold">
            Fase {guided.phase + 1} de 6: {phase.title}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Minimizar la guía"
          onClick={() => setMinimized(true)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Salir del modo guiado"
          onClick={guided.stop}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <ol className="grid grid-cols-6 gap-1.5 px-4 pt-3" aria-label="Fases">
        {PHASES.map((entry, index) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => go(index)}
              aria-current={index === guided.phase ? "step" : undefined}
              aria-label={`Fase ${index + 1}: ${entry.title}`}
              className={cn(
                "block h-9 w-full rounded-[var(--radius)] border text-sm font-semibold",
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

      {/* La clave por fase devuelve el desplazamiento arriba al cambiar de fase. */}
      <div key={guided.phase} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {guided.phase > 0 && guided.question.trim() !== "" ? (
          <Bubble from="tu">
            <p>
              {guided.question.trim()}
              {type ? <span className="block text-xs opacity-80">{type.label}</span> : null}
            </p>
          </Bubble>
        ) : null}

        <Bubble>
          <p>{phase.explanation}</p>
        </Bubble>

        {phase.id === "problema" ? (
          <Bubble>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.question}>Tu pregunta en una frase</Label>
              <Textarea
                id={ids.question}
                value={guided.question}
                onChange={(event) => guided.setQuestion(event.target.value)}
                placeholder="Por ejemplo: ¿las horas de estudio ayudan a sacar mejor nota?"
                rows={2}
                className="bg-background"
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">Qué tipo de pregunta es</legend>
              {QUESTION_TYPES.map((entry) => (
                <label
                  key={entry.id}
                  className={cn(
                    "bg-background flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-[var(--radius)] border p-3",
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
                  <span className="text-muted-foreground text-xs">{entry.example}</span>
                </label>
              ))}
            </fieldset>
          </Bubble>
        ) : null}

        {phase.id === "datos" && dataset === null ? (
          <Bubble>
            <p role="status" className="font-semibold">
              Primero carga tus datos en la pantalla principal (o usa los de ejemplo).
            </p>
          </Bubble>
        ) : null}

        {phase.id === "preparacion" ? (
          <Bubble>
            <h3 className="font-semibold">Bitácora de preparación</h3>
            {log.length === 0 ? (
              <p className="text-muted-foreground">
                Sin cambios por ahora: los datos se usan tal como se cargaron.
              </p>
            ) : (
              <ul className="list-disc pl-5">
                {log.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            )}
          </Bubble>
        ) : null}

        {phase.id === "modelado" ? (
          <Bubble>
            {type ? (
              <>
                <p className="font-semibold">
                  Para «{type.label.toLowerCase()}» usa {type.method}
                </p>
                <div className="flex flex-wrap gap-2">
                  {type.tools.map((tool) => {
                    const here = zone === tool.zone && (tool.panel ?? null) === panel;
                    return (
                      <Button
                        key={tool.label}
                        type="button"
                        variant={here ? "default" : "outline"}
                        aria-current={here ? "page" : undefined}
                        className="h-auto min-h-9 py-1.5 whitespace-normal"
                        onClick={() => open(tool)}
                      >
                        {here ? `Estás en: ${tool.label}` : `Abrir ${tool.label}`}
                      </Button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="font-semibold">
                Vuelve a la fase 1 y elige el tipo de pregunta para ver qué método usar.
              </p>
            )}
          </Bubble>
        ) : null}

        {phase.id === "evaluacion" ? (
          <Bubble>
            {type === undefined ? (
              <p className="font-semibold">
                Elige el tipo de pregunta en la fase 1 para ver qué revisar.
              </p>
            ) : (
              <>
                <p className="flex items-center gap-2 font-semibold" role="status">
                  <span
                    aria-hidden="true"
                    className={cn("block h-3 w-3 flex-none rounded-full", LIGHT_CLASS[light])}
                  />
                  {LIGHT_TEXT[light]} ({done} de {type.checks.length})
                </p>
                {type.checks.map((check, index) => {
                  const id = `${ids.type}-${index}`;
                  return (
                    <div key={check} className="flex min-h-11 items-start gap-3">
                      <Checkbox
                        id={id}
                        checked={guided.checks.includes(check)}
                        onCheckedChange={(checked) => guided.toggleCheck(check, checked === true)}
                        className="bg-background mt-0.5"
                      />
                      <Label htmlFor={id} className="leading-snug font-normal">
                        {check}
                      </Label>
                    </div>
                  );
                })}
              </>
            )}
          </Bubble>
        ) : null}

        {phase.id === "despliegue" ? (
          <Bubble>
            <AddToReportButton
              what="el recorrido CRISP-DM"
              label="Añadir el recorrido CRISP-DM al informe"
              className="h-auto min-h-11 max-w-full py-2 text-left whitespace-normal"
              build={summary}
            />
          </Bubble>
        ) : null}
      </div>

      <div className="border-rule flex gap-2 border-t p-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-auto min-h-9 px-3"
          aria-label="Fase anterior"
          disabled={guided.phase === 0}
          onClick={() => go(guided.phase - 1)}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        {guided.phase < 5 ? (
          <Button
            type="button"
            className="h-auto min-h-9 flex-1 py-2 text-left whitespace-normal"
            onClick={() => go(guided.phase + 1)}
          >
            Siguiente: {PHASES[guided.phase + 1]!.title}
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
