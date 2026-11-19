"use client";

import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, type CashFlowYear } from "@/core/finance";

import { AXIS_PROPS, GRID_PROPS, LEGEND_PROPS, TOOLTIP_PROPS } from "./chart-theme";
import { ChartContainer } from "./chart-container";
import { getCategoricalColor } from "./palette";

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export interface CashFlowChartProps {
  id: string;
  rows: readonly CashFlowYear[];
  /** Rótulo de cada año («Año 1 (2027)»), en el orden de `rows`. */
  labels: readonly string[];
  actions?: ReactNode;
}

/**
 * Flujo neto por año (barras; las salidas en rojo) y el valor presente
 * acumulado (línea): donde la línea cruza el cero se recupera la inversión.
 */
export function CashFlowChart({ id, rows, labels, actions }: CashFlowChartProps) {
  const data = rows.map((row, index) => ({
    label: labels[index] ?? `Año ${row.year}`,
    netFlow: row.netFlow,
    cumulative: row.cumulativePresentValue,
  }));
  const line = "var(--foreground)";

  return (
    <ChartContainer
      id={id}
      title="Flujo de caja por año y valor presente acumulado"
      description="Las barras son lo que entra o sale cada año. La línea suma esos flujos en pesos de hoy: cuando cruza el cero, la inversión ya se recuperó."
      {...(actions !== undefined ? { actions } : {})}
    >
      <div role="img" aria-label="Gráfica del flujo de caja proyectado" className="h-full w-full">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis
              type="number"
              {...AXIS_PROPS}
              width={56}
              tickFormatter={(value: number) => compact.format(value)}
            />
            <ReferenceLine y={0} stroke="var(--foreground)" strokeWidth={1.5} />
            <Tooltip
              {...TOOLTIP_PROPS}
              formatter={(value, name) => [
                formatMoney(typeof value === "number" ? value : Number(value)),
                name,
              ]}
            />
            <Legend {...LEGEND_PROPS} />
            <Bar
              dataKey="netFlow"
              name="Flujo neto"
              fill={getCategoricalColor(0)}
              isAnimationActive={false}
            >
              {data.map((datum) => (
                <Cell
                  key={datum.label}
                  fill={datum.netFlow < 0 ? "var(--destructive)" : getCategoricalColor(0)}
                />
              ))}
            </Bar>
            <Line
              type="linear"
              dataKey="cumulative"
              name="Valor presente acumulado"
              stroke={line}
              strokeWidth={2}
              dot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)", fill: line }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
