"use client";

/** Paso 4: "Resultados" (RF-30 a RF-35). */
import { useEffect, useMemo, useState } from "react";

import {
  BarChart,
  BoxPlot,
  ContingencyHeatmap,
  FrequencyPolygon,
  GroupedBarChart,
  Ogive,
  ParetoChart,
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
import { TallyMarks } from "@/components/layout/tally-marks";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AnalysisSummary,
  ContingencyTable,
  RESULT_SECTIONS,
  VariableResults,
} from "@/features/analysis";
import type { AnalysisResult, AnalyzedVariable } from "@/features/analysis";
import {
  captureChartAsDataUrl,
  ChartDownloadButton,
  CopyButton,
  ExportToolbar,
} from "@/features/export";
import { AddToReportButton, useReportStore } from "@/features/report";
import type { FrequencyTableResult } from "@/core/statistics";

import { chartElementId, chartsFor } from "../model/build-request";
import { useWizardStore } from "../store/wizard-store";
import {
  contingencyReportItem,
  crossChartElementId,
  crossReportItem,
  variableReportItem,
} from "../use-cases/report-items";
import { StepCalculations } from "./step-calculations";

const CHART_TITLE: Readonly<Record<ChartKind, string>> = {
  bar: "Diagrama de barras",
  pie: "Diagrama circular",
  pareto: "Diagrama de Pareto",
  box: "Diagrama de caja y bigotes",
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
  const name = kind === "bar" && grouped !== undefined ? "Histograma" : CHART_TITLE[kind];
  const common = { title: `${name} · ${variable.variableName}`, actions } as const;

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
  if (kind === "pareto") {
    if (table === undefined) return null;
    return <ParetoChart key={elementId} data={table} {...common} />;
  }
  if (kind === "box") {
    const summary = variable.analysis.box;
    if (summary === undefined) return null;
    return (
      <BoxPlot key={elementId} variableId={variable.variableId} summary={summary} {...common} />
    );
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
  const reset = useWizardStore((state) => state.reset);
  const addToReport = useReportStore((state) => state.add);

  const [attempted, setAttempted] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  // El cálculo se lanza en un tick posterior, para que el esqueleto de carga
  // alcance a pintarse si `runAnalysis` tarda (RNF-06). Se repite cada vez que
  // la selección cambia (el store deja `result` en null).
  useEffect(() => {
    if (result !== null) return;
    const timer = window.setTimeout(() => {
      computeResult();
      setAttempted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [computeResult, result]);

  const chartsOf = (variable: AnalyzedVariable) =>
    chartsFor(calculation, variable.variableId).map((kind) => ({
      elementId: chartElementId(variable.variableId, kind),
      title: `${CHART_TITLE[kind]} · ${variable.variableName}`,
    }));

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

  // Si el cálculo ya se intentó y no hubo resultado (por ejemplo, porque la
  // selección quedó vacía), se explica en vez de dejar el esqueleto girando.
  if (result === null && attempted && !isComputing) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="Todavía no hay nada que calcular"
          description="Elige al menos un cálculo o una gráfica."
        />
        <StepCalculations embedded />
      </div>
    );
  }

  if (result === null || isComputing) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <h1 className="text-foreground text-[2.125rem] leading-tight sm:text-[2.75rem]">
          Calculando tus resultados…
        </h1>
        <TallyMarks count={4} closed animated className="text-primary h-8 w-10" />
        <Skeleton className="h-40 w-full" />
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
          chartElementIds={chartElementIds}
          reportTitle="statlab_analisis"
          primaryAction={
            <AddToReportButton
              what="todas las variables"
              label="Añadir todo al informe"
              build={async () => {
                // Cada variable y cada cruce entran como resultado propio; el botón añade el último.
                const items = [];
                for (const variable of result.variables) {
                  items.push(
                    await variableReportItem(variable, chartsOf(variable), captureChartAsDataUrl),
                  );
                }
                for (const cross of result.contingencies) {
                  const item = await crossReportItem(cross, captureChartAsDataUrl);
                  if (item !== null) items.push(item);
                }
                const last = items.pop();
                if (last === undefined) throw new Error("sin resultados");
                for (const item of items) addToReport(item);
                return last;
              }}
            />
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            aria-expanded={adjusting}
            aria-controls="elegir-calculos"
            onClick={() => setAdjusting((open) => !open)}
          >
            {adjusting ? "Ocultar la selección de cálculos" : "Elegir qué se calcula"}
          </Button>
          <p className="text-muted-foreground text-sm">
            Mostramos lo habitual para cada tipo de variable; puedes añadir o quitar medidas y
            gráficas.
          </p>
        </div>
        {adjusting ? (
          <div id="elegir-calculos" className="sl-surface p-5 sm:p-7">
            <StepCalculations embedded />
          </div>
        ) : null}
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
                <VariableResults
                  variable={variable}
                  copyAction={(what, getText) => <CopyButton what={what} getText={getText} />}
                  reportAction={
                    <AddToReportButton
                      what={`la variable ${variable.variableName}`}
                      build={() =>
                        variableReportItem(variable, chartsOf(variable), captureChartAsDataUrl)
                      }
                    />
                  }
                />
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
              <ContingencyTable
                contingency={cross}
                interpretationActions={(() => {
                  const item = contingencyReportItem(cross);
                  return item === null ? null : (
                    <AddToReportButton
                      what={`el cruce de ${cross.rowVariableName} y ${cross.columnVariableName}`}
                      build={async () =>
                        (await crossReportItem(cross, captureChartAsDataUrl)) ?? item
                      }
                    />
                  );
                })()}
              />
              {cross.table !== null ? (
                <>
                  <GroupedBarChart
                    data={cross.table}
                    title={`Barras agrupadas: ${cross.columnVariableName} dentro de cada ${cross.rowVariableName}`}
                    description={`Cada grupo de barras suma 100 %: compara cómo se reparte ${cross.columnVariableName} en cada grupo, aunque los grupos tengan tamaños distintos.`}
                    actions={
                      <ChartDownloadButton
                        elementId={crossChartElementId(cross)}
                        filename={`barras_${cross.request.rowVariableId}_${cross.request.columnVariableId}.png`}
                      />
                    }
                  />
                  <ContingencyHeatmap
                    data={cross.table}
                    title={`Mapa de calor: ${cross.rowVariableName} y ${cross.columnVariableName}`}
                    description="Cuanto más oscura la celda, más casos combinan esas dos categorías."
                  />
                </>
              ) : null}
            </section>
          ))}

          <div className="border-rule flex flex-wrap items-center gap-3 border-t pt-8">
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
                    <Button type="button" variant="destructive" onClick={() => reset()}>
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
