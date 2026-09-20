"use client";

/** Paso 4: "Resultados" (RF-30 a RF-35). */
import { useEffect, useMemo, useState } from "react";

import {
  BarChart,
  ContingencyHeatmap,
  FrequencyPolygon,
  Ogive,
  PieChart,
  type ChartKind,
} from "@/components/charts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResultsNav, type ResultsNavGroup } from "@/components/layout/results-nav";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AnalysisSummary,
  ContingencyTable,
  RESULT_SECTIONS,
  VariableResults,
} from "@/features/analysis";
import type { AnalysisResult, AnalyzedVariable } from "@/features/analysis";
import { ChartDownloadButton, ExportToolbar } from "@/features/export";
import type { FrequencyTableResult } from "@/core/statistics";

import { chartElementId, chartsFor } from "../model/build-request";
import { useWizardStore } from "../store/wizard-store";
import { buildAvailableSections } from "../use-cases/report-sections";

const CHART_TITLE: Readonly<Record<ChartKind, string>> = {
  bar: "Diagrama de barras",
  pie: "Diagrama circular",
  polygon: "Polígono de frecuencias",
  ogive: "Ojiva",
};

function chartFor(
  kind: ChartKind,
  variable: AnalyzedVariable,
  table: FrequencyTableResult | undefined,
  grouped: FrequencyTableResult | undefined,
) {
  const elementId = chartElementId(variable.variableId, kind);
  const actions = <ChartDownloadButton elementId={elementId} filename={`${elementId}.png`} />;
  // El título dice qué gráfica es: en una página con varias por variable,
  // repetir solo el nombre de la variable no distingue nada.
  const common = { title: `${CHART_TITLE[kind]} · ${variable.variableName}`, actions } as const;

  if (kind === "pie") {
    // Con la variable agrupada, la tarta se dibuja sobre las clases.
    const data = grouped ?? table;
    if (data === undefined) return null;
    return <PieChart key={elementId} data={data} {...common} />;
  }
  if (kind === "bar") {
    const data = grouped ?? table;
    if (data === undefined) return null;
    return <BarChart key={elementId} data={data} {...common} />;
  }
  if (grouped === undefined) return null;
  if (kind === "polygon") {
    return <FrequencyPolygon key={elementId} data={grouped} {...common} />;
  }
  return <Ogive key={elementId} data={grouped} {...common} />;
}

const KIND_HINT: Readonly<Record<string, string>> = {
  nominal: "Cualitativa nominal",
  ordinal: "Cualitativa ordinal",
  discreta: "Cuantitativa discreta",
  continua: "Cuantitativa continua",
};

/**
 * Agrupa las secciones del resultado por variable para alimentar el índice
 * lateral. Reutiliza `RESULT_SECTIONS`, que ya emite exactamente los `id` que
 * renderizan los componentes de resultados.
 */
function navGroups(result: AnalysisResult): ResultsNavGroup[] {
  const sections = RESULT_SECTIONS(result);
  const groups: ResultsNavGroup[] = [];
  const linksByVariable = new Map<string, { id: string; label: string }[]>();

  for (const section of sections) {
    if (section.variableId === undefined) continue;
    const variable = result.variables.find((item) => item.variableId === section.variableId);
    if (variable === undefined) continue;

    let links = linksByVariable.get(section.variableId);
    if (links === undefined) {
      links = [];
      linksByVariable.set(section.variableId, links);
      groups.push({
        key: section.variableId,
        label: variable.variableName,
        hint: KIND_HINT[variable.kind] ?? "",
        links,
      });
    }
    links.push({ id: section.id, label: section.title.split(" · ")[1] ?? section.title });
  }

  const crosses = sections.filter((section) => section.kind === "contingencia");
  if (crosses.length > 0) {
    groups.push({
      key: "cruces",
      label: "Cruces de variables",
      links: crosses.map((section) => ({ id: section.id, label: section.title })),
    });
  }

  return groups;
}

export function StepResults() {
  const dataset = useWizardStore((state) => state.dataset);
  const calculation = useWizardStore((state) => state.calculation);
  const result = useWizardStore((state) => state.result);
  const isComputing = useWizardStore((state) => state.isComputing);
  const computeResult = useWizardStore((state) => state.computeResult);
  const goToStep = useWizardStore((state) => state.goToStep);
  const reset = useWizardStore((state) => state.reset);

  const [attempted, setAttempted] = useState(false);

  // El cálculo se lanza al entrar al paso, en un tick posterior, para que el
  // esqueleto de carga alcance a pintarse si `runAnalysis` tarda (RNF-06).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      computeResult();
      setAttempted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [computeResult]);

  const chartElementIds = useMemo(() => {
    if (result === null) return [];
    const ids: string[] = [];
    for (const variable of result.variables) {
      for (const kind of chartsFor(calculation, variable.variableId)) {
        ids.push(chartElementId(variable.variableId, kind));
      }
    }
    return ids;
  }, [result, calculation]);

  const availableSections = useMemo(
    () => (result === null ? [] : buildAvailableSections(result, chartElementIds)),
    [result, chartElementIds],
  );

  // Si el cálculo ya se intentó y no hubo resultado (por ejemplo, porque la
  // selección quedó vacía), se explica en vez de dejar el esqueleto girando.
  if (result === null && attempted && !isComputing) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="Todavía no hay nada que calcular"
          description="Vuelve al paso anterior y elige al menos un cálculo o una gráfica."
        />
        <div>
          <Button type="button" variant="outline" onClick={() => goToStep(2)}>
            Volver a los cálculos
          </Button>
        </div>
      </div>
    );
  }

  if (result === null || isComputing) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <h1 className="text-foreground text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight font-semibold">
          Calculando tus resultados…
        </h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const groups = navGroups(result);

  return (
    <div className="flex flex-col">
      {/* Cabecera de resultados: resumen y, en la misma zona, la exportación. */}
      <div className="border-rule flex flex-col gap-6 border-b pb-8">
        <AnalysisSummary result={result} />
        <ExportToolbar
          dataset={dataset ?? undefined}
          availableSections={availableSections}
          chartElementIds={chartElementIds}
          reportTitle="statlab_analisis"
          analysisName="Análisis descriptivo"
          sampleSize={result.totalRows}
        />
      </div>

      <div className="mt-8 gap-12 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
        <ResultsNav groups={groups} />

        <div className="gap-section flex min-w-0 flex-col">
          {result.variables.map((variable) => {
            const kinds = chartsFor(calculation, variable.variableId);
            return (
              <section
                key={variable.variableId}
                className="gap-block flex scroll-mt-28 flex-col"
                aria-labelledby={`titulo-${variable.variableId}`}
              >
                <VariableResults variable={variable} />
                {kinds.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    <h3 className="sl-label">Gráficas</h3>
                    {kinds.map((kind) =>
                      chartFor(
                        kind,
                        variable,
                        variable.analysis.frequency,
                        variable.analysis.groupedFrequency,
                      ),
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}

          {result.contingencies.map((cross) => (
            <section
              key={`${cross.request.rowVariableId}-${cross.request.columnVariableId}`}
              className="gap-block flex flex-col"
            >
              <ContingencyTable contingency={cross} />
              {cross.table !== null ? (
                <ContingencyHeatmap
                  data={cross.table}
                  title={`Mapa de calor: ${cross.rowVariableName} y ${cross.columnVariableName}`}
                  description="Cuanto más oscura la celda, más casos combinan esas dos categorías."
                />
              ) : null}
            </section>
          ))}

          <div className="border-rule flex flex-wrap items-center gap-3 border-t pt-8">
            <Button type="button" variant="outline" onClick={() => goToStep(2)}>
              Cambiar selección
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost">
                  Nuevo análisis
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Empezar un análisis nuevo?</DialogTitle>
                  <DialogDescription>
                    Se borrarán los datos cargados y la selección de cálculos. Esta acción no se
                    puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Seguir aquí
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button type="button" onClick={() => reset()}>
                      Sí, empezar de cero
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
