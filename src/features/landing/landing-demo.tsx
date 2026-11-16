"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { InterpretationPanel } from "@/components/shared/interpretation-panel";
import { cn } from "@/lib/utils";

import type { SampleInsights } from "./sample-insights";

/** Segundos por estado de la demo. */
const INTERVAL_MS = 6000;

interface DemoStep {
  readonly title: string;
  readonly body: ReactNode;
}

function steps(insights: SampleInsights): DemoStep[] {
  const mean = insights.steps.find((step) => step.title.startsWith("2."));
  return [
    {
      title: "Pegas tus datos",
      body: (
        <div className="bg-card border-rule rounded-[var(--radius)] border p-4">
          <p className="sl-label">Datos pegados · {insights.sourceName}</p>
          <pre className="mt-3 overflow-hidden font-mono text-sm leading-relaxed">
            {insights.pastedPreview.join("\n")}
            {"\n"}…
          </pre>
          <p className="text-muted-foreground mt-2 text-sm">
            {insights.rowCount} filas · también desde Excel, CSV o una tabla
          </p>
        </div>
      ),
    },
    {
      title: "Lees qué significan",
      body: (
        <InterpretationPanel
          name={insights.variable}
          title={`Qué significa · ${insights.variable}`}
          interpretation={{
            headline: insights.interpretation.headline,
            details: insights.interpretation.details.slice(0, 1),
            caveats: [],
          }}
        />
      ),
    },
    {
      title: "Ves cómo se calculó, si quieres",
      body: (
        <div className="bg-card border-rule rounded-[var(--radius)] border p-4">
          <p className="text-primary text-sm font-semibold">▾ Ver cómo se calculó</p>
          {mean ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="font-semibold">{mean.title}</p>
              <p className="text-muted-foreground text-sm">{mean.text}</p>
              <p className="bg-muted/60 rounded-md px-3 py-2 font-mono text-sm">{mean.formula}</p>
              <p className="text-muted-foreground text-sm">
                En Excel: <code className="font-mono">{mean.excel}</code>
              </p>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Te llevas el informe",
      body: (
        <div className="bg-card border-rule rounded-[var(--radius)] border p-4">
          <p className="sl-label">Tu informe</p>
          <p className="mt-2 font-semibold">1. {insights.variable}</p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {insights.interpretation.headline}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Formatos">
            {["PDF", "Excel", "PNG · SVG", "Copiar"].map((format) => (
              <li
                key={format}
                className="border-rule bg-secondary rounded-full border px-3 py-1 font-mono text-xs"
              >
                {format}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];
}

/**
 * Momento focal de la portada (disenojg, movimiento-interactivo §2): el
 * producto funcionando, con los textos reales del motor. Avanza solo, se
 * pausa al pasar el cursor, al enfocar, fuera de vista y con la pestaña
 * oculta; con movimiento reducido no arranca.
 */
export function LandingDemo({ insights }: { insights: SampleInsights }) {
  const items = steps(insights);
  const total = items.length;
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const flags = useRef({ inView: false, hovered: false, reduced: false });

  const update = useCallback(() => {
    const { inView, hovered, reduced } = flags.current;
    setRunning(inView && !hovered && !reduced && !document.hidden && !manualPause);
  }, [manualPause]);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    flags.current.reduced = media.matches;
    const onMedia = () => {
      flags.current.reduced = media.matches;
      update();
    };
    // Sin IntersectionObserver (navegadores viejos, jsdom) se da por visible.
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            flags.current.inView = entry?.isIntersecting ?? false;
            update();
          });
    if (observer === null) flags.current.inView = true;
    else observer.observe(root);
    const hoverOn = () => {
      flags.current.hovered = true;
      update();
    };
    const hoverOff = () => {
      flags.current.hovered = root.matches(":hover") || root.contains(document.activeElement);
      update();
    };
    media.addEventListener("change", onMedia);
    document.addEventListener("visibilitychange", update);
    for (const event of ["pointerenter", "focusin"]) root.addEventListener(event, hoverOn);
    for (const event of ["pointerleave", "focusout"]) root.addEventListener(event, hoverOff);
    update();
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", onMedia);
      document.removeEventListener("visibilitychange", update);
      for (const event of ["pointerenter", "focusin"]) root.removeEventListener(event, hoverOn);
      for (const event of ["pointerleave", "focusout"]) root.removeEventListener(event, hoverOff);
    };
  }, [update]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setStep((current) => (current + 1) % total),
      INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [running, total]);

  const go = (next: number) => {
    setAnnounce(true);
    setStep((next + total) % total);
  };

  return (
    <div
      ref={rootRef}
      className="sl-milimetrado border-rule flex flex-col gap-4 rounded-[var(--radius)] border p-4 sm:p-6"
      aria-roledescription="demostración"
      aria-label="Así funciona StatLab, con los datos de ejemplo"
    >
      <div className="grid">
        {items.map((item, index) => (
          <div
            key={item.title}
            className={cn(
              "sl-demo-estado col-start-1 row-start-1 self-center",
              index === step ? "sl-demo-activo" : "pointer-events-none",
            )}
            aria-hidden={index !== step}
            inert={index !== step}
          >
            {item.body}
          </div>
        ))}
      </div>

      <div className="bg-card border-rule flex flex-col gap-2 rounded-[var(--radius)] border p-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="sl-demo-control"
            aria-label="Paso anterior"
            onClick={() => go(step - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sl-demo-control"
            aria-label={running ? "Pausar la demostración" : "Reproducir la demostración"}
            onClick={() => {
              setManualPause(running);
              if (!running) {
                flags.current.reduced = false;
                flags.current.hovered = false;
              }
            }}
          >
            {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="sl-demo-control"
            aria-label="Paso siguiente"
            onClick={() => go(step + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
          <p className="ml-2 min-w-0 text-sm" {...(announce ? { "aria-live": "polite" } : {})}>
            <span className="sl-tnum text-muted-foreground">
              Paso {step + 1} de {total}
            </span>{" "}
            <span className="font-semibold">· {items[step]?.title}</span>
          </p>
        </div>
        <div className="bg-secondary h-1 overflow-hidden rounded-full" aria-hidden="true">
          <div
            key={`${step}-${running}`}
            className={cn("bg-primary h-full", running ? "sl-demo-progreso" : "")}
            style={{ width: running ? undefined : `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
