import type { ReactNode } from "react";

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

const alignClass: Record<ColumnAlign, string> = {
  left: "text-left",
  right: "text-right tabular-nums",
  center: "text-center",
};

/**
 * Tabla genérica y ligera (sin dependencias externas): cabecera pegajosa,
 * zebra sutil, scroll horizontal, alineación numérica y soporte de highlight
 * por celda (docs/05-diseno.md #5c, tabla de contingencia).
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
  const resolveValue = (row: TRow, column: DataTableColumn<TRow>): ReactNode => {
    if (column.format) return column.format(row);
    const raw = getCellValue
      ? getCellValue(row, column)
      : (row as Record<string, unknown>)[column.key];
    return raw == null ? "" : String(raw);
  };

  return (
    <div
      className={cn(
        "border-border max-h-[28rem] w-full overflow-auto rounded-lg border",
        className,
      )}
    >
      <table className="w-full min-w-max border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                onMouseEnter={() => onColumnHover?.(column.key)}
                onMouseLeave={() => onColumnHover?.(null)}
                className={cn(
                  "border-border bg-muted text-muted-foreground sticky top-0 z-10 border-b px-3 py-2 font-semibold",
                  alignClass[column.align ?? "left"],
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
              className={cn(rowIndex % 2 === 1 && "bg-muted/40")}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "border-border text-foreground border-b px-3 py-2",
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
  );
}
