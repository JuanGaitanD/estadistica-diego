"use client";

import type { ReactNode } from "react";

import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPercent } from "@/components/shared/format";
import type { ContingencyResult } from "@/core/statistics";

import { AXIS_PROPS, GRID_PROPS, LEGEND_PROPS, TOOLTIP_PROPS } from "./chart-theme";
import { ChartContainer } from "./chart-container";
import { categoricalColorFor } from "./palette";

export interface GroupedBarChartProps {
  actions?: ReactNode;
  data: ContingencyResult;
  title: string;
  description?: string;
  className?: string;
}

/** Filas del gráfico: un grupo por categoría de fila con el % de cada columna dentro de ella. */
export function groupedBarRows(data: ContingencyResult): Record<string, string | number>[] {
  return data.rowLabels.map((label, row) => {
    const entry: Record<string, string | number> = { grupo: label };
    data.columnLabels.forEach((column, index) => {
      entry[column] = data.cells[row]?.[index]?.rowPercent ?? 0;
    });
    return entry;
  });
}

/**
 * Barras agrupadas de un cruce (RF-25): un grupo por categoría de la fila y
 * una barra por categoría de la columna, en porcentaje **dentro de cada
 * grupo**, para comparar grupos de distinto tamaño.
 */
export function GroupedBarChart({
  actions,
  data,
  title,
  description,
  className,
}: GroupedBarChartProps) {
  const rows = groupedBarRows(data);
  const id = `chart-${data.rowVariableId}-${data.columnVariableId}-grouped`;
  return (
    <ChartContainer
      id={id}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div
        role="img"
        aria-label={`Barras agrupadas: porcentaje de cada ${data.columnVariableId} dentro de cada ${data.rowVariableId}`}
        className="flex h-full w-full flex-col gap-2"
      >
        <ResponsiveContainer width="100%" height={320}>
          <ReBarChart data={rows} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="grupo" {...AXIS_PROPS} />
            <YAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value} %`}
              {...AXIS_PROPS}
              width={48}
            />
            <Tooltip
              {...TOOLTIP_PROPS}
              formatter={(value) =>
                formatPercent(typeof value === "number" ? value : Number(value), {
                  alreadyScaled: true,
                })
              }
            />
            <Legend {...LEGEND_PROPS} />
            {data.columnLabels.map((column) => (
              <Bar
                key={column}
                dataKey={column}
                fill={categoricalColorFor(column)}
                isAnimationActive={false}
              />
            ))}
          </ReBarChart>
        </ResponsiveContainer>
        <div className="sr-only">
          <table className="w-px table-fixed">
            <caption>Porcentaje dentro de cada grupo</caption>
            <thead>
              <tr>
                <th>Grupo</th>
                {data.columnLabels.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.grupo)}>
                  <td>{row.grupo}</td>
                  {data.columnLabels.map((column) => (
                    <td key={column}>
                      {formatPercent(Number(row[column] ?? 0), { alreadyScaled: true })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ChartContainer>
  );
}
