"use client";

import type { ReactNode } from "react";

import { formatNumber, formatPercent } from "@/components/shared/format";
import type { ContingencyResult } from "@/core/statistics";

import { ChartContainer } from "./chart-container";
import { heatTextClassName, sequentialColor } from "./palette";

export interface ContingencyHeatmapProps {
  /** Acciones mostradas en la cabecera de la gráfica (p. ej. descargar PNG). */
  actions?: ReactNode;
  data: ContingencyResult;
  title: string;
  description?: string;
  className?: string;
}

/**
 * Mapa de calor de una tabla de contingencia: color por celda según su
 * porcentaje sobre el total general (`totalPercent`), usando la paleta
 * secuencial de palette.ts.
 */
export function ContingencyHeatmap({
  data,
  title,
  description,
  className,
  actions,
}: ContingencyHeatmapProps) {
  const maxPercent = Math.max(1, ...data.cells.flat().map((cell) => cell.totalPercent));
  const containerId = `chart-${data.rowVariableId}-${data.columnVariableId}-heatmap`;

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
        aria-label={`Mapa de calor de contingencia entre ${data.rowVariableId} y ${data.columnVariableId}, total = ${data.grandTotal}`}
        className="flex h-full w-full flex-col gap-2 overflow-auto"
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-border border p-2 text-left" />
              {data.columnLabels.map((label) => (
                <th
                  key={label}
                  className="border-border text-muted-foreground border p-2 text-center font-medium"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rowLabels.map((rowLabel, rowIndex) => (
              <tr key={rowLabel}>
                <th className="border-border text-muted-foreground border p-2 text-left font-medium">
                  {rowLabel}
                </th>
                {data.columnLabels.map((_, colIndex) => {
                  const cell = data.cells[rowIndex]?.[colIndex];
                  if (!cell) return <td key={colIndex} className="border-border border p-2" />;
                  const t = cell.totalPercent / maxPercent;
                  return (
                    <td
                      key={colIndex}
                      className={`border-border border p-2 text-center ${heatTextClassName(t)}`}
                      style={{ backgroundColor: sequentialColor(t) }}
                    >
                      {formatNumber(cell.absolute, { decimals: 0 })}
                      <br />
                      <span className="text-xs">
                        {formatPercent(cell.totalPercent, { alreadyScaled: true })}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <table className="sr-only">
          <caption>
            Datos de contingencia entre {data.rowVariableId} y {data.columnVariableId}
          </caption>
          <thead>
            <tr>
              <th>Fila</th>
              <th>Columna</th>
              <th>Frecuencia absoluta</th>
              <th>Porcentaje del total</th>
            </tr>
          </thead>
          <tbody>
            {data.rowLabels.flatMap((rowLabel, rowIndex) =>
              data.columnLabels.map((colLabel, colIndex) => {
                const cell = data.cells[rowIndex]?.[colIndex];
                return (
                  <tr key={`${rowLabel}-${colLabel}`}>
                    <td>{rowLabel}</td>
                    <td>{colLabel}</td>
                    <td>{formatNumber(cell?.absolute ?? 0, { decimals: 0 })}</td>
                    <td>{formatPercent(cell?.totalPercent ?? 0, { alreadyScaled: true })}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
