"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ColumnAlign = "left" | "right" | "center";

export interface DataTableColumn<TRow> {
  key: string;
  label: string;
  align?: ColumnAlign;
  /** Formatea el valor crudo de la celda para mostrar. */
  format?: (row: TRow) => ReactNode;
}

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  /** Texto accesible que describe el contenido de la tabla. */
  caption?: string;
  /** Extrae el valor crudo de una celda (por defecto `row[column.key]`). */
  getCellValue?: (row: TRow, column: DataTableColumn<TRow>) => unknown;
  /** Clase CSS adicional para una celda concreta (p. ej. resaltar máximos/mínimos). */
  getCellClassName?: (
    row: TRow,
    column: DataTableColumn<TRow>,
    rowIndex: number,
  ) => string | undefined;
  onRowHover?: (rowIndex: number | null) => void;
  onColumnHover?: (columnKey: string | null) => void;
  /** Clave única de fila, por defecto el índice. */
  getRowKey?: (row: TRow, index: number) => string | number;
  className?: string;
}

const headAlignClass: Record<ColumnAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const alignClass: Record<ColumnAlign, string> = {
  left: "text-left",
  right: "sl-tnum text-right",
  center: "text-center",
};

/**
 * Tabla genérica y ligera (sin dependencias externas): cabecera pegajosa,
 * zebra sutil, columnas numéricas en la mono a la derecha, soporte de highlight
 * por celda y scroll horizontal operable con teclado (región con nombre) que
 * muestra un degradado de borde solo cuando hay más contenido a la derecha.
 */
export function DataTable<TRow>({
  columns,
  rows,
  caption,
  getCellValue,
  getCellClassName,
  onRowHover,
  onColumnHover,
  getRowKey,
  className,
}: DataTableProps<TRow>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const captionId = useId();
  const [hasMoreRight, setHasMoreRight] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) return;
    const update = (): void => {
      setHasMoreRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 2);
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    // Sin ResizeObserver (navegador muy viejo) el indicio de desplazamiento solo sigue al scroll.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    return () => {
      element.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [rows.length, columns.length]);

  const resolveValue = (row: TRow, column: DataTableColumn<TRow>): ReactNode => {
    if (column.format) return column.format(row);
    const raw = getCellValue
      ? getCellValue(row, column)
      : (row as Record<string, unknown>)[column.key];
    return raw == null ? "" : String(raw);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={scrollRef}
        role="region"
        tabIndex={0}
        {...(caption ? { "aria-labelledby": captionId } : {})}
        className="sl-table-scroll -m-1 w-[calc(100%+0.5rem)] overflow-x-auto p-1"
      >
        <table className="w-full border-collapse text-sm sm:text-base">
          {caption ? (
            <caption id={captionId} className="sr-only">
              {caption}
            </caption>
          ) : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  onMouseEnter={() => onColumnHover?.(column.key)}
                  onMouseLeave={() => onColumnHover?.(null)}
                  className={cn(
                    "bg-card sticky top-0 z-10 px-3 py-2.5 align-bottom text-sm font-semibold whitespace-nowrap",
                    "text-muted-foreground border-b-foreground border-b-2",
                    headAlignClass[column.align ?? "left"],
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}
                onMouseEnter={() => onRowHover?.(rowIndex)}
                onMouseLeave={() => onRowHover?.(null)}
                className={cn(
                  "transition-colors",
                  rowIndex % 2 === 1 && "bg-secondary/60",
                  "hover:bg-accent/50",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "sl-rule text-foreground border-b px-3 py-2.5",
                      alignClass[column.align ?? "left"],
                      getCellClassName?.(row, column, rowIndex),
                    )}
                  >
                    {resolveValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMoreRight ? (
        <div
          aria-hidden="true"
          className="from-card pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent"
        />
      ) : null}
    </div>
  );
}
