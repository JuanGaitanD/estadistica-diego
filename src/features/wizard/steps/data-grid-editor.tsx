"use client";

import { Plus, X } from "lucide-react";
import { useState, type ClipboardEvent } from "react";

import { Button } from "@/components/ui/button";

import {
  addColumn,
  addRow,
  emptyGrid,
  GRID_MAX_ROWS,
  gridFromDataset,
  gridToTsv,
  pasteBlock,
  removeColumn,
  removeRow,
  setCell,
  setHeader,
  type Grid,
} from "../model/grid";
import { useWizardStore } from "../store/wizard-store";

/**
 * Hoja editable (RF-45): escribir datos desde cero o corregir los cargados.
 * Es una tabla de campos nativos (Tab avanza por celdas) y acepta pegar un
 * bloque copiado de Excel en cualquier celda.
 */
export function DataGridEditor({ onDone }: { onDone: () => void }) {
  const dataset = useWizardStore((state) => state.dataset);
  const importGrid = useWizardStore((state) => state.importGridText);
  const [grid, setGrid] = useState<Grid>(() =>
    dataset === null ? emptyGrid() : gridFromDataset(dataset),
  );
  const truncated = dataset !== null && dataset.rowCount > GRID_MAX_ROWS;

  const onPaste = (event: ClipboardEvent<HTMLInputElement>, row: number, column: number) => {
    const text = event.clipboardData.getData("text/plain");
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();
    setGrid((current) => pasteBlock(current, row, column, text));
  };

  return (
    <div className="flex flex-col gap-4">
      {truncated ? (
        <p role="status" className="text-muted-foreground text-sm">
          Tus datos tienen {dataset.rowCount} filas: aquí se editan las primeras {GRID_MAX_ROWS}.
          Para el resto, corrige el archivo y vuelve a cargarlo.
        </p>
      ) : null}
      <div className="border-rule max-h-[28rem] overflow-auto rounded-[var(--radius)] border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Hoja de datos editable. La primera fila son los nombres de las columnas.
          </caption>
          <thead className="bg-secondary sticky top-0 z-10">
            <tr>
              <th scope="col" className="w-10 px-2 py-1 text-right">
                <span className="sr-only">Fila</span>
              </th>
              {grid.headers.map((header, column) => (
                <th key={column} scope="col" className="min-w-36 p-1">
                  <div className="flex items-center gap-1">
                    <input
                      value={header}
                      aria-label={`Nombre de la columna ${column + 1}`}
                      onChange={(event) => setGrid(setHeader(grid, column, event.target.value))}
                      className="border-input bg-card w-full rounded-md border px-2 py-1.5 font-semibold"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={grid.headers.length <= 1}
                      aria-label={`Quitar la columna ${header || column + 1}`}
                      onClick={() => setGrid(removeColumn(grid, column))}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-rule border-t">
                <th
                  scope="row"
                  className="text-muted-foreground sl-number px-2 text-right font-normal"
                >
                  {rowIndex + 1}
                </th>
                {row.map((cell, column) => (
                  <td key={column} className="p-1">
                    <input
                      value={cell}
                      aria-label={`Fila ${rowIndex + 1}, ${grid.headers[column] || `columna ${column + 1}`}`}
                      onChange={(event) =>
                        setGrid(setCell(grid, rowIndex, column, event.target.value))
                      }
                      onPaste={(event) => onPaste(event, rowIndex, column)}
                      className="border-input bg-card sl-number w-full rounded-md border px-2 py-1.5"
                    />
                  </td>
                ))}
                <td className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Quitar la fila ${rowIndex + 1}`}
                    onClick={() => setGrid(removeRow(grid, rowIndex))}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-sm">
        Puedes pegar un bloque copiado de Excel en cualquier celda. Usa coma para los decimales
        (3,5) y deja vacía la celda que no tenga dato.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setGrid(addRow(grid))}>
          <Plus aria-hidden="true" />
          Añadir fila
        </Button>
        <Button type="button" variant="outline" onClick={() => setGrid(addColumn(grid))}>
          <Plus aria-hidden="true" />
          Añadir columna
        </Button>
        <Button
          type="button"
          className="sm:ml-auto"
          onClick={() => {
            if (importGrid(gridToTsv(grid))) onDone();
          }}
        >
          Usar los datos de la tabla
        </Button>
      </div>
    </div>
  );
}
