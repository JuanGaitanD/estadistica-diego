import { z } from "zod";

/**
 * Secciones seleccionables del reporte, tal como las define
 * `docs/02-arquitectura.md` (interfaz `ExportSelection`, cerca de la línea 402).
 */
export const REPORT_SECTION_IDS = [
  "resumen",
  "frecuencias",
  "tendencia-central",
  "posicion",
  "variabilidad",
  "contingencia",
  "graficas",
] as const;

export type ReportSectionId = (typeof REPORT_SECTION_IDS)[number];

/**
 * Selección de exportación elegida por la persona usuaria en el diálogo de
 * exportación. Redefinida aquí (en vez de importada) porque, al momento de
 * escribir este módulo, `ExportSelection` solo existe documentada en
 * `docs/02-arquitectura.md` y no como tipo compartido en `src/core`.
 */
export interface ExportSelection {
  readonly format: "pdf" | "csv" | "xlsx" | "png" | "svg";
  readonly title?: string;
  readonly includeRawData: boolean;
  readonly includeExplanations: boolean;
  readonly variableIds: readonly string[];
  readonly sections: readonly ReportSectionId[];
  readonly chartIds: readonly string[];
}

// Nota: no se usa `satisfies z.ZodType<ExportSelection>` porque, con
// `exactOptionalPropertyTypes: true`, el `title` opcional de zod se infiere
// como `string | undefined` (la propiedad siempre presente en el tipo de
// salida) en lugar de una propiedad opcional (`title?: string`), lo cual
// rompe la comparación estructural aunque el esquema sea correcto en
// tiempo de ejecución. El esquema se mantiene sincronizado a mano con
// `ExportSelection`.
export const exportSelectionSchema = z.object({
  format: z.enum(["pdf", "csv", "xlsx", "png", "svg"]),
  title: z.string().optional(),
  includeRawData: z.boolean(),
  includeExplanations: z.boolean(),
  variableIds: z.array(z.string()),
  sections: z.array(z.enum(REPORT_SECTION_IDS)),
  chartIds: z.array(z.string()),
});
