"use client";

/**
 * Espacio de trabajo de StatLab (RF-41): un tablero de inicio y las zonas
 * Datos, Explorar, Analizar, Informe y Rentable, a las que se llega desde el
 * tablero o desde el menú de la barra superior (docs/05-diseno.md §5a).
 */
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";

import { AppNav, type NavEntry } from "@/components/layout/app-nav";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  PROFITABILITY_EXAMPLES,
  ProfitabilityPanel,
  useScenariosStore,
  type ExampleId,
} from "@/features/profitability";
import { ReportView, useReportStore } from "@/features/report";

import { GuidedChat } from "./guided/guided-chat";
import { useGuidedStore } from "./guided/guided-store";
import { SAMPLE_DATA_NAME } from "./model/sample-dataset";
import { ANALYSIS_PANELS, ZONES, type AnalysisPanel, type Zone } from "./model/types";
import { AnalyzeHub } from "./steps/analyze-hub";
import { HomeDashboard } from "./steps/home-dashboard";
import { ProjectActions } from "./steps/project-actions";
import { StepData } from "./steps/step-data";
import { StepResults } from "./steps/step-results";
import { StepVariables } from "./steps/step-variables";
import { useWizardStore } from "./store/wizard-store";

function isZone(value: string): value is Zone {
  return ZONES.some((zone) => zone.id === value);
}

function isPanel(value: string | undefined): value is AnalysisPanel {
  return ANALYSIS_PANELS.some((panel) => panel.id === value);
}

function isExample(value: string | undefined): value is ExampleId {
  return PROFITABILITY_EXAMPLES.some((example) => example.id === value);
}

/** Entrada del menú en la que cae cada zona. */
const NAV_OF_ZONE: Readonly<Record<Zone, string>> = {
  inicio: "inicio",
  datos: "estadistica",
  explorar: "estadistica",
  analizar: "estadistica",
  informe: "informe",
  rentabilidad: "proyectos",
};

function navEntries(reportCount: number): NavEntry[] {
  return [
    { kind: "link", id: "inicio", title: "Inicio" },
    {
      kind: "menu",
      id: "estadistica",
      title: "Estadística",
      sections: [
        {
          heading: "Básica",
          links: [
            { id: "datos", title: "Mis datos", hint: "Sube, pega o escribe tus datos" },
            { id: "explorar", title: "Qué dicen tus datos", hint: "Medidas, tablas y gráficas" },
          ],
        },
        {
          heading: "Avanzada",
          links: [
            {
              id: "analizar",
              title: "Todas las preguntas",
              hint: "Elige por lo que quieres saber",
            },
            ...ANALYSIS_PANELS.map((panel) => ({
              id: `analizar/${panel.id}`,
              title: panel.title,
              hint: panel.hint,
            })),
          ],
        },
        {
          links: [{ id: "guiado", title: "Guíame paso a paso", hint: "De la pregunta al informe" }],
        },
      ],
    },
    {
      kind: "menu",
      id: "proyectos",
      title: "Evaluación de proyectos",
      sections: [
        {
          links: [
            {
              id: "rentabilidad",
              title: "¿Es rentable mi proyecto?",
              hint: "Flujo de caja, VPN, TIR y escenarios",
            },
          ],
        },
        {
          heading: "Ejemplos (reemplazan el escenario abierto)",
          links: PROFITABILITY_EXAMPLES.map((example) => ({
            id: `rentabilidad/${example.id}`,
            title: example.label,
          })),
        },
      ],
    },
    { kind: "link", id: "informe", title: "Mis informes", badge: reportCount },
  ];
}

/** Hash de la ubicación actual: `#explorar` o `#analizar/regresion`. */
function hashOf(zone: Zone, panel: AnalysisPanel | null): string {
  return zone === "analizar" && panel !== null ? `${zone}/${panel}` : zone;
}

/** Zona «Datos»: cargar o escribir, confirmar tipos y seguir a Explorar. */
function DataZone({ notice }: { notice: ReactNode }) {
  const dataset = useWizardStore((state) => state.dataset);
  const goToZone = useWizardStore((state) => state.goToZone);
  const blocked = useWizardStore((state) => state.zoneBlockedReason("explorar"));

  return (
    <div className="flex flex-col gap-12">
      <StepData notice={notice} />
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
  const panel = useWizardStore((state) => state.panel);
  const goToZone = useWizardStore((state) => state.goToZone);
  const importSample = useWizardStore((state) => state.importSample);
  const hasStoredDataset = useWizardStore((state) => state.hasStoredDataset);
  const detectStoredDataset = useWizardStore((state) => state.detectStoredDataset);
  const recoverLastDataset = useWizardStore((state) => state.recoverLastDataset);
  const dataset = useWizardStore((state) => state.dataset);
  const sourceName = useWizardStore((state) => state.sourceName);
  const reportCount = useReportStore((state) => state.items.length);
  const startGuided = useGuidedStore((state) => state.start);
  const hydrateReport = useReportStore((state) => state.hydrate);
  const loadExample = useScenariosStore((state) => state.loadExample);

  const contentRef = useRef<HTMLDivElement>(null);
  const lastPlace = useRef(hashOf(zone, panel));

  useEffect(() => {
    detectStoredDataset();
    hydrateReport();
  }, [detectStoredDataset, hydrateReport]);

  /**
   * Un solo camino para el menú, el tablero y el hash: una zona,
   * `analizar/<herramienta>`, `rentabilidad/<ejemplo>`, `ejemplo` (carga los
   * datos de ejemplo) o `guiado`. Una zona que aún no se puede abrir (sin
   * datos) explica por qué y lleva a Datos.
   */
  const navigate = useCallback(
    (target: string): void => {
      const [head = "", sub] = target.split("/");
      if (head === "guiado") {
        startGuided();
        goToZone("datos");
        return;
      }
      if (head === "ejemplo") {
        importSample();
        goToZone("explorar");
        return;
      }
      if (!isZone(head)) return;
      const reason = useWizardStore.getState().zoneBlockedReason(head);
      if (reason !== null) {
        toast.info(reason);
        goToZone("datos");
        return;
      }
      if (head === "rentabilidad" && isExample(sub)) loadExample(sub);
      goToZone(head, isPanel(sub) ? sub : null);
    },
    [goToZone, importSample, startGuided, loadExample],
  );

  // La ubicación vive en el hash (#explorar, #analizar/regresion): se puede
  // enlazar y el botón Atrás del navegador vuelve a la anterior.
  useEffect(() => {
    const fromHash = (): void => {
      const target = window.location.hash.slice(1);
      if (target !== "") navigate(target);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [navigate]);

  useEffect(() => {
    // Se lee del store, no del render: `#ejemplo` cambia la zona en el mismo
    // commit y la del render aún sería la anterior.
    const state = useWizardStore.getState();
    const target = hashOf(state.zone, state.panel);
    const current = window.location.hash.slice(1);
    if (current === target) return;
    // Los atajos (`#ejemplo`, `#guiado`, un ejemplo de proyecto) no quedan en
    // el historial: Atrás no los repite. Sin hash (primera visita), tampoco.
    const shortcut =
      current === "" ||
      current === "ejemplo" ||
      current === "guiado" ||
      current.startsWith("rentabilidad/");
    if (shortcut) window.history.replaceState(null, "", `#${target}`);
    else window.history.pushState(null, "", `#${target}`);
  }, [zone, panel]);

  // Accesibilidad: al cambiar de lugar, el foco va al título y la vista vuelve arriba.
  useEffect(() => {
    const place = hashOf(zone, panel);
    if (lastPlace.current === place) return;
    lastPlace.current = place;
    window.scrollTo({ top: 0, behavior: "auto" });
    const heading = contentRef.current?.querySelector("h1");
    if (heading === null || heading === undefined) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }, [zone, panel]);

  // El proyecto (.statlab.json) es del análisis de datos; «Rentable» no lo usa.
  const actions = zone === "rentabilidad" ? undefined : <ProjectActions />;

  const recoverNotice =
    (dataset === null || sourceName === SAMPLE_DATA_NAME) && hasStoredDataset ? (
      <div className="border-rule bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border p-4">
        <p className="text-muted-foreground text-sm">
          Guardamos en este navegador los últimos datos que analizaste.
        </p>
        <Button type="button" variant="outline" onClick={() => recoverLastDataset()}>
          Recuperar último análisis
        </Button>
      </div>
    ) : null;

  return (
    <AppShell
      width={
        zone === "inicio" || zone === "explorar" || zone === "rentabilidad" ? "wide" : "narrow"
      }
      {...(actions !== undefined ? { actions } : {})}
      // La marca lleva al tablero; ya en el tablero, a la portada.
      {...(zone !== "inicio" ? { onBrand: () => navigate("inicio") } : {})}
      aside={<GuidedChat />}
      nav={
        <AppNav entries={navEntries(reportCount)} current={NAV_OF_ZONE[zone]} onSelect={navigate} />
      }
    >
      <div key={zone} ref={contentRef} className="sl-step-enter pb-16">
        {zone === "inicio" ? <HomeDashboard onNavigate={navigate} /> : null}
        {zone === "datos" ? <DataZone notice={recoverNotice} /> : null}
        {zone === "explorar" ? <StepResults /> : null}
        {zone === "analizar" ? <AnalyzeHub /> : null}
        {zone === "informe" ? (
          <ReportView
            sampleSize={dataset?.rowCount ?? 0}
            onExplore={() => goToZone(dataset === null ? "datos" : "explorar")}
          />
        ) : null}
        {zone === "rentabilidad" ? <ProfitabilityPanel /> : null}
      </div>
    </AppShell>
  );
}
