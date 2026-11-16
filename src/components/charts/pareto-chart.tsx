"use client";

import type { ReactNode } from "react";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
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

export interface ParetoChartProps {
  actions?: ReactNode;
  data: FrequencyTableResult;
  title: string;
  description?: string;
  className?: string;
}

interface ParetoDatum {
  readonly label: string;
  readonly value: number;
  /** Porcentaje acumulado 0..100. */
  readonly cumulative: number;
}

/** Categorías de mayor a menor con su porcentaje acumulado (empates por etiqueta). */
export function paretoRows(data: FrequencyTableResult): ParetoDatum[] {
  const sorted = [...data.rows].sort(
    (a, b) => b.absolute - a.absolute || a.label.localeCompare(b.label, "es"),
  );
  let running = 0;
  return sorted.map((row) => {
    running += row.absolute;
    return {
      label: row.label,
      value: row.absolute,
      cumulative: data.n > 0 ? (100 * running) / data.n : 0,
    };
  });
}

/**
 * Diagrama de Pareto: categorías ordenadas de la más a la menos frecuente y
 * la línea del porcentaje acumulado, para ver qué pocas categorías reúnen la
 * mayor parte de los casos.
 */
export function ParetoChart({ actions, data, title, description, className }: ParetoChartProps) {
  const rows = paretoRows(data);
  const hasLongLabels = rows.some((row) => row.label.length > 8);
  const line = "var(--foreground)";

  return (
    <ChartContainer
      id={`chart-${data.variableId}-pareto`}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div
        role="img"
        aria-label={`Diagrama de Pareto de ${data.variableId}, n = ${data.n}`}
        className="flex h-full w-full flex-col gap-2"
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={rows as unknown as Record<string, unknown>[]}
            margin={{ top: 24, right: 8, left: 8, bottom: hasLongLabels ? 48 : 16 }}
          >
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="label"
              {...AXIS_PROPS}
              angle={hasLongLabels ? -35 : 0}
              textAnchor={hasLongLabels ? "end" : "middle"}
              height={hasLongLabels ? 60 : 30}
            />
            <YAxis yAxisId="fi" type="number" {...AXIS_PROPS} width={40} />
            <YAxis
              yAxisId="pct"
              orientation="right"
              type="number"
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value} %`}
              {...AXIS_PROPS}
              width={48}
            />
            <Tooltip
              {...TOOLTIP_PROPS}
              formatter={(value, name) => {
                const numeric = typeof value === "number" ? value : Number(value);
                return name === "Acumulado"
                  ? [formatPercent(numeric, { alreadyScaled: true }), "Porcentaje acumulado"]
                  : [formatNumber(numeric, { decimals: 0 }), "Frecuencia (fi)"];
              }}
            />
            <Bar
              yAxisId="fi"
              dataKey="value"
              name="Frecuencia"
              fill={categoricalColorFor(data.variableId)}
              isAnimationActive={false}
            >
              <LabelList dataKey="value" position="top" className="sl-chart-value" />
            </Bar>
            <Line
              yAxisId="pct"
              type="linear"
              dataKey="cumulative"
              name="Acumulado"
              stroke={line}
              strokeWidth={2}
              dot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)", fill: line }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="sr-only">
          <table className="w-px table-fixed">
            <caption>Datos del diagrama de Pareto de {data.variableId}</caption>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Frecuencia</th>
                <th>Porcentaje acumulado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.value}</td>
                  <td>{formatPercent(row.cumulative, { alreadyScaled: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ChartContainer>
  );
}
