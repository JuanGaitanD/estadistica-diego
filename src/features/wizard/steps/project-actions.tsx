"use client";

import { FolderOpen, Save } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useReportStore } from "@/features/report";
import { downloadBlob } from "@/infrastructure/export";
import { parseProjectText, projectToBlob } from "@/infrastructure/storage";

import type { WorkspaceSnapshot } from "../model/project";
import { useWizardStore } from "../store/wizard-store";

/**
 * Guardar y abrir el proyecto en un archivo `.statlab.json` (RF-45): datos,
 * tipos, cálculos elegidos e informe. Sirve para seguir otro día o en otro
 * equipo; el archivo queda en el equipo de la persona.
 */
export function ProjectActions() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dataset = useWizardStore((state) => state.dataset);
  const openProject = useWizardStore((state) => state.openProject);

  const save = (): void => {
    const wizard = useWizardStore.getState();
    const report = useReportStore.getState();
    if (wizard.dataset === null) return;
    const workspace: WorkspaceSnapshot = {
      columns: wizard.columns,
      calculation: wizard.calculation,
      calculationCustomized: wizard.calculationCustomized,
    };
    downloadBlob(
      projectToBlob({
        dataset: wizard.dataset,
        report: { title: report.title, includeSteps: report.includeSteps, items: report.items },
        workspace,
      }),
      `statlab_proyecto_${new Date().toISOString().slice(0, 10)}.statlab.json`,
    );
    toast.success("Guardaste el proyecto en un archivo.");
  };

  const open = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) return;
    const result = parseProjectText(await file.text());
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    openProject(result.project.dataset, result.project.workspace);
    useReportStore.getState().replace(result.project.report);
    toast.success(`Abriste el proyecto ${file.name}.`);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
      <span className="sl-label mr-1">Proyecto</span>
      <Button type="button" variant="ghost" size="sm" disabled={dataset === null} onClick={save}>
        <Save aria-hidden="true" />
        Guardar<span className="sr-only sm:not-sr-only"> en un archivo</span>
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
        <FolderOpen aria-hidden="true" />
        Abrir<span className="sr-only sm:not-sr-only"> un proyecto</span>
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void open(event)}
      />
    </div>
  );
}
