"use client";

import { ArrowDown, ArrowUp, Copy, Download, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { InterpretationPanel, StepsDisclosure } from "@/components/shared/interpretation-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  copyText,
  downloadBlob,
  exportDatasetToXlsx,
  exportReportPdf,
} from "@/infrastructure/export";

import { useReportStore } from "../store/report-store";
import { reportToPdfSpec, reportToText, reportToXlsxTables } from "../use-cases/report-exports";

export interface ReportViewProps {
  /** Filas de los datos, para la portada del PDF. */
  readonly sampleSize: number;
  /** Qué hacer cuando el informe está vacío (ir a Explorar). */
  readonly onExplore?: () => void;
}

/** `statlab_informe_AAAA-MM-DD` (RF-34). */
function fileBase(): string {
  return `statlab_informe_${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Zona «Informe» (RF-43): lo que la persona fue añadiendo, en orden, con su
 * interpretación primero. Se titula, se anota, se reordena y se exporta junto.
 */
export function ReportView({ sampleSize, onExplore }: ReportViewProps) {
  const report = useReportStore();
  const titleId = useId();
  const stepsId = useId();
  const [exporting, setExporting] = useState<"pdf" | null>(null);

  const snapshot = { title: report.title, includeSteps: report.includeSteps, items: report.items };

  const exportPdf = async (): Promise<void> => {
    setExporting("pdf");
    try {
      await exportReportPdf(reportToPdfSpec(snapshot, { sampleSize }), `${fileBase()}.pdf`);
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setExporting(null);
    }
  };

  const exportXlsx = async (): Promise<void> => {
    try {
      downloadBlob(await exportDatasetToXlsx(reportToXlsxTables(snapshot)), `${fileBase()}.xlsx`);
    } catch {
      toast.error("No se pudo generar el Excel.");
    }
  };

  const copyAll = async (): Promise<void> => {
    try {
      await copyText(reportToText(snapshot));
      toast.success("Copiaste el informe como texto.");
    } catch {
      toast.error("No se pudo copiar el informe.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-foreground text-[2.125rem] leading-tight sm:text-[2.75rem]">
          Tu informe
        </h1>
        <p className="text-muted-foreground">
          Aquí se juntan los resultados que añadiste. Cada uno empieza por lo que significa; el
          detalle del cálculo solo sale si lo pides.
        </p>
      </header>

      {report.storageWarning ? (
        <p
          role="status"
          className="border-rule bg-muted/50 rounded-[var(--radius)] border p-4 text-sm"
        >
          {report.storageWarning}
        </p>
      ) : null}

      {report.items.length === 0 ? (
        <EmptyState
          title="Tu informe está vacío"
          description="En Explorar o Analizar, pulsa «Añadir al informe» en cualquier resultado y aparecerá aquí."
          {...(onExplore
            ? {
                action: (
                  <Button type="button" onClick={onExplore}>
                    Ir a Explorar
                  </Button>
                ),
              }
            : {})}
        />
      ) : (
        <>
          <div className="sl-surface flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor={titleId}>Título del informe</Label>
              <Input
                id={titleId}
                value={report.title}
                onChange={(event) => report.setTitle(event.target.value)}
              />
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id={stepsId}
                checked={report.includeSteps}
                onCheckedChange={(checked) => report.setIncludeSteps(checked === true)}
              />
              <Label htmlFor={stepsId} className="leading-snug">
                Incluir «cómo se calculó» en el PDF (fórmulas y tablas de trabajo)
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" loading={exporting === "pdf"} onClick={() => void exportPdf()}>
                <Download aria-hidden="true" />
                Descargar PDF
              </Button>
              <Button type="button" variant="outline" onClick={exportXlsx}>
                <Download aria-hidden="true" />
                Descargar Excel
              </Button>
              <Button type="button" variant="outline" onClick={() => void copyAll()}>
                <Copy aria-hidden="true" />
                Copiar como texto
              </Button>
            </div>
          </div>

          <ol className="flex flex-col gap-8">
            {report.items.map((item, index) => (
              <li key={item.id} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-foreground text-xl font-semibold">
                    {index + 1}. {item.title}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      aria-label={`Subir ${item.title}`}
                      onClick={() => report.move(item.id, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === report.items.length - 1}
                      aria-label={`Bajar ${item.title}`}
                      onClick={() => report.move(item.id, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Quitar ${item.title} del informe`}
                      onClick={() => report.remove(item.id)}
                    >
                      <Trash2 aria-hidden="true" />
                      Quitar
                    </Button>
                  </div>
                </div>
                <InterpretationPanel interpretation={item.interpretation} name={item.title} />
                {item.images.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {item.images.map((image) => (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL local, sin optimización posible
                      <img
                        key={image.title}
                        src={image.dataUrl}
                        alt={image.title}
                        className="border-rule w-full rounded-[var(--radius)] border"
                      />
                    ))}
                  </div>
                ) : null}
                {item.tables.length > 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Tablas incluidas: {item.tables.map((table) => table.title).join(" · ")}.
                  </p>
                ) : null}
                {item.steps.length > 0 ? <StepsDisclosure steps={item.steps} /> : null}
                <NoteField
                  value={item.note}
                  label={`Tu nota sobre ${item.title} (opcional)`}
                  onChange={(note) => report.setNote(item.id, note)}
                />
              </li>
            ))}
          </ol>

          <div className="border-rule border-t pt-6">
            <Button type="button" variant="ghost" onClick={() => report.clear()}>
              Vaciar el informe
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function NoteField({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={2}
        value={value}
        placeholder="Por ejemplo: qué decisión tomar con este resultado"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
