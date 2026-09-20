"use client";

import type { ReactNode } from "react";

import { Cell, Legend, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatNumber, formatPercent } from "@/components/shared/format";
import type { FrequencyTableResult } from "@/core/statistics";

import { ChartContainer } from "./chart-container";
import { categoricalColorFor } from "./palette";

export interface PieChartProps {
  /** Acciones mostradas en la cabecera de la gráfica (p. ej. descargar PNG). */
  actions?: ReactNode;
  /** Tabla de frecuencias simple (categorías, no agrupada). */
  data: FrequencyTableResult;
  /** Título mostrado en el contenedor de la gráfica. */
  title: string;
  /** Descripción breve (una línea) de la gráfica. */
  description?: string;
  /** Máximo de categorías individuales antes de agrupar el resto en "Otros" (por defecto 10). */
  maxCategories?: number;
  className?: string;
}

interface Slice {
  readonly label: string;
  readonly value: number;
  readonly percent: number;
  readonly isOther: boolean;
}

const DEFAULT_MAX_CATEGORIES = 10;

function buildSlices(data: FrequencyTableResult, maxCategories: number): Slice[] {
  const rows = [...data.rows].sort((a, b) => b.absolute - a.absolute);
  if (rows.length <= maxCategories) {
    return rows.map((row) => ({
      label: row.label,
      value: row.absolute,
      percent: row.relative,
      isOther: false,
    }));
  }
  const kept = rows.slice(0, maxCategories - 1);
  const rest = rows.slice(maxCategories - 1);
  const otherValue = rest.reduce((acc, row) => acc + row.absolute, 0);
  const otherPercent = rest.reduce((acc, row) => acc + row.relative, 0);
  return [
    ...kept.map((row) => ({
      label: row.label,
      value: row.absolute,
      percent: row.relative,
      isOther: false,
    })),
    { label: "Otros", value: otherValue, percent: otherPercent, isOther: true },
  ];
}

/**
 * Gráfico circular (pastel) de una tabla de frecuencias simple, por categoría.
 * Docs/05-diseno.md §6: mismo color por categoría en todas las gráficas,
 * valor absoluto y porcentaje siempre visibles, agrupación de categorías en
 * exceso bajo "Otros" (RF, límite por defecto 10).
 */
export function PieChart({
  data,
  title,
  description,
  maxCategories = DEFAULT_MAX_CATEGORIES,
  className,
  actions,
}: PieChartProps) {
  const slices = buildSlices(data, maxCategories);
  const grouped = slices.some((slice) => slice.isOther);
  const containerId = `chart-${data.variableId}-pie`;

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
        aria-label={`Gráfico circular de ${data.variableId}, n = ${data.n}${
          grouped ? ", categorías menores agrupadas en Otros" : ""
        }`}
        className="flex h-full w-full flex-col gap-2"
      >
        {grouped ? (
          <p className="text-muted-foreground text-xs">
            Se agruparon las categorías con menor frecuencia en &quot;Otros&quot; (más de{" "}
            {maxCategories} categorías).
          </p>
        ) : null}
        <ResponsiveContainer width="100%" height={320}>
          <RePieChart>
            <Pie
              data={slices as unknown as Record<string, unknown>[]}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={110}
              label={(props) => {
                const payload = props.payload as unknown as Slice | undefined;
                if (!payload) return "";
                return `${payload.label} · ${payload.value} (${formatPercent(payload.percent)})`;
              }}
            >
              {slices.map((slice) => (
                <Cell
                  key={slice.label}
                  fill={slice.isOther ? "var(--chart-8)" : categoricalColorFor(slice.label)}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const numeric = typeof value === "number" ? value : Number(value);
                const payload = item.payload as unknown as Slice;
                return [
                  `${formatNumber(numeric, { decimals: 0 })} (${formatPercent(payload.percent)})`,
                  payload.label,
                ];
              }}
            />
            <Legend />
          </RePieChart>
        </ResponsiveContainer>
        <table className="sr-only">
          <caption>Datos del gráfico circular de {data.variableId}</caption>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Valor</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.label}>
                <td>{slice.label}</td>
                <td>{formatNumber(slice.value, { decimals: 0 })}</td>
                <td>{formatPercent(slice.percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
