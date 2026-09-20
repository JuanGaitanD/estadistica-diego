"use client";

import { useId, useState } from "react";

import { formatNumber, formatPercent } from "@/components/shared/format";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

import type { AnalyzedContingency } from "../model/types";
import { contingencySectionId } from "../use-cases/sections";
import { explanationText } from "./metric-explanation";

/** Clase aplicada a la celda máxima de la fila o columna bajo el cursor. */
export const EXTREME_MAX_CLASS = "bg-primary/20 ring-primary ring-1 ring-inset";
/** Clase aplicada a la celda mínima de la fila o columna bajo el cursor. */
export const EXTREME_MIN_CLASS = "bg-accent/30 ring-accent-foreground/40 ring-1 ring-inset";

/** Qué se muestra en cada celda. */
export type ContingencyView = "conteo" | "fila" | "columna" | "total";

const VIEW_LABELS: Readonly<Record<ContingencyView, string>> = {
  conteo: "Conteos",
  fila: "% por fila",
  columna: "% por columna",
  total: "% del total",
};

export interface ContingencyTableProps {
  contingency: AnalyzedContingency;
  /** Decimales de presentación. Por defecto 2. */
  decimals?: number;
  /** Vista inicial; si se omite se deduce de la petición. */
  defaultView?: ContingencyView;
}

interface CrossRow {
  key: string;
  label: string;
  /** Índice en `cells`; `-1` en la fila de totales. */
  index: number;
  isTotal: boolean;
}

function viewFromRequest(
  percentages: AnalyzedContingency["request"]["percentages"],
): ContingencyView {
  return percentages === "ninguno" ? "conteo" : percentages;
}

/**
 * Tabla de doble entrada con totales marginales (RF-22). Al pasar el cursor por
 * una fila o una columna se resaltan su máximo y su mínimo con colores distintos,
 * explicados en la leyenda.
 */
export function ContingencyTable({
  contingency,
  decimals = 2,
  defaultView,
}: ContingencyTableProps) {
  const [view, setView] = useState<ContingencyView>(
    defaultView ?? viewFromRequest(contingency.request.percentages),
  );
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const descriptionId = useId();

  const table = contingency.table;
  const title = `Cruce: ${contingency.rowVariableName} y ${contingency.columnVariableName}`;

  if (table === null) {
    return (
      <div
        id={contingencySectionId(
          contingency.request.rowVariableId,
          contingency.request.columnVariableId,
        )}
      >
        <SectionCard title={title}>
          <p className="text-muted-foreground text-sm">
            {contingency.unavailableReason ?? "No se pudo calcular este cruce."}
          </p>
        </SectionCard>
      </div>
    );
  }

  const rows: CrossRow[] = [
    ...table.rowLabels.map((label, index) => ({
      key: `fila-${index}`,
      label,
      index,
      isTotal: false,
    })),
    { key: "total", label: "Total", index: -1, isTotal: true },
  ];

  const cellText = (rowIndex: number, columnIndex: number): string => {
    const cell = table.cells[rowIndex]?.[columnIndex];
    if (cell === undefined) return "";
    if (view === "conteo") return formatNumber(cell.absolute, { decimals: 0 });
    const percent =
      view === "fila"
        ? cell.rowPercent
        : view === "columna"
          ? cell.columnPercent
          : cell.totalPercent;
    return formatPercent(percent, { decimals, alreadyScaled: true });
  };

  const columns: DataTableColumn<CrossRow>[] = [
    {
      key: "label",
      label: `${contingency.rowVariableName} \\ ${contingency.columnVariableName}`,
      format: (row) => (
        <span className={row.isTotal ? "font-semibold" : undefined}>{row.label}</span>
      ),
    },
    ...table.columnLabels.map((label, columnIndex) => ({
      key: `col-${columnIndex}`,
      label,
      align: "right" as const,
      format: (row: CrossRow) =>
        row.isTotal
          ? formatNumber(table.columnTotals[columnIndex] ?? 0, { decimals: 0 })
          : cellText(row.index, columnIndex),
    })),
    {
      key: "total",
      label: "Total",
      align: "right",
      format: (row) =>
        row.isTotal
          ? formatNumber(table.grandTotal, { decimals: 0 })
          : formatNumber(table.rowTotals[row.index] ?? 0, { decimals: 0 }),
    },
  ];

  const columnIndexOf = (key: string): number =>
    key.startsWith("col-") ? Number.parseInt(key.slice(4), 10) : -1;

  const cellClassName = (row: CrossRow, column: DataTableColumn<CrossRow>): string | undefined => {
    const columnIndex = columnIndexOf(column.key);
    if (row.isTotal) return "bg-muted font-semibold";
    if (columnIndex < 0) return undefined;

    if (hoveredRow !== null) {
      const extremes = table.rowExtremes[hoveredRow];
      const hoveredIsThisRow = rows[hoveredRow]?.index === row.index;
      if (extremes && hoveredIsThisRow) {
        if (extremes.maxIndexes.includes(columnIndex)) return EXTREME_MAX_CLASS;
        if (extremes.minIndexes.includes(columnIndex)) return EXTREME_MIN_CLASS;
      }
    }
    if (hoveredColumn !== null) {
      const hoveredIndex = columnIndexOf(hoveredColumn);
      const extremes = table.columnExtremes[hoveredIndex];
      if (extremes && hoveredIndex === columnIndex) {
        if (extremes.maxIndexes.includes(row.index)) return EXTREME_MAX_CLASS;
        if (extremes.minIndexes.includes(row.index)) return EXTREME_MIN_CLASS;
      }
    }
    return undefined;
  };

  return (
    <div
      id={contingencySectionId(
        contingency.request.rowVariableId,
        contingency.request.columnVariableId,
      )}
    >
      <SectionCard
        title={title}
        description={`${table.grandTotal} caso(s) cruzados${
          table.excluded > 0 ? ` · ${table.excluded} excluido(s) por datos faltantes` : ""
        }`}
        actions={
          <div role="group" aria-label="Qué mostrar en cada celda" className="flex flex-wrap gap-1">
            {(Object.keys(VIEW_LABELS) as ContingencyView[]).map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={view === option ? "default" : "outline"}
                aria-pressed={view === option}
                onClick={() => setView(option)}
              >
                {VIEW_LABELS[option]}
              </Button>
            ))}
          </div>
        }
      >
        <div aria-describedby={descriptionId}>
          <DataTable
            columns={columns}
            rows={rows}
            caption={`${title}. ${explanationText(table.explanation)}`}
            getRowKey={(row) => row.key}
            getCellClassName={cellClassName}
            onRowHover={setHoveredRow}
            onColumnHover={setHoveredColumn}
          />
        </div>
        <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block size-3 rounded-sm ${EXTREME_MAX_CLASS}`}
              aria-hidden="true"
            />
            Máximo de la fila o columna señalada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block size-3 rounded-sm ${EXTREME_MIN_CLASS}`}
              aria-hidden="true"
            />
            Mínimo de la fila o columna señalada
          </span>
        </p>
        <p id={descriptionId} className="text-muted-foreground mt-2 text-sm">
          {explanationText(table.explanation)} Pasa el cursor por una fila o una columna para ver su
          valor más alto y su valor más bajo.
        </p>
      </SectionCard>
    </div>
  );
}
