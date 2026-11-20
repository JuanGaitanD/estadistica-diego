"use client";

import { ChevronDown, FolderOpen, Save } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReportStore } from "@/features/report";
import { downloadBlob } from "@/infrastructure/export";
import { projectToBlob, readProjectFile } from "@/infrastructure/storage";

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
    const result = await readProjectFile(file);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const hasWork =
      useWizardStore.getState().dataset !== null || useReportStore.getState().items.length > 0;
    if (
      hasWork &&
      !window.confirm(
        `Abrir «${file.name}» reemplaza los datos y el informe que tienes ahora. ¿Quieres seguir?`,
      )
    ) {
      return;
    }
    openProject(result.project.dataset, result.project.workspace);
    useReportStore.getState().replace(result.project.report);
    toast.success(`Abriste el proyecto ${file.name}.`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="text-foreground has-[>svg]:px-2.5 sm:has-[>svg]:px-4"
          >
            <FolderOpen aria-hidden="true" />
            <span className="hidden sm:inline">Proyecto</span>
            <span className="sr-only sm:hidden">Proyecto</span>
            <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <FolderOpen aria-hidden="true" />
            Abrir un proyecto…
          </DropdownMenuItem>
          <DropdownMenuItem disabled={dataset === null} onSelect={save}>
            <Save aria-hidden="true" />
            <span className="flex flex-col">
              Guardar en un archivo
              {dataset === null ? (
                <span className="text-muted-foreground text-xs">Primero carga tus datos.</span>
              ) : null}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void open(event)}
      />
    </>
  );
}
