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
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisSummary, ContingencyTable, VariableResults } from "@/features/analysis";
import type { AnalyzedVariable } from "@/features/analysis";
import { ChartDownloadButton, ExportToolbar } from "@/features/export";
import type { FrequencyTableResult } from "@/core/statistics";

import { chartElementId, chartsFor } from "../model/build-request";
import { useWizardStore } from "../store/wizard-store";
import { buildAvailableSections } from "../use-cases/report-sections";

function chartFor(
  kind: ChartKind,
  variable: AnalyzedVariable,
  table: FrequencyTableResult | undefined,
  grouped: FrequencyTableResult | undefined,
) {
  const elementId = chartElementId(variable.variableId, kind);
  const actions = <ChartDownloadButton elementId={elementId} filename={`${elementId}.png`} />;
  const common = { title: `${variable.variableName}`, actions } as const;

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
        <h1 className="text-foreground text-3xl font-bold">Calculando tus resultados…</h1>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <AnalysisSummary result={result} />

      <ExportToolbar
        dataset={dataset ?? undefined}
        availableSections={availableSections}
        chartElementIds={chartElementIds}
        reportTitle="statlab_analisis"
        analysisName="Análisis descriptivo"
        sampleSize={result.totalRows}
      />

      {result.variables.map((variable) => {
        const kinds = chartsFor(calculation, variable.variableId);
        return (
          <section key={variable.variableId} className="flex flex-col gap-4">
            <VariableResults variable={variable} />
            {kinds.length > 0 ? (
              <div className="flex flex-col gap-4">
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
          className="flex flex-col gap-4"
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

      <div className="flex flex-wrap gap-2">
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
                Se borrarán los datos cargados y la selección de cálculos. Esta acción no se puede
                deshacer.
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
  );
}
