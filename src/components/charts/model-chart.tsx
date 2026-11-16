"use client";

import type { ReactNode } from "react";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber } from "@/components/shared/format";

import { AXIS_PROPS, GRID_PROPS, TOOLTIP_LINE_PROPS } from "./chart-theme";
import { ChartContainer } from "./chart-container";

export interface ModelChartProps {
  id: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  points: readonly { x: number; y: number }[];
  /** Recta o curva del modelo, como puntos ordenados por x. */
  line?: readonly { x: number; y: number }[];
  /** Línea horizontal en y = 0 (residuos). */
  zeroLine?: boolean;
  xLabel: string;
  yLabel: string;
  /** Texto alternativo. */
  summary: string;
  decimals?: number;
}

/**
 * Puntos de los datos con la recta o curva de un modelo: real contra
 * predicho, residuos, curva polinómica o sigmoide de la logística.
 */
export function ModelChart({
  id,
  title,
  description,
  actions,
  points,
  line,
  zeroLine = false,
  xLabel,
  yLabel,
  summary,
  decimals = 2,
}: ModelChartProps) {
  const f = (value: number): string => formatNumber(value, { decimals });
  return (
    <ChartContainer
      id={id}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div role="img" aria-label={summary} className="flex h-full w-full flex-col gap-2">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              type="number"
              dataKey="x"
              domain={["auto", "auto"]}
              tickFormatter={f}
              {...AXIS_PROPS}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={["auto", "auto"]}
              tickFormatter={f}
              width={52}
              {...AXIS_PROPS}
            />
            <Tooltip
              {...TOOLTIP_LINE_PROPS}
              formatter={(value, name) => [f(Number(value)), name === "x" ? xLabel : yLabel]}
            />
            {zeroLine ? <ReferenceLine y={0} stroke="var(--foreground)" strokeWidth={1.5} /> : null}
            <Scatter
              data={[...points]}
              fill="var(--accion)"
              fillOpacity={0.75}
              isAnimationActive={false}
            />
            {line !== undefined ? (
              <Scatter
                data={[...line]}
                line={{ stroke: "var(--foreground)", strokeWidth: 2 }}
                shape={() => <g />}
                legendType="none"
                isAnimationActive={false}
              />
            ) : null}
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-muted-foreground text-sm">
          Eje horizontal: {xLabel}; eje vertical: {yLabel}.
        </p>
      </div>
    </ChartContainer>
  );
}
