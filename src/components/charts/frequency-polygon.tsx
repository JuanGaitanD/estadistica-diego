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

import { ChartContainer } from "./chart-container";
import { categoricalColorFor } from "./palette";

export interface FrequencyPolygonProps {
  /** Acciones mostradas en la cabecera de la gráfica (p. ej. descargar PNG). */
  actions?: ReactNode;
  /** Tabla de frecuencias agrupada (con marca de clase). */
  data: FrequencyTableResult;
  title: string;
  description?: string;
  className?: string;
}

interface Point {
  readonly x: number;
  readonly absolute: number;
  readonly percent: number;
  readonly label: string;
}

/**
 * Polígono de frecuencias: une las marcas de clase (xi) con la frecuencia
 * absoluta, cerrando la figura con puntos de frecuencia cero antes de la
 * primera clase y después de la última (convención estándar).
 */
export function FrequencyPolygon({
  data,
  title,
  description,
  className,
  actions,
}: FrequencyPolygonProps) {
  const step = data.intervalLength ?? 1;
  // Los ejes usan los mismos decimales que las marcas de clase de la tabla.
  const decimals = Number.isInteger(step) ? 0 : 2;
  const points: Point[] = data.rows.flatMap((row) =>
    row.classMark === undefined
      ? []
      : [{ x: row.classMark, absolute: row.absolute, percent: row.relative, label: row.label }],
  );
  const firstMark = points[0]?.x ?? 0;
  const lastMark = points[points.length - 1]?.x ?? 0;
  const extended: Point[] = [
    { x: firstMark - step, absolute: 0, percent: 0, label: "Inicio (0)" },
    ...points,
    { x: lastMark + step, absolute: 0, percent: 0, label: "Fin (0)" },
  ];
  const containerId = `chart-${data.variableId}-polygon`;

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
        aria-label={`Polígono de frecuencias de ${data.variableId} sobre marcas de clase, n = ${data.n}`}
        className="flex h-full w-full flex-col gap-2"
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={extended as unknown as Record<string, unknown>[]}
            margin={{ top: 24, right: 24, left: 16, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="x"
              type="number"
              tickFormatter={(value: number) => formatNumber(value, { decimals })}
              tick={{ fontSize: 12 }}
              domain={["dataMin", "dataMax"]}
            >
              <Label
                value="Marca de clase (xi)"
                offset={-15}
                position="insideBottom"
                style={{ fontSize: 12 }}
              />
            </XAxis>
            <YAxis type="number" tick={{ fontSize: 12 }}>
              <Label
                value="Frecuencia absoluta (fi)"
                angle={-90}
                position="insideLeft"
                style={{ fontSize: 12 }}
              />
            </YAxis>
            <Tooltip
              formatter={(value, _name, item) => {
                const numeric = typeof value === "number" ? value : Number(value);
                const payload = item.payload as unknown as Point;
                return [
                  `${formatNumber(numeric, { decimals: 0 })} (${formatPercent(payload.percent)})`,
                  payload.label,
                ];
              }}
            />
            <Line
              type="linear"
              dataKey="absolute"
              name="Frecuencia absoluta"
              stroke={categoricalColorFor(data.variableId)}
              strokeWidth={2}
              dot={{ r: 4 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="absolute"
                position="top"
                valueAccessor={(entry) => {
                  const payload = entry.payload as Point;
                  return `${formatNumber(payload.absolute, { decimals: 0 })} (${formatPercent(payload.percent)})`;
                }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
        <table className="sr-only">
          <caption>Datos del polígono de frecuencias de {data.variableId}</caption>
          <thead>
            <tr>
              <th>Marca de clase</th>
              <th>Frecuencia absoluta</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {extended.map((point) => (
              <tr key={`${point.x}-${point.label}`}>
                <td>{formatNumber(point.x, { decimals: 2 })}</td>
                <td>{formatNumber(point.absolute, { decimals: 0 })}</td>
                <td>{formatPercent(point.percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
