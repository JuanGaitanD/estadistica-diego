"use client";

/**
 * Espacio de trabajo de StatLab (RF-41): zonas Datos, Explorar, Analizar e
 * Informe. Reemplaza al asistente lineal de cuatro pasos; los pasos viven
 * dentro de las zonas (docs/09 §5.2).
 */
import { ArrowRight, Compass } from "lucide-react";
import { useEffect, useRef } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ZoneNav } from "@/components/layout/zone-nav";
import { Button } from "@/components/ui/button";
import { ReportView, useReportStore } from "@/features/report";

import { GuidedBar } from "./guided/guided-bar";
import { useGuidedStore } from "./guided/guided-store";
import { ZONES, type Zone } from "./model/types";
import { AnalyzeHub } from "./steps/analyze-hub";
import { ProjectActions } from "./steps/project-actions";
import { StepData } from "./steps/step-data";
import { StepResults } from "./steps/step-results";
import { StepVariables } from "./steps/step-variables";
import { useWizardStore } from "./store/wizard-store";

function isZone(value: string): value is Zone {
  return ZONES.some((zone) => zone.id === value);
}

/** Zona «Datos»: cargar o escribir, confirmar tipos y seguir a Explorar. */
function DataZone() {
  const dataset = useWizardStore((state) => state.dataset);
  const goToZone = useWizardStore((state) => state.goToZone);
  const blocked = useWizardStore((state) => state.zoneBlockedReason("explorar"));

  return (
    <div className="flex flex-col gap-12">
      <StepData />
      {dataset !== null ? (
        <>
          <StepVariables embedded />
          <div className="border-rule flex flex-wrap items-center justify-end gap-4 border-t pt-6">
            {blocked !== null ? (
              <p id="motivo-explorar" role="status" className="text-muted-foreground text-sm">
                {blocked}
              </p>
            ) : null}
            <Button
              type="button"
              className="px-7"
              disabled={blocked !== null}
              onClick={() => goToZone("explorar")}
              {...(blocked !== null ? { "aria-describedby": "motivo-explorar" } : {})}
            >
              Ver qué dicen tus datos
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function Workspace() {
  const zone = useWizardStore((state) => state.zone);
  const goToZone = useWizardStore((state) => state.goToZone);
  const importSample = useWizardStore((state) => state.importSample);
  const zoneBlockedReason = useWizardStore((state) => state.zoneBlockedReason);
  // Se suscribe a lo que cambia el bloqueo de las zonas, para volver a pintar.
  useWizardStore((state) => state.dataset);
  useWizardStore((state) => state.columns);
  const hasStoredDataset = useWizardStore((state) => state.hasStoredDataset);
  const detectStoredDataset = useWizardStore((state) => state.detectStoredDataset);
  const recoverLastDataset = useWizardStore((state) => state.recoverLastDataset);
  const dataset = useWizardStore((state) => state.dataset);
  const reportCount = useReportStore((state) => state.items.length);
  const guidedActive = useGuidedStore((state) => state.active);
  const startGuided = useGuidedStore((state) => state.start);
  const hydrateReport = useReportStore((state) => state.hydrate);

  const contentRef = useRef<HTMLDivElement>(null);
  const lastZone = useRef(zone);

  useEffect(() => {
    detectStoredDataset();
    hydrateReport();
  }, [detectStoredDataset, hydrateReport]);

  // La zona vive en el hash (#explorar): se puede enlazar y el botón Atrás
  // del navegador vuelve a la zona anterior. `#ejemplo` (enlace de la
  // portada) carga los datos de ejemplo y abre Explorar.
  useEffect(() => {
    const fromHash = (): void => {
      const id = window.location.hash.slice(1);
      if (id === "guiado") {
        startGuided();
        goToZone("datos");
        return;
      }
      if (id === "ejemplo") {
        importSample();
        goToZone("explorar");
        return;
      }
      if (isZone(id)) goToZone(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [goToZone, importSample, startGuided]);

  useEffect(() => {
    // Se lee la zona del store, no la del render: `#ejemplo` la cambia en el
    // mismo commit y la del render aún sería la anterior.
    const target = useWizardStore.getState().zone;
    const current = window.location.hash.slice(1);
    if (current === target) return;
    // `#ejemplo` no queda en el historial: Atrás no vuelve a cargar los datos.
    // Sin hash (primera visita), tampoco: Atrás vuelve directo a la portada.
    if (current === "" || current === "ejemplo" || current === "guiado")
      window.history.replaceState(null, "", `#${target}`);
    else window.history.pushState(null, "", `#${target}`);
  }, [zone]);

  // Accesibilidad: al cambiar de zona, el foco va al título y la vista vuelve arriba.
  useEffect(() => {
    if (lastZone.current === zone) return;
    lastZone.current = zone;
    window.scrollTo({ top: 0, behavior: "auto" });
    const heading = contentRef.current?.querySelector("h1");
    if (heading === null || heading === undefined) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }, [zone]);

  const items = ZONES.map((entry) => ({
    id: entry.id,
    title: entry.title,
    hint: entry.hint,
    blockedReason: zoneBlockedReason(entry.id),
    ...(entry.id === "informe" ? { badge: reportCount } : {}),
  }));

  return (
    <AppShell width={zone === "explorar" ? "wide" : "narrow"}>
      <div className="flex flex-col gap-10 pb-16">
        <div className="flex flex-col gap-3">
          <ZoneNav
            items={items}
            current={zone}
            onSelect={(id) => {
              if (isZone(id)) goToZone(id);
            }}
          />
          <div className="flex flex-wrap items-center justify-end gap-3">
            {guidedActive ? null : (
              <Button type="button" variant="ghost" onClick={startGuided}>
                <Compass aria-hidden="true" />
                Guíame paso a paso
              </Button>
            )}
            <ProjectActions />
          </div>
        </div>

        <GuidedBar />

        {zone === "datos" && dataset === null && hasStoredDataset ? (
          <div className="border-rule bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border p-4">
            <p className="text-muted-foreground text-sm">
              Guardamos en este navegador los últimos datos que analizaste.
            </p>
            <Button type="button" variant="outline" onClick={() => recoverLastDataset()}>
              Recuperar último análisis
            </Button>
          </div>
        ) : null}

        <div key={zone} ref={contentRef} className="sl-step-enter">
          {zone === "datos" ? <DataZone /> : null}
          {zone === "explorar" ? <StepResults /> : null}
          {zone === "analizar" ? <AnalyzeHub /> : null}
          {zone === "informe" ? (
            <ReportView
              sampleSize={dataset?.rowCount ?? 0}
              onExplore={() => goToZone(dataset === null ? "datos" : "explorar")}
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
