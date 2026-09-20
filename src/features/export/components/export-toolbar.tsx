"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  downloadBlob,
  exportAllChartsAsPng,
  exportDatasetToCsv,
  exportDatasetToXlsx,
} from "@/infrastructure/export";
import type { Dataset } from "@/core/data";
import type { AvailableSection } from "../use-cases/build-report-spec";
import { ExportDialog } from "./export-dialog";

export interface ExportToolbarProps {
  /**
   * Datos crudos del análisis. `undefined` mientras no hay dataset cargado: en
   * ese caso los botones de exportar datos quedan deshabilitados en vez de
   * fallar al pulsarlos.
   */
  readonly dataset: Dataset | undefined;
  readonly availableSections: readonly AvailableSection[];
  readonly chartElementIds: readonly string[];
  readonly reportTitle: string;
  readonly analysisName?: string;
  readonly sampleSize?: number;
}

/**
 * Barra de exportación de resultados: datos en CSV/XLSX, todas las gráficas
 * en PNG y el diálogo de exportación a PDF con selección de secciones.
 */
export function ExportToolbar({
  dataset,
  availableSections,
  chartElementIds,
  reportTitle,
  analysisName,
  sampleSize,
}: ExportToolbarProps) {
  const [isDownloadingCharts, setIsDownloadingCharts] = useState(false);
  const canExportData = dataset !== undefined && dataset.columns.length > 0;

  const handleExportCsv = (): void => {
    if (dataset === undefined) return;
    try {
      const blob = exportDatasetToCsv(dataset);
      downloadBlob(blob, `${reportTitle}.csv`);
      toast.success("Datos exportados en CSV");
    } catch {
      toast.error("No se pudo exportar el CSV.");
    }
  };

  const handleExportXlsx = (): void => {
    if (dataset === undefined) return;
    try {
      const blob = exportDatasetToXlsx(dataset);
      downloadBlob(blob, `${reportTitle}.xlsx`);
      toast.success("Datos exportados en Excel");
    } catch {
      toast.error("No se pudo exportar el Excel.");
    }
  };

  const handleDownloadAllCharts = async (): Promise<void> => {
    setIsDownloadingCharts(true);
    try {
      await exportAllChartsAsPng(chartElementIds, reportTitle);
      toast.success("Gráficas descargadas");
    } catch {
      toast.error("No se pudieron descargar todas las gráficas.");
    } finally {
      setIsDownloadingCharts(false);
    }
  };

  return (
    <div className="border-rule bg-muted/40 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border p-2.5">
      <span className="sl-label mr-1 ml-1.5 hidden sm:inline">Exportar</span>
      <ExportDialog
        reportTitle={reportTitle}
        analysisName={analysisName ?? reportTitle}
        sampleSize={sampleSize ?? 0}
        availableSections={availableSections}
      />
      <span className="bg-rule mx-1 hidden h-6 w-px sm:block" aria-hidden="true" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10"
        disabled={!canExportData}
        onClick={handleExportCsv}
      >
        Datos en CSV
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10"
        disabled={!canExportData}
        onClick={handleExportXlsx}
      >
        Datos en Excel
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10"
        disabled={isDownloadingCharts || chartElementIds.length === 0}
        onClick={() => void handleDownloadAllCharts()}
      >
        {isDownloadingCharts ? "Descargando…" : "Todas las gráficas"}
      </Button>
    </div>
  );
}
