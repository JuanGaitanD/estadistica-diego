"use client";

import type { ReactNode } from "react";

import {
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber } from "@/components/shared/format";
import type { SimpleRegression } from "@/core/statistics";

import { AXIS_PROPS, GRID_PROPS, TOOLTIP_LINE_PROPS } from "./chart-theme";
import { ChartContainer } from "./chart-container";

/** Por encima de este n los residuos no se dibujan como segmentos (se vuelve ilegible). */
export const MAX_RESIDUAL_SEGMENTS = 150;

const POINT = "var(--accion)";
const LINE = "var(--foreground)";
const RESIDUAL = "var(--destructive)";

interface RegressionChartProps {
  id: string;
  model: SimpleRegression;
  xName: string;
  yName: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  decimals?: number;
}

/**
 * Dispersión de X e Y con la recta de mínimos cuadrados y, si hay pocos
 * puntos, cada residuo dibujado como un segmento vertical hasta la recta:
 * se ve qué es lo que se minimiza (docs/09 M6).
 */
export function ScatterRegressionChart({
  id,
  model,
  xName,
  yName,
  title,
  description,
  actions,
  decimals = 2,
}: RegressionChartProps) {
  const points = model.rows.map((row) => ({ x: row.x, y: row.y }));
  const segments = model.n <= MAX_RESIDUAL_SEGMENTS;
  const f = (value: number): string => formatNumber(value, { decimals });
  return (
    <ChartContainer
      id={id}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div
        role="img"
        aria-label={`Dispersión de ${yName} contra ${xName} con la recta Ŷ = ${f(model.b0)} + ${f(model.b1)}·X${segments ? " y los residuos como segmentos" : ""}`}
        className="flex h-full w-full flex-col gap-2"
      >
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 16, right: 24, left: 16, bottom: 28 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              type="number"
              dataKey="x"
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => f(value)}
              {...AXIS_PROPS}
            >
              <Label value={xName} position="insideBottom" offset={-18} style={{ fontSize: 12 }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => f(value)}
              {...AXIS_PROPS}
              width={48}
            >
              <Label value={yName} angle={-90} position="insideLeft" style={{ fontSize: 12 }} />
            </YAxis>
            <Tooltip
              {...TOOLTIP_LINE_PROPS}
              formatter={(value, name) => [f(Number(value)), name === "x" ? xName : yName]}
            />
            {segments
              ? model.rows.map((row, index) => (
                  <ReferenceLine
                    key={`e-${index}`}
                    segment={[
                      { x: row.x, y: row.y },
                      { x: row.x, y: row.fitted },
                    ]}
                    stroke={RESIDUAL}
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                    ifOverflow="extendDomain"
                  />
                ))
              : null}
            <ReferenceLine
              segment={[
                { x: model.minX, y: model.b0 + model.b1 * model.minX },
                { x: model.maxX, y: model.b0 + model.b1 * model.maxX },
              ]}
              stroke={LINE}
              strokeWidth={2.25}
              ifOverflow="extendDomain"
            />
            <Scatter
              data={points}
              fill={POINT}
              stroke="var(--card)"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-muted-foreground text-sm">
          Puntos: tus datos. Línea: la recta Ŷ = {f(model.b0)} {model.b1 < 0 ? "−" : "+"}{" "}
          {f(Math.abs(model.b1))}·X.
          {segments
            ? " Rayas rojas: el error de cada punto; la recta es la que hace más pequeña la suma de sus cuadrados."
            : null}
        </p>
      </div>
    </ChartContainer>
  );
}

/**
 * Residuos contra valores ajustados: si la recta es adecuada, los puntos se
 * reparten sin forma alrededor de 0.
 */
export function ResidualChart({
  id,
  model,
  yName,
  title,
  description,
  actions,
  decimals = 2,
}: RegressionChartProps) {
  const points = model.rows.map((row) => ({ x: row.fitted, y: row.residual }));
  const f = (value: number): string => formatNumber(value, { decimals });
  return (
    <ChartContainer
      id={id}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div
        role="img"
        aria-label={`Residuos contra ${yName} predicho`}
        className="flex h-full w-full flex-col gap-2"
      >
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 16, right: 24, left: 16, bottom: 28 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              type="number"
              dataKey="x"
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => f(value)}
              {...AXIS_PROPS}
            >
              <Label
                value={`${yName} predicho (Ŷ)`}
                position="insideBottom"
                offset={-18}
                style={{ fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              tickFormatter={(value: number) => f(value)}
              {...AXIS_PROPS}
              width={48}
            >
              <Label value="Residuo e" angle={-90} position="insideLeft" style={{ fontSize: 12 }} />
            </YAxis>
            <Tooltip
              {...TOOLTIP_LINE_PROPS}
              formatter={(value, name) => [f(Number(value)), name === "x" ? "Ŷ" : "e"]}
            />
            <ReferenceLine y={0} stroke={LINE} strokeWidth={1.5} />
            <Scatter data={points} fill={RESIDUAL} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
