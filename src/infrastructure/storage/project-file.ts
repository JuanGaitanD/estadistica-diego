import "@/lib/zod-config";
import { z } from "zod";

import type { Dataset } from "@/core/data";

import { datasetSchema, reportSchema, type StoredReport } from "./schemas";

/** Versión del formato de archivo de proyecto `.statlab.json`. */
export const PROJECT_FILE_VERSION = 1;

const projectFileSchema = z.object({
  app: z.literal("statlab"),
  version: z.literal(PROJECT_FILE_VERSION),
  savedAt: z.string(),
  dataset: datasetSchema,
  report: reportSchema,
  /** Configuración del espacio de trabajo; la valida quien la usa. */
  workspace: z.unknown(),
});

/** Proyecto completo: datos, configuración e informe (RF-45). */
export interface ProjectFile {
  readonly savedAt: string;
  readonly dataset: Dataset;
  readonly report: StoredReport;
  readonly workspace: unknown;
}

/** El proyecto como archivo JSON descargable. */
export function projectToBlob(project: Omit<ProjectFile, "savedAt">): Blob {
  const payload = {
    app: "statlab",
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    ...project,
  };
  return new Blob([JSON.stringify(payload)], { type: "application/json" });
}

/**
 * Lee un archivo de proyecto. Nunca confía en su contenido: lo valida
 * entero y, si algo no cuadra, devuelve un mensaje en llano.
 */
export function parseProjectText(
  text: string,
):
  | { readonly ok: true; readonly project: ProjectFile }
  | { readonly ok: false; readonly message: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: "El archivo no es un proyecto de StatLab (no se pudo leer)." };
  }
  const parsed = projectFileSchema.safeParse(raw);
  if (!parsed.success) {
    const app = (raw as { app?: unknown } | null)?.app;
    return {
      ok: false,
      message:
        app === "statlab"
          ? "El proyecto está dañado o es de otra versión de StatLab."
          : "El archivo no es un proyecto de StatLab.",
    };
  }
  const { savedAt, dataset, report, workspace } = parsed.data;
  return {
    ok: true,
    project: {
      savedAt,
      dataset: dataset as Dataset,
      report: report as StoredReport,
      workspace,
    },
  };
}
