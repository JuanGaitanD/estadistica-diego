"use client";

import type { ReactNode } from "react";

import {
  CartesianGrid,
  Label,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber, formatPercent } from "@/components/shared/format";
import type { FrequencyTableResult } from "@/core/statistics";

import { AXIS_PROPS, GRID_PROPS, TOOLTIP_LINE_PROPS } from "./chart-theme";
import { ChartContainer } from "./chart-container";
import { categoricalColorFor } from "./palette";

export type OgiveMeasure = "absolute" | "percentage";

export interface OgiveProps {
  /** Acciones mostradas en la cabecera de la gráfica (p. ej. descargar PNG). */
  actions?: ReactNode;
  /** Tabla de frecuencias agrupada (con límites de clase). */
  data: FrequencyTableResult;
  title: string;
  description?: string;
  /** Frecuencia acumulada absoluta (Fi) o porcentual (Hi·100). */
  measure?: OgiveMeasure;
  className?: string;
}

interface Point {
  readonly x: number;
  readonly value: number;
  readonly label: string;
}

/**
 * Ojiva: curva de frecuencia acumulada sobre los límites superiores de clase,
 * arrancando en el límite inferior de la primera clase con valor 0.
 */
export function Ogive({
  data,
  title,
  description,
  measure = "absolute",
  className,
  actions,
}: OgiveProps) {
  // Los ejes usan los mismos decimales que los límites de clase de la tabla.
  const decimals = Number.isInteger(data.intervalLength ?? 1) ? 0 : 2;
  const rows = data.rows.filter((row) => row.upperBound !== undefined);
  const points: Point[] = rows.flatMap((row) =>
    row.upperBound === undefined
      ? []
      : [
          {
            x: row.upperBound,
            value: measure === "absolute" ? row.cumulativeAbsolute : row.cumulativeRelative * 100,
            label: row.label,
          },
        ],
  );
  const firstLower = rows[0]?.lowerBound ?? 0;
  const full: Point[] = [{ x: firstLower, value: 0, label: "Inicio (0)" }, ...points];
  const containerId = `chart-${data.variableId}-ogive`;
  const measureLabel =
    measure === "absolute" ? "Frecuencia acumulada (Fi)" : "Porcentaje acumulado (Hi %)";

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
        aria-label={`Ojiva de ${measureLabel.toLowerCase()} de ${data.variableId}, n = ${data.n}`}
        className="flex h-full w-full flex-col gap-2"
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={full as unknown as Record<string, unknown>[]}
            margin={{ top: 24, right: 24, left: 16, bottom: 24 }}
          >
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="x"
              type="number"
              tickFormatter={(value: number) => formatNumber(value, { decimals })}
              {...AXIS_PROPS}
              domain={["dataMin", "dataMax"]}
            >
              <Label
                value="Límite superior de clase"
                offset={-15}
                position="insideBottom"
                style={{ fontSize: 11 }}
              />
            </XAxis>
            <YAxis type="number" {...AXIS_PROPS} width={48}>
              <Label
                value={measureLabel}
                angle={-90}
                position="insideLeft"
                style={{ fontSize: 11 }}
              />
            </YAxis>
            <Tooltip
              {...TOOLTIP_LINE_PROPS}
              formatter={(value) => {
                const numeric = typeof value === "number" ? value : Number(value);
                return measure === "absolute"
                  ? formatNumber(numeric, { decimals: 0 })
                  : formatPercent(numeric, { alreadyScaled: true });
              }}
            />
            <Line
              type="linear"
              dataKey="value"
              name={measureLabel}
              stroke={categoricalColorFor(data.variableId)}
              strokeWidth={2.25}
              dot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)" }}
              activeDot={{ r: 5.5, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="value"
                position="top"
                valueAccessor={(entry) => {
                  const payload = entry.payload as Point;
                  return measure === "absolute"
                    ? formatNumber(payload.value, { decimals: 0 })
                    : formatPercent(payload.value, { alreadyScaled: true });
                }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
        <table className="sr-only">
          <caption>Datos de la ojiva de {data.variableId}</caption>
          <thead>
            <tr>
              <th>Límite superior</th>
              <th>{measureLabel}</th>
            </tr>
          </thead>
          <tbody>
            {full.map((point) => (
              <tr key={`${point.x}-${point.label}`}>
                <td>{formatNumber(point.x, { decimals: 2 })}</td>
                <td>
                  {measure === "absolute"
                    ? formatNumber(point.value, { decimals: 0 })
                    : formatPercent(point.value, { alreadyScaled: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
