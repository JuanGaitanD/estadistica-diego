import type { Dataset } from "@/core/data";

import { neutralizeFormula } from "./formula-safety";

/** Opciones de exportación a CSV. */
export interface ExportCsvOptions {
  /** Separador de campos; por defecto `,`. */
  readonly separator?: "," | ";";
  /** Si se antepone BOM UTF-8 (recomendado para Excel). Por defecto `true`. */
  readonly withBom?: boolean;
}

function escapeCell(value: string, separator: string): string {
  const safe = neutralizeFormula(value);
  const needsQuoting = safe.includes(separator) || safe.includes('"') || /[\n\r]/.test(safe);
  if (!needsQuoting) return safe;
  return `"${safe.replaceAll('"', '""')}"`;
}

function cellToText(value: string | number | null): string {
  if (value === null) return "";
  return String(value);
}

/**
 * Genera el texto CSV de un dataset, escapando comillas, comas y saltos de
 * línea según sea necesario.
 */
export function datasetToCsvText(dataset: Dataset, options: ExportCsvOptions = {}): string {
  const separator = options.separator ?? ",";
  const header = dataset.columns.map((c) => escapeCell(c.variable.name, separator));
  const lines = [header.join(separator)];

  for (let row = 0; row < dataset.rowCount; row += 1) {
    const cells = dataset.columns.map((column) =>
      escapeCell(cellToText(column.values[row] ?? null), separator),
    );
    lines.push(cells.join(separator));
  }

  return lines.join("\r\n");
}

/**
 * Exporta un dataset como `Blob` CSV en UTF-8, con BOM opcional (activado
 * por defecto) para que Excel detecte correctamente la codificación.
 */
export function exportDatasetToCsv(dataset: Dataset, options: ExportCsvOptions = {}): Blob {
  const withBom = options.withBom ?? true;
  const text = datasetToCsvText(dataset, options);
  const content = withBom ? `﻿${text}` : text;
  return new Blob([content], { type: "text/csv;charset=utf-8" });
}
