"use client";

import type { ReactNode } from "react";

import { explanationFor, type FrequencyRow, type Metric } from "@/core/statistics";
import {
  formatMetricValue,
  formatNumber,
  formatPercent,
  isPercentMetric,
} from "@/components/shared/format";
import { HelpHint } from "@/components/shared/help-hint";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";

import type { AnalyzedVariable, VariableKind } from "../model/types";
import { variableSectionId } from "../use-cases/sections";
import { explanationText } from "./metric-explanation";

export interface VariableResultsProps {
  variable: AnalyzedVariable;
  /** Decimales de presentación. Por defecto 2. */
  decimals?: number;
}

const KIND_LABEL: Readonly<Record<VariableKind, string>> = {
  nominal: "Cualitativa nominal",
  ordinal: "Cualitativa ordinal",
  discreta: "Cuantitativa discreta",
  continua: "Cuantitativa continua",
};

const MODE_BADGE: Readonly<Record<"amodal" | "unimodal" | "multimodal", string>> = {
  amodal: "Amodal: ningún valor destaca",
  unimodal: "Moda única",
  multimodal: "Moda múltiple",
};

function metricCard(metric: Metric, decimals: number, badge?: string): ReactNode {
  const common = {
    name: metric.label,
    meaning: metric.explanation.what,
    purpose: metric.explanation.why,
    ...(metric.explanation.formula !== undefined ? { formula: metric.explanation.formula } : {}),
    ...(badge !== undefined ? { badge } : {}),
  };
  if (metric.value === null) {
    return (
      <MetricCard
        key={metric.key}
        {...common}
        available={false}
        reason={metric.unavailableReason ?? "No se pudo calcular con estos datos."}
      />
    );
  }
  return (
    <MetricCard
      key={metric.key}
      {...common}
      value={formatMetricValue(metric, decimals) ?? "—"}
      {...(isPercentMetric(metric) ? { unit: "%" } : {})}
    />
  );
}

/** Texto del valor de una métrica dentro de una tabla. */
function metricText(metric: Metric, decimals: number): ReactNode {
  if (metric.value === null) {
    return (
      <span className="text-muted-foreground">
        No disponible — {metric.unavailableReason ?? "no se pudo calcular."}
      </span>
    );
  }
  const text = formatMetricValue(metric, decimals);
  return isPercentMetric(metric) ? `${text} %` : text;
}

interface FrequencyDisplayRow {
  key: string;
  label: string;
  classMark: number | null;
  absolute: number;
  relative: number;
  cumulativeAbsolute: number | null;
  cumulativeRelative: number | null;
  isTotal: boolean;
}

function toDisplayRows(rows: readonly FrequencyRow[], n: number): FrequencyDisplayRow[] {
  const display: FrequencyDisplayRow[] = rows.map((row, index) => ({
    key: `${index}-${row.label}`,
    label: row.label,
    classMark: row.classMark ?? null,
    absolute: row.absolute,
    relative: row.relative,
    cumulativeAbsolute: row.cumulativeAbsolute,
    cumulativeRelative: row.cumulativeRelative,
    isTotal: false,
  }));
  display.push({
    key: "total",
    label: "Total",
    classMark: null,
    absolute: n,
    relative: rows.length > 0 ? 1 : 0,
    cumulativeAbsolute: null,
    cumulativeRelative: null,
    isTotal: true,
  });
  return display;
}

interface MetricRow {
  key: string;
  label: string;
  metric: Metric;
}

function metricRows(metrics: readonly Metric[]): MetricRow[] {
  return metrics.map((metric) => ({ key: metric.key, label: metric.label, metric }));
}

/**
 * Bloques de resultados de una variable: resumen (con tendencia central),
 * frecuencias, posición y variabilidad. Recibe todo ya calculado; no tiene
 * estado propio ni accede al store.
 */
export function VariableResults({ variable, decimals = 2 }: VariableResultsProps) {
  const { analysis, request } = variable;
  const frequency = analysis.groupedFrequency ?? analysis.frequency;
  const grouped = analysis.groupedFrequency !== undefined;
  const relativeIsPercent = request.frequency.relativeMode === "porcentaje";

  const frequencyColumns: DataTableColumn<FrequencyDisplayRow>[] = [
    {
      key: "label",
      label: grouped ? "Clase [a, b)" : "Valor",
      format: (row) => (row.isTotal ? <span className="font-semibold">Total</span> : row.label),
    },
  ];
  if (grouped && request.frequency.showClassMark) {
    frequencyColumns.push({
      key: "classMark",
      label: "Marca de clase (xi)",
      align: "right",
      format: (row) => (row.classMark === null ? "" : formatNumber(row.classMark, { decimals })),
    });
  }
  frequencyColumns.push({
    key: "absolute",
    label: "Frecuencia absoluta (fi)",
    align: "right",
    format: (row) => formatNumber(row.absolute, { decimals: 0 }),
  });
  frequencyColumns.push({
    key: "relative",
    label: relativeIsPercent ? "Frecuencia porcentual (pi)" : "Frecuencia relativa (hi)",
    align: "right",
    format: (row) =>
      relativeIsPercent
        ? formatPercent(row.relative, { decimals })
        : formatNumber(row.relative, { decimals }),
  });
  if (request.frequency.showCumulative) {
    frequencyColumns.push({
      key: "cumulativeAbsolute",
      label: "Acumulada (Fi)",
      align: "right",
      format: (row) =>
        row.cumulativeAbsolute === null
          ? ""
          : formatNumber(row.cumulativeAbsolute, { decimals: 0 }),
    });
    frequencyColumns.push({
      key: "cumulativeRelative",
      label: relativeIsPercent ? "Acumulada porcentual (Pi)" : "Acumulada relativa (Hi)",
      align: "right",
      format: (row) => {
        if (row.cumulativeRelative === null) return "";
        return relativeIsPercent
          ? formatPercent(row.cumulativeRelative, { decimals })
          : formatNumber(row.cumulativeRelative, { decimals });
      },
    });
  }

  const positionResult = analysis.position;
  const ric = analysis.variability?.metrics.find((metric) => metric.key === "ric");
  const positionMetrics: Metric[] = positionResult
    ? [
        ...positionResult.quartiles,
        ...positionResult.deciles,
        ...positionResult.percentiles,
        ...(ric ? [ric] : []),
      ]
    : [];

  const metricTableColumns: DataTableColumn<MetricRow>[] = [
    {
      key: "label",
      label: "Medida",
      format: (row) => (
        <span className="inline-flex items-center gap-1.5">
          {row.label}
          <HelpHint label={explanationText(row.metric.explanation)} />
        </span>
      ),
    },
    {
      key: "value",
      label: "Valor",
      align: "right",
      format: (row) => metricText(row.metric, decimals),
    },
  ];

  return (
    <article className="flex flex-col gap-6" data-variable-id={variable.variableId}>
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-foreground text-2xl font-bold">{variable.variableName}</h2>
        <Badge variant="secondary">{KIND_LABEL[variable.kind]}</Badge>
        {grouped ? <Badge variant="outline">Agrupada en intervalos</Badge> : null}
      </header>

      <div id={variableSectionId(variable.variableId, "resumen")}>
        <SectionCard
          title="Resumen"
          description="Lo esencial de la variable, con su explicación en cada tarjeta."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.summary.map((metric) => metricCard(metric, decimals))}
            {analysis.central?.metrics.map((metric) => metricCard(metric, decimals, "Promedios"))}
            {analysis.central?.groupedMean
              ? metricCard(analysis.central.groupedMean, decimals, "Datos agrupados")
              : null}
            {analysis.central?.groupedMedian
              ? metricCard(analysis.central.groupedMedian, decimals, "Datos agrupados")
              : null}
            {analysis.central?.groupedMode
              ? metricCard(analysis.central.groupedMode, decimals, "Datos agrupados")
              : null}
            {analysis.central === undefined ? null : analysis.central.mode.values.length === 0 ? (
              <MetricCard
                name="Moda"
                badge={MODE_BADGE[analysis.central.mode.kind]}
                meaning={analysis.central.mode.explanation.what}
                purpose={analysis.central.mode.explanation.why}
                available={false}
                reason="Todos los valores se repiten la misma cantidad de veces: la variable es amodal."
              />
            ) : (
              <MetricCard
                name="Moda"
                badge={MODE_BADGE[analysis.central.mode.kind]}
                meaning={analysis.central.mode.explanation.what}
                purpose={analysis.central.mode.explanation.why}
                value={analysis.central.mode.values
                  .map(
                    (entry) =>
                      `${
                        typeof entry.value === "number"
                          ? formatNumber(entry.value, { decimals })
                          : entry.value
                      } (${formatNumber(entry.count, { decimals: 0 })} veces)`,
                  )
                  .join(" · ")}
              />
            )}
            {analysis.ordinalMedian === undefined ? null : analysis.ordinalMedian.label === null ? (
              <MetricCard
                name="Mediana (categoría)"
                meaning={analysis.ordinalMedian.explanation.what}
                purpose={analysis.ordinalMedian.explanation.why}
                available={false}
                reason={
                  analysis.ordinalMedian.unavailableReason ?? "No se pudo determinar la mediana."
                }
              />
            ) : (
              <MetricCard
                name="Mediana (categoría)"
                meaning={analysis.ordinalMedian.explanation.what}
                purpose={analysis.ordinalMedian.explanation.why}
                value={analysis.ordinalMedian.label}
              />
            )}
            {variable.unavailable.map((entry) => (
              <MetricCard
                key={entry.key}
                name={entry.label}
                available={false}
                reason={entry.reason}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      {frequency ? (
        <div id={variableSectionId(variable.variableId, "frecuencias")}>
          <SectionCard
            title="Tabla de frecuencias"
            description={`${frequency.n} dato(s) válido(s)${
              frequency.excluded > 0 ? ` · ${frequency.excluded} excluido(s) por faltantes` : ""
            }`}
          >
            <DataTable
              columns={frequencyColumns}
              rows={toDisplayRows(frequency.rows, frequency.n)}
              caption={`Tabla de frecuencias de ${variable.variableName}`}
              getRowKey={(row) => row.key}
              getCellClassName={(row) => (row.isTotal ? "bg-muted font-semibold" : undefined)}
            />
            {grouped && frequency.k !== undefined ? (
              <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-1.5 text-sm">
                <span>
                  Número de intervalos K = {frequency.k}
                  {frequency.rule ? ` (regla: ${frequency.rule})` : ""}
                </span>
                <HelpHint label={explanationText(explanationFor("numero-de-intervalos"))} />
                {frequency.intervalLength !== undefined ? (
                  <>
                    <span>
                      · Longitud de intervalo l ={" "}
                      {formatNumber(frequency.intervalLength, { decimals })}
                    </span>
                    <HelpHint label={explanationText(explanationFor("longitud-de-intervalo"))} />
                  </>
                ) : null}
              </p>
            ) : null}
            <p className="text-muted-foreground mt-2 text-sm">
              {explanationText(frequency.explanation)}
            </p>
          </SectionCard>
        </div>
      ) : null}

      {positionResult && positionMetrics.length > 0 ? (
        <div id={variableSectionId(variable.variableId, "posicion")}>
          <SectionCard
            title="Medidas de posición"
            description={`Cuartiles calculados con el método ${positionResult.method} (${
              positionResult.method === "inclusivo"
                ? "R-7, el de Excel .INC"
                : "R-6, el de Excel .EXC"
            }).`}
          >
            <DataTable
              columns={metricTableColumns}
              rows={metricRows(positionMetrics)}
              caption={`Medidas de posición de ${variable.variableName}`}
              getRowKey={(row) => row.key}
            />
          </SectionCard>
        </div>
      ) : null}

      {analysis.variability && analysis.variability.metrics.length > 0 ? (
        <div id={variableSectionId(variable.variableId, "variabilidad")}>
          <SectionCard
            title="Medidas de variabilidad"
            description="Cuánto se alejan los datos entre sí y respecto a su centro."
          >
            <DataTable
              columns={metricTableColumns}
              rows={metricRows(analysis.variability.metrics)}
              caption={`Medidas de variabilidad de ${variable.variableName}`}
              getRowKey={(row) => row.key}
            />
            {analysis.variability.outliers.length > 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                Valores atípicos detectados:{" "}
                {analysis.variability.outliers
                  .map((value) => formatNumber(value, { decimals }))
                  .join(", ")}
                .
              </p>
            ) : null}
          </SectionCard>
        </div>
      ) : null}

      {analysis.notes.length > 0 ? (
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          {analysis.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
