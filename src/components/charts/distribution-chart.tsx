"use client";

import type { ReactNode } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber } from "@/components/shared/format";

import { AXIS_PROPS, GRID_PROPS, TOOLTIP_LINE_PROPS, TOOLTIP_PROPS } from "./chart-theme";
import { ChartContainer } from "./chart-container";

const REGION = "var(--accion)";
const REST = "var(--cuadricula)";

export interface DistributionChartProps {
  id: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Puntos de la densidad (continua) o de la probabilidad puntual (discreta). */
  points: readonly { x: number; y: number }[];
  discrete: boolean;
  /** ¿Está x dentro de la región cuya probabilidad se pide? */
  inRegion: (x: number) => boolean;
  /** Texto alternativo con la probabilidad. */
  summary: string;
}

/**
 * Distribución con la probabilidad pedida sombreada (M3): curva con el área
 * coloreada para las continuas y barras resaltadas para las discretas.
 */
export function DistributionChart({
  id,
  title,
  description,
  actions,
  points,
  discrete,
  inRegion,
  summary,
}: DistributionChartProps) {
  const data = points.map((point) => ({
    x: point.x,
    y: point.y,
    region: inRegion(point.x) ? point.y : null,
  }));
  const f = (value: number) => formatNumber(value, { decimals: discrete ? 0 : 2 });
  return (
    <ChartContainer
      id={id}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div role="img" aria-label={summary} className="h-full w-full">
        <ResponsiveContainer width="100%" height={300}>
          {discrete ? (
            <ReBarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="x" tickFormatter={f} {...AXIS_PROPS} />
              <YAxis
                {...AXIS_PROPS}
                width={52}
                tickFormatter={(v: number) => formatNumber(v, { decimals: 2 })}
              />
              <Tooltip
                {...TOOLTIP_PROPS}
                formatter={(value) => [formatNumber(Number(value), { decimals: 4 }), "P(X = k)"]}
              />
              <Bar dataKey="y" isAnimationActive={false}>
                {data.map((point) => (
                  <Cell key={point.x} fill={point.region === null ? REST : REGION} />
                ))}
              </Bar>
            </ReBarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="x"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={f}
                {...AXIS_PROPS}
              />
              <YAxis
                {...AXIS_PROPS}
                width={52}
                tickFormatter={(v: number) => formatNumber(v, { decimals: 2 })}
              />
              <Tooltip
                {...TOOLTIP_LINE_PROPS}
                labelFormatter={(value) => `x = ${f(Number(value))}`}
                formatter={(value) => [formatNumber(Number(value), { decimals: 4 }), "Densidad"]}
              />
              <Area
                type="monotone"
                dataKey="y"
                stroke="var(--foreground)"
                strokeWidth={1.5}
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="region"
                stroke="none"
                fill={REGION}
                fillOpacity={0.45}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

export interface QqChartProps {
  id: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  points: readonly { theoretical: number; sample: number }[];
  /** Recta de referencia: muestra = media + desviación · z. */
  mean: number;
  sd: number;
  variableName: string;
}

/** Gráfico Q-Q normal: si los puntos siguen la recta, los datos se parecen a una normal. */
export function QqChart({
  id,
  title,
  description,
  actions,
  points,
  mean,
  sd,
  variableName,
}: QqChartProps) {
  const zMin = points[0]?.theoretical ?? -2;
  const zMax = points[points.length - 1]?.theoretical ?? 2;
  const line = [
    { theoretical: zMin, sample: mean + sd * zMin },
    { theoretical: zMax, sample: mean + sd * zMax },
  ];
  return (
    <ChartContainer
      id={id}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div
        role="img"
        aria-label={`Gráfico Q-Q normal de ${variableName}`}
        className="flex h-full w-full flex-col gap-2"
      >
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              type="number"
              dataKey="theoretical"
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => formatNumber(v, { decimals: 1 })}
              {...AXIS_PROPS}
            />
            <YAxis
              type="number"
              dataKey="sample"
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => formatNumber(v, { decimals: 2 })}
              {...AXIS_PROPS}
              width={52}
            />
            <Tooltip {...TOOLTIP_LINE_PROPS} />
            <Scatter data={[...points]} fill={REGION} isAnimationActive={false} />
            <Scatter
              data={line}
              line={{ stroke: "var(--foreground)", strokeWidth: 1.5 }}
              shape={() => <g />}
              isAnimationActive={false}
              legendType="none"
            />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-muted-foreground text-sm">
          Eje horizontal: cuantil de la normal estándar; eje vertical: {variableName}. Si los puntos
          siguen la recta, los datos se parecen a una normal; si se curvan en los extremos, no.
        </p>
      </div>
    </ChartContainer>
  );
}
