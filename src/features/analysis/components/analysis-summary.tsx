"use client";

import { AlertTriangle, ChevronRight, Info } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import type { AnalysisResult, AnalysisWarning } from "../model/types";
import { SUMMARY_SECTION_ID } from "../use-cases/sections";

export interface AnalysisSummaryProps {
  result: AnalysisResult;
  /** Título editable de la pantalla. */
  title?: string;
}

/** Grupo de avisos informativos de una misma variable (o del análisis en general). */
interface InformativeGroup {
  readonly key: string;
  readonly variableName: string | null;
  readonly messages: readonly string[];
}

/**
 * Separa las advertencias reales sobre los datos (faltantes, decimales
 * ambiguos, tipos mixtos…) de los avisos meramente informativos de
 * aplicabilidad, y agrupa estos últimos por variable.
 */
function splitWarnings(result: AnalysisResult): {
  readonly real: readonly AnalysisWarning[];
  readonly informative: readonly InformativeGroup[];
} {
  const nameById = new Map(result.variables.map((v) => [v.variableId, v.variableName]));
  const real: AnalysisWarning[] = [];
  const byVariable = new Map<string, string[]>();

  for (const warning of result.warnings) {
    if (warning.informative !== true) {
      real.push(warning);
      continue;
    }
    const key = warning.variableId ?? "";
    const bucket = byVariable.get(key) ?? [];
    bucket.push(warning.shortMessage ?? warning.message);
    byVariable.set(key, bucket);
  }

  const informative: InformativeGroup[] = [...byVariable.entries()].map(([key, messages]) => ({
    key: key === "" ? "general" : key,
    variableName: key === "" ? null : (nameById.get(key) ?? key),
    messages,
  }));

  return { real, informative };
}

/**
 * Cabecera de la pantalla de resultados: cuántos datos se analizaron, qué
 * variables entraron y qué conviene tener en cuenta, en lenguaje llano.
 *
 * Los avisos de "este cálculo no aplica a esta variable" son esperables cuando
 * se usa "Seleccionar lo habitual" (la selección es global y la aplicabilidad
 * depende del tipo de cada variable), así que no se listan uno a uno: se
 * resumen en una línea y se despliegan agrupados por variable.
 */
export function AnalysisSummary({
  result,
  title = "Aquí están tus resultados",
}: AnalysisSummaryProps) {
  const { real, informative } = splitWarnings(result);
  const omittedCount = informative.reduce((total, group) => total + group.messages.length, 0);

  return (
    <section id={SUMMARY_SECTION_ID} className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">
          Revisa las tarjetas y las tablas. Puedes exportarlas cuando quieras.
        </p>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">{result.totalRows} fila(s) de datos</Badge>
        <Badge variant="secondary">{result.variables.length} variable(s) analizada(s)</Badge>
        {result.contingencies.length > 0 ? (
          <Badge variant="secondary">{result.contingencies.length} cruce(s)</Badge>
        ) : null}
      </div>

      {result.variables.length === 0 ? (
        <EmptyState
          title="No hay variables analizadas"
          description="Vuelve al paso anterior y elige al menos una variable para ver resultados."
        />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {result.variables.map((variable) => (
            <li key={variable.variableId}>
              <Badge variant="outline">{variable.variableName}</Badge>
            </li>
          ))}
        </ul>
      )}

      {real.length > 0 ? (
        <Alert>
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>Revisa estos datos</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {real.map((warning, index) => (
                <li key={`${warning.code}-${index}`}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>Todo en orden con tus datos</AlertTitle>
          <AlertDescription>
            No hubo datos faltantes ni valores ambiguos en este análisis.
          </AlertDescription>
        </Alert>
      )}

      {omittedCount > 0 ? (
        <Alert>
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>Cálculos que no aplicaban</AlertTitle>
          <AlertDescription>
            <details className="group w-full">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium marker:content-none">
                <ChevronRight
                  className="size-4 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
                {omittedCount === 1
                  ? "Se omitió 1 cálculo que no aplica al tipo de esas variables. Ver detalle"
                  : `Se omitieron ${omittedCount} cálculos que no aplican al tipo de esas variables. Ver detalle`}
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {informative.map((group) => (
                  <div key={group.key}>
                    <p className="text-foreground font-medium">
                      {group.variableName ?? "En general"}
                    </p>
                    <ul className="list-disc pl-5">
                      {group.messages.map((message, index) => (
                        <li key={`${group.key}-${index}`}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
