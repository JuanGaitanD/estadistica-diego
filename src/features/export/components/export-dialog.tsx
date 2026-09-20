"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { exportReportPdf } from "@/infrastructure/export";
import type { AvailableSection } from "../use-cases/build-report-spec";
import { buildReportSpec } from "../use-cases/build-report-spec";
import { captureChartAsDataUrl } from "../use-cases/capture-chart-as-data-url";
import { REPORT_SECTION_IDS, type ReportSectionId } from "../model/export-selection";

const SECTION_LABELS: Record<ReportSectionId, string> = {
  resumen: "Resumen",
  frecuencias: "Frecuencias",
  "tendencia-central": "Tendencia central",
  posicion: "Posición",
  variabilidad: "Variabilidad",
  contingencia: "Contingencia",
  graficas: "Gráficas",
};

export interface ExportDialogProps {
  readonly reportTitle: string;
  readonly analysisName: string;
  readonly sampleSize: number;
  readonly availableSections: readonly AvailableSection[];
}

/**
 * Diálogo para elegir qué secciones incluir en el reporte PDF (RF-32):
 * selección por casillas, "Seleccionar todo"/"Seleccionar nada", switches de
 * gráficas/explicaciones y generación con estado de progreso.
 */
export function ExportDialog({
  reportTitle,
  analysisName,
  sampleSize,
  availableSections,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<ReportSectionId>>(new Set());
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableSectionIds = useMemo(() => {
    const ids = new Set<ReportSectionId>();
    for (const section of availableSections) {
      if (REPORT_SECTION_IDS.includes(section.id as ReportSectionId)) {
        ids.add(section.id as ReportSectionId);
      }
    }
    if (availableSections.some((s) => s.kind === "chart")) {
      ids.add("graficas");
    }
    return Array.from(ids);
  }, [availableSections]);

  const toggleSection = (id: ReportSectionId, checked: boolean): void => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = (): void => setSelectedSections(new Set(availableSectionIds));
  const selectNone = (): void => setSelectedSections(new Set());

  const hasSelection = selectedSections.size > 0;

  const handleGenerate = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const sections: ReportSectionId[] = REPORT_SECTION_IDS.filter((id) =>
        selectedSections.has(id),
      );
      const finalSections = includeCharts ? sections : sections.filter((s) => s !== "graficas");

      const spec = await buildReportSpec({
        title: "StatLab",
        analysisName,
        sampleSize,
        availableSections,
        selection: {
          format: "pdf",
          title: reportTitle,
          includeRawData: false,
          includeExplanations,
          variableIds: [],
          sections: finalSections,
          chartIds: [],
        },
        captureChart: captureChartAsDataUrl,
      });

      await exportReportPdf(spec, `${reportTitle}.pdf`);
      toast.success("PDF generado correctamente");
      setOpen(false);
    } catch {
      toast.error("No se pudo generar el PDF. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Exportar PDF…</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar reporte PDF</DialogTitle>
          <DialogDescription>
            Elige qué secciones incluir en el reporte. Puedes exportar todo el análisis o solo una
            parte.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAll}>
            Seleccionar todo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={selectNone}>
            Seleccionar nada
          </Button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Secciones</legend>
          {availableSectionIds.map((id) => (
            <div key={id} className="flex items-center gap-2">
              <Checkbox
                id={`export-section-${id}`}
                checked={selectedSections.has(id)}
                onCheckedChange={(checked) => toggleSection(id, checked === true)}
              />
              <Label htmlFor={`export-section-${id}`}>{SECTION_LABELS[id]}</Label>
            </div>
          ))}
        </fieldset>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="export-include-charts">Incluir gráficas</Label>
            <Switch
              id="export-include-charts"
              checked={includeCharts}
              onCheckedChange={setIncludeCharts}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="export-include-explanations">Incluir explicaciones</Label>
            <Switch
              id="export-include-explanations"
              checked={includeExplanations}
              onCheckedChange={setIncludeExplanations}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={!hasSelection || isGenerating}
            onClick={() => void handleGenerate()}
          >
            {isGenerating ? "Generando…" : "Generar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
