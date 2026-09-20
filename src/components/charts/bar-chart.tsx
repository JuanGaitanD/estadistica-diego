"use client";

import type { ReactNode } from "react";

import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber, formatPercent } from "@/components/shared/format";
import type { FrequencyTableResult } from "@/core/statistics";

import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS } from "./chart-theme";
import { ChartContainer } from "./chart-container";
import { categoricalColorFor } from "./palette";

export type BarMeasure = "absolute" | "relative" | "percentage";
export type BarColorMode = "category" | "single";

export interface BarChartProps {
  /** Acciones mostradas en la cabecera de la gráfica (p. ej. descargar PNG). */
  actions?: ReactNode;
  data: FrequencyTableResult;
  title: string;
  description?: string;
  /** Qué magnitud graficar: frecuencia absoluta, relativa (0-1) o porcentual. */
  measure?: BarMeasure;
  /** "category": un color por categoría (palette.ts); "single": un solo color de variable. */
  colorMode?: BarColorMode;
  /** Orientación horizontal, útil cuando hay muchas categorías o etiquetas largas. */
  horizontal?: boolean;
  className?: string;
}

interface BarDatum {
  readonly label: string;
  readonly value: number;
  readonly percent: number;
}

function measureValue(row: FrequencyTableResult["rows"][number], measure: BarMeasure): number {
  if (measure === "absolute") return row.absolute;
  if (measure === "relative") return row.relative;
  return row.relative * 100;
}

function measureLabel(measure: BarMeasure): string {
  if (measure === "absolute") return "Frecuencia absoluta (fi)";
  if (measure === "relative") return "Frecuencia relativa (hi)";
  return "Porcentaje (%)";
}

/**
 * Gráfico de barras de frecuencia por categoría/clase. Docs/05-diseno.md §6:
 * mismo color por categoría en todas las gráficas, valor y porcentaje visibles
 * como etiqueta, eje con etiquetas rotadas si son largas.
 */
export function BarChart({
  data,
  title,
  description,
  measure = "absolute",
  colorMode = "category",
  horizontal = false,
  className,
  actions,
}: BarChartProps) {
  const bars: BarDatum[] = data.rows.map((row) => ({
    label: row.label,
    value: measureValue(row, measure),
    percent: row.relative,
  }));
  const hasLongLabels = bars.some((bar) => bar.label.length > 8);
  const containerId = `chart-${data.variableId}-bar`;

  return (
    <ChartContainer
      id={containerId}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div
        role="img"
        aria-label={`Gráfico de barras de ${measureLabel(measure).toLowerCase()} de ${data.variableId}, n = ${data.n}`}
        className="flex h-full w-full flex-col gap-2"
      >
        <ResponsiveContainer width="100%" height={320}>
          <ReBarChart
            data={bars as unknown as Record<string, unknown>[]}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 24, right: 16, left: 16, bottom: hasLongLabels ? 48 : 16 }}
          >
            <CartesianGrid {...GRID_PROPS} />
            {horizontal ? (
              <>
                <XAxis type="number" {...AXIS_PROPS} />
                <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={120} />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="label"
                  {...AXIS_PROPS}
                  angle={hasLongLabels ? -35 : 0}
                  textAnchor={hasLongLabels ? "end" : "middle"}
                  height={hasLongLabels ? 60 : 30}
                />
                <YAxis type="number" {...AXIS_PROPS} width={40} />
              </>
            )}
            <Tooltip
              {...TOOLTIP_PROPS}
              formatter={(value, _name, item) => {
                const numeric = typeof value === "number" ? value : Number(value);
                const payload = item.payload as unknown as BarDatum;
                return [
                  `${formatNumber(numeric, { decimals: measure === "relative" ? 3 : 0 })} (${formatPercent(payload.percent)})`,
                  measureLabel(measure),
                ];
              }}
            />
            <Bar dataKey="value" name={measureLabel(measure)} isAnimationActive={false}>
              {bars.map((bar) => (
                <Cell
                  key={bar.label}
                  fill={
                    colorMode === "single"
                      ? categoricalColorFor(data.variableId)
                      : categoricalColorFor(bar.label)
                  }
                />
              ))}
              <LabelList
                dataKey="value"
                position={horizontal ? "right" : "top"}
                formatter={(value) =>
                  formatNumber(typeof value === "number" ? value : Number(value), {
                    decimals: measure === "relative" ? 2 : 0,
                  })
                }
                className="sl-chart-value"
              />
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
        <table className="sr-only">
          <caption>Datos del gráfico de barras de {data.variableId}</caption>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>{measureLabel(measure)}</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.label}>
                <td>{bar.label}</td>
                <td>{formatNumber(bar.value, { decimals: measure === "relative" ? 3 : 0 })}</td>
                <td>{formatPercent(bar.percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
