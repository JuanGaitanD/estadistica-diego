"use client";

import {
  ArrowRight,
  BarChart3,
  Compass,
  FileText,
  FlaskConical,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { StepHeader } from "@/components/layout/step-header";
import { Button } from "@/components/ui/button";
import { useReportStore } from "@/features/report";

import { SAMPLE_DATA_NAME } from "../model/sample-dataset";
import { ANALYSIS_PANELS } from "../model/types";
import { useWizardStore } from "../store/wizard-store";

export interface HomeDashboardProps {
  /** Lleva a un destino del menú: una zona, `analizar/<herramienta>`, `ejemplo`, `guiado`… */
  onNavigate: (target: string) => void;
}

function Door({
  icon: Icon,
  label,
  title,
  body,
  children,
  actions,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  body: string;
  children?: ReactNode;
  actions: ReactNode;
}) {
  const id = `puerta-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="sl-surface flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <span className="bg-secondary text-primary flex size-10 items-center justify-center rounded-full">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <p className="sl-label">{label}</p>
      </div>
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-foreground text-2xl leading-tight">
          {title}
        </h2>
        <p className="text-muted-foreground">{body}</p>
      </div>
      {children}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">{actions}</div>
    </section>
  );
}

/**
 * Tablero de inicio de la app: en vez de un asistente lineal, cuatro puertas
 * (básica, avanzada, proyectos e informe) y, si hay trabajo a medias, por
 * dónde seguir.
 */
export function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  const dataset = useWizardStore((state) => state.dataset);
  const sourceName = useWizardStore((state) => state.sourceName);
  const hasStoredDataset = useWizardStore((state) => state.hasStoredDataset);
  const recoverLastDataset = useWizardStore((state) => state.recoverLastDataset);
  const reportItems = useReportStore((state) => state.items);

  const ownData = dataset !== null && sourceName !== SAMPLE_DATA_NAME;
  const recent = reportItems.slice(-3).reverse();

  return (
    <div className="flex flex-col gap-10">
      <StepHeader
        title="¿Qué quieres hacer hoy?"
        subtitle="Elige por dónde empezar. Todo se calcula en tu navegador y cada resultado viene explicado en llano."
      />

      {dataset !== null ? (
        <div className="border-rule bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border p-4">
          <p className="text-sm">
            <span className="text-muted-foreground">Sigues con </span>
            <span className="text-foreground font-semibold">
              {ownData ? (sourceName ?? "tus datos") : "los datos de ejemplo"}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · <span className="sl-number">{dataset.rowCount}</span> filas
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onNavigate("datos")}>
              Cambiar datos
            </Button>
            <Button type="button" onClick={() => onNavigate("explorar")}>
              Seguir donde quedé
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : hasStoredDataset ? (
        <div className="border-rule bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border p-4">
          <p className="text-muted-foreground text-sm">
            Guardamos en este navegador los últimos datos que analizaste.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (recoverLastDataset()) onNavigate("explorar");
            }}
          >
            Recuperar último análisis
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Door
          icon={BarChart3}
          label="Describir"
          title="Estadística básica"
          body="Resume tus datos: lo típico, cuánto varían, tablas de frecuencia, tablas cruzadas y gráficas."
          actions={
            dataset !== null ? (
              <Button type="button" onClick={() => onNavigate("explorar")}>
                Ver qué dicen tus datos
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <>
                <Button type="button" onClick={() => onNavigate("datos")}>
                  Cargar mis datos
                  <ArrowRight aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => onNavigate("ejemplo")}>
                  Probar con datos de ejemplo
                </Button>
              </>
            )
          }
        >
          <p className="text-muted-foreground text-sm">
            Promedio, mediana, moda · desviación y cuartiles · histograma, barras y caja.
          </p>
        </Door>

        <Door
          icon={FlaskConical}
          label="Concluir"
          title="Estadística avanzada"
          body="Todo lo básico y además: saca conclusiones sobre toda la población y predice con modelos."
          actions={
            <Button type="button" onClick={() => onNavigate("analizar")}>
              Elegir una pregunta
              <ArrowRight aria-hidden="true" />
            </Button>
          }
        >
          <ul className="flex flex-wrap gap-2" aria-label="Herramientas de estadística avanzada">
            {ANALYSIS_PANELS.map((panel) => (
              <li key={panel.id}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title={panel.hint}
                  onClick={() => onNavigate(`analizar/${panel.id}`)}
                >
                  {panel.title}
                </Button>
              </li>
            ))}
          </ul>
        </Door>

        <Door
          icon={TrendingUp}
          label="Evaluar un proyecto"
          title="¿Es rentable tu proyecto?"
          body="Arma el flujo de caja a varios años y obtén VPN, TIR, periodo de recuperación y la decisión, con escenarios y libro de Excel."
          actions={
            <>
              <Button type="button" onClick={() => onNavigate("rentabilidad")}>
                Evaluar mi proyecto
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" onClick={() => onNavigate("rentabilidad/cafe")}>
                Ver un ejemplo
              </Button>
            </>
          }
        >
          <p className="text-muted-foreground text-sm">No necesitas cargar datos para empezar.</p>
        </Door>

        <Door
          icon={FileText}
          label="Tus resultados"
          title="Mis informes"
          body={
            reportItems.length === 0
              ? "Aquí se juntan los resultados que guardes desde cualquier análisis, listos para descargar en PDF o Excel."
              : `Tu informe tiene ${reportItems.length} ${reportItems.length === 1 ? "resultado guardado" : "resultados guardados"} en este navegador.`
          }
          actions={
            <Button
              type="button"
              variant={reportItems.length === 0 ? "outline" : "default"}
              onClick={() => onNavigate("informe")}
            >
              {reportItems.length === 0 ? "Ver cómo funciona" : "Abrir mi informe"}
              <ArrowRight aria-hidden="true" />
            </Button>
          }
        >
          {recent.length > 0 ? (
            <ul className="border-rule flex flex-col border-t text-sm">
              {recent.map((item) => (
                <li key={item.id} className="border-rule truncate border-b py-2">
                  {item.title}
                </li>
              ))}
            </ul>
          ) : null}
        </Door>
      </div>

      <div className="border-rule flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <div className="flex items-start gap-3">
          <Compass aria-hidden="true" className="text-primary mt-0.5 size-5 shrink-0" />
          <p className="text-muted-foreground max-w-prose text-sm">
            <span className="text-foreground font-semibold">¿Primera vez o con una tarea?</span> El
            modo guiado te lleva de la pregunta al informe, fase por fase.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => onNavigate("guiado")}>
          Guíame paso a paso
        </Button>
      </div>
    </div>
  );
}
