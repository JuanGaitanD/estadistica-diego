"use client";

/** Paso 1: "¿Qué datos vamos a analizar?" (RF-01 a RF-09). */
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Info, UploadCloud } from "lucide-react";

import { StepHeader } from "@/components/layout/step-header";
import { formatCellValue } from "@/components/shared/format";
import { HelpHint } from "@/components/shared/help-hint";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { DecimalChoice } from "../model/types";
import { useWizardStore } from "../store/wizard-store";

type PreviewRow = Readonly<Record<string, string>>;

const PREVIEW_ROWS = 10;

export function StepData() {
  const dataset = useWizardStore((state) => state.dataset);
  const pastedText = useWizardStore((state) => state.pastedText);
  const importOptions = useWizardStore((state) => state.importOptions);
  const availableSheets = useWizardStore((state) => state.availableSheets);
  const importError = useWizardStore((state) => state.importError);
  const isImporting = useWizardStore((state) => state.isImporting);
  const sourceName = useWizardStore((state) => state.sourceName);
  const setPastedText = useWizardStore((state) => state.setPastedText);
  const importText = useWizardStore((state) => state.importText);
  const importSample = useWizardStore((state) => state.importSample);
  const importFromFile = useWizardStore((state) => state.importFromFile);
  const setImportOption = useWizardStore((state) => state.setImportOption);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null): void => {
    const file = files?.[0];
    if (file === undefined) return;
    void importFromFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const datasetWarnings = dataset?.warnings ?? [];
  const ambiguous = datasetWarnings.some((warning) => warning.code === "decimal-ambiguo");
  const missingTotal =
    dataset?.columns.reduce((total, column) => total + column.missingCount, 0) ?? 0;

  const previewColumns: DataTableColumn<PreviewRow>[] =
    dataset?.columns.map((column) => ({
      key: column.variable.id,
      label: column.variable.name,
      align: "left" as const,
    })) ?? [];

  const previewRows: PreviewRow[] = [];
  if (dataset !== null) {
    const limit = Math.min(PREVIEW_ROWS, dataset.rowCount);
    for (let row = 0; row < limit; row += 1) {
      const entry: Record<string, string> = {};
      for (const column of dataset.columns) {
        entry[column.variable.id] = formatCellValue(column.values[row]);
      }
      previewRows.push(entry);
    }
  }

  return (
    <div className="gap-block flex flex-col">
      <StepHeader
        eyebrow="Paso 1 · Datos"
        title="¿Qué datos vamos a analizar?"
        subtitle="Ingresa los datos o adjunta un csv/excel: nosotros nos encargamos del resto."
      />

      {importError !== null ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>No pudimos leer esos datos</AlertTitle>
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-stretch gap-4 sm:grid-cols-2">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`border-rule bg-muted/25 flex min-h-56 flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed p-6 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/[0.07]" : ""
          }`}
        >
          <span className="bg-secondary text-muted-foreground mb-1 flex size-12 items-center justify-center rounded-full">
            <UploadCloud className="size-5" aria-hidden="true" />
          </span>
          <p className="text-foreground text-[0.9375rem] font-semibold">Arrastra tu archivo aquí</p>
          <p className="text-muted-foreground text-sm">Aceptamos .csv, .xlsx y .xls</p>
          <Label htmlFor="archivo-datos" className="sr-only">
            Selecciona un archivo de datos
          </Label>
          <input
            ref={inputRef}
            id="archivo-datos"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            onChange={(event: ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => inputRef.current?.click()}
          >
            Seleccionar archivo
          </Button>
          {isImporting ? (
            <p className="text-muted-foreground text-sm">Leyendo el archivo…</p>
          ) : null}
        </div>

        <div className="flex min-h-56 flex-col gap-2.5">
          <Label htmlFor="datos-pegados" className="text-[0.9375rem] font-semibold">
            O pega tus datos aquí
          </Label>
          <Textarea
            id="datos-pegados"
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            rows={8}
            placeholder={"Nota,Genero\n4.5,Femenino\n3.8,Masculino"}
            className="max-h-72 min-h-36 flex-1 resize-y font-mono text-[0.8125rem] leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => importText()}>
              Usar estos datos
            </Button>
            <Button type="button" variant="outline" onClick={() => importSample()}>
              Usar datos de ejemplo
            </Button>
          </div>
        </div>
      </div>

      <SectionCard
        title="Cómo leer tus datos"
        description="Ajusta esto solo si la vista previa no se ve como esperabas."
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch
              id="primera-fila-encabezado"
              checked={importOptions.hasHeader}
              onCheckedChange={(checked) => setImportOption("hasHeader", checked)}
            />
            <Label htmlFor="primera-fila-encabezado" className="text-base">
              La primera fila son los nombres de las columnas
            </Label>
            <HelpHint label="Actívalo si la primera fila de tu archivo tiene los nombres de las columnas, no datos." />
          </div>

          {availableSheets.length > 1 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="hoja-excel">Hoja del archivo de Excel</Label>
              <Select
                value={importOptions.sheetName ?? availableSheets[0] ?? ""}
                onValueChange={(value) => setImportOption("sheetName", value)}
              >
                <SelectTrigger id="hoja-excel" className="w-full sm:w-72">
                  <SelectValue placeholder="Elige una hoja" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="formato-decimal">Formato de los decimales</Label>
            <Select
              value={importOptions.decimal}
              onValueChange={(value) => setImportOption("decimal", value as DecimalChoice)}
            >
              <SelectTrigger id="formato-decimal" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático</SelectItem>
                <SelectItem value="coma">Coma decimal (3,5)</SelectItem>
                <SelectItem value="punto">Punto decimal (3.5)</SelectItem>
              </SelectContent>
            </Select>
            {ambiguous ? (
              <p className="text-muted-foreground text-sm">
                No pudimos decidir con certeza si tus números usan coma o punto. Elige el formato
                correcto si la vista previa se ve mal.
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {dataset !== null ? (
        <SectionCard
          title="Vista previa"
          description={`Mostrando las primeras ${previewRows.length} fila(s).`}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{dataset.rowCount} fila(s)</Badge>
            <Badge variant="secondary">{dataset.columns.length} columna(s)</Badge>
            <Badge variant="secondary">{missingTotal} dato(s) faltante(s)</Badge>
            {sourceName !== null ? <Badge variant="secondary">{sourceName}</Badge> : null}
          </div>
          {datasetWarnings.length > 0 ? (
            <Alert className="mb-3">
              <Info className="size-4" aria-hidden="true" />
              <AlertTitle>Así leímos tus datos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5">
                  {datasetWarnings.map((warning, index) => (
                    <li key={`${warning.code}-${index}`}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
          <DataTable
            columns={previewColumns}
            rows={previewRows}
            caption="Vista previa de los datos importados"
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
