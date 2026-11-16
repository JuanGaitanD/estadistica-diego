import type { ReactNode } from "react";

import { formatNumber } from "@/components/shared/format";
import type { BoxPlotSummary } from "@/core/statistics";

import { ChartContainer } from "./chart-container";
import { categoricalColorFor } from "./palette";

export interface BoxPlotProps {
  actions?: ReactNode;
  /** Identificador de la variable (id del contenedor y color). */
  variableId: string;
  summary: BoxPlotSummary;
  title: string;
  description?: string;
  decimals?: number;
  className?: string;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 32;
const AXIS_Y = 150;
const BOX_TOP = 50;
const BOX_BOTTOM = 110;

/** Marcas «redondas» del eje (1, 2 o 5 × 10^k), entre 4 y 8. */
export function niceTicks(min: number, max: number): number[] {
  if (min === max) return [min];
  const raw = (max - min) / 5;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => (max - min) / s <= 7) ?? raw;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) {
    ticks.push(Number(t.toPrecision(12)));
  }
  return ticks;
}

/**
 * Diagrama de caja y bigotes (Tukey), dibujado en SVG propio: la caja va de
 * Q1 a Q3 con la mediana marcada, los bigotes llegan al último dato que no es
 * atípico y los atípicos se dibujan como puntos sueltos. Escala con el ancho
 * (viewBox) y lleva su tabla accesible.
 */
export function BoxPlot({
  actions,
  variableId,
  summary,
  title,
  description,
  decimals = 2,
  className,
}: BoxPlotProps) {
  const ticks = niceTicks(summary.min, summary.max);
  const low = Math.min(summary.min, ticks[0] ?? summary.min);
  const high = Math.max(summary.max, ticks[ticks.length - 1] ?? summary.max);
  const span = high - low || 1;
  const x = (value: number): number => PAD_X + ((value - low) / span) * (WIDTH - 2 * PAD_X);
  const mid = (BOX_TOP + BOX_BOTTOM) / 2;
  const color = categoricalColorFor(variableId);
  const f = (value: number): string => formatNumber(value, { decimals });
  const rows: [string, number][] = [
    ["Mínimo", summary.min],
    ["Bigote inferior", summary.lowerWhisker],
    ["Q1", summary.q1],
    ["Mediana", summary.median],
    ["Q3", summary.q3],
    ["Bigote superior", summary.upperWhisker],
    ["Máximo", summary.max],
  ];

  return (
    <ChartContainer
      id={`chart-${variableId}-box`}
      title={title}
      {...(description !== undefined ? { description } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div className="flex h-full w-full flex-col gap-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Diagrama de caja: mediana ${f(summary.median)}, mitad central de ${f(summary.q1)} a ${f(summary.q3)}, ${summary.outliers.length} atípico(s)`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={x(tick)}
                x2={x(tick)}
                y1={20}
                y2={AXIS_Y}
                stroke="var(--cuadricula)"
                strokeWidth={1}
              />
              <text
                x={x(tick)}
                y={AXIS_Y + 22}
                textAnchor="middle"
                className="sl-tnum"
                fontSize={12}
                fill="var(--muted-foreground)"
              >
                {f(tick)}
              </text>
            </g>
          ))}
          <line x1={PAD_X} x2={WIDTH - PAD_X} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--separador)" />
          {/* Bigotes */}
          <g stroke="var(--foreground)" strokeWidth={1.5}>
            <line x1={x(summary.lowerWhisker)} x2={x(summary.q1)} y1={mid} y2={mid} />
            <line x1={x(summary.q3)} x2={x(summary.upperWhisker)} y1={mid} y2={mid} />
            <line
              x1={x(summary.lowerWhisker)}
              x2={x(summary.lowerWhisker)}
              y1={mid - 14}
              y2={mid + 14}
            />
            <line
              x1={x(summary.upperWhisker)}
              x2={x(summary.upperWhisker)}
              y1={mid - 14}
              y2={mid + 14}
            />
          </g>
          {/* Caja: la mitad central de los datos */}
          <rect
            x={x(summary.q1)}
            y={BOX_TOP}
            width={Math.max(1, x(summary.q3) - x(summary.q1))}
            height={BOX_BOTTOM - BOX_TOP}
            fill={color}
            fillOpacity={0.28}
            stroke={color}
            strokeWidth={2}
            rx={3}
          />
          <line
            x1={x(summary.median)}
            x2={x(summary.median)}
            y1={BOX_TOP}
            y2={BOX_BOTTOM}
            stroke="var(--foreground)"
            strokeWidth={3}
          />
          {summary.outliers.map((value, index) => (
            <circle
              key={`${value}-${index}`}
              cx={x(value)}
              cy={mid}
              r={5}
              fill="var(--card)"
              stroke="var(--destructive)"
              strokeWidth={2}
            />
          ))}
        </svg>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-5">
          {(
            [
              ["Bigote inferior", summary.lowerWhisker],
              ["Q1", summary.q1],
              ["Mediana", summary.median],
              ["Q3", summary.q3],
              ["Bigote superior", summary.upperWhisker],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2 sm:flex-col">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="sl-tnum">{f(value)}</dd>
            </div>
          ))}
        </dl>
        {summary.outliers.length > 0 ? (
          <p className="text-sm">
            <span className="font-semibold">Atípicos (puntos sueltos):</span>{" "}
            <span className="sl-tnum">{summary.outliers.map(f).join("; ")}</span>
          </p>
        ) : null}
        <table className="sr-only">
          <caption>Cinco números del diagrama de caja</caption>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{f(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
