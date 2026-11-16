import "@/lib/zod-config";
import { z } from "zod";

/** Versión vigente del esquema persistido en localStorage. */
export const SCHEMA_VERSION = 1;

const variableSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["nominal", "ordinal", "discreta", "continua"]),
  kindInferred: z.enum(["nominal", "ordinal", "discreta", "continua"]),
  kindConfirmedByUser: z.boolean(),
  categoryOrder: z.array(z.string()).optional(),
  unit: z.string().optional(),
  decimals: z.number().optional(),
});

const columnSchema = z.object({
  variable: variableSchema,
  values: z.array(z.union([z.string(), z.number(), z.null()])),
  missingCount: z.number(),
});

const datasetWarningSchema = z.object({
  code: z.enum(["faltantes", "tipo-mixto", "muchas-categorias", "tamano", "decimal-ambiguo"]),
  variableId: z.string().optional(),
  message: z.string(),
});

/** Esquema de validación de un `Dataset` persistido, nunca se confía en el valor crudo. */
export const datasetSchema = z.object({
  id: z.string(),
  source: z.enum(["texto", "csv", "xlsx"]),
  sourceName: z.string().optional(),
  columns: z.array(columnSchema),
  rowCount: z.number(),
  createdAt: z.string(),
  warnings: z.array(datasetWarningSchema),
});

const interpretationSchema = z.object({
  headline: z.string(),
  details: z.array(z.string()),
  caveats: z.array(z.string()),
});

const stepSchema = z.object({
  title: z.string(),
  text: z.string().optional(),
  formula: z.string().optional(),
  table: z
    .object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      footer: z.array(z.string()).optional(),
      omittedRows: z.number().optional(),
    })
    .optional(),
  excel: z.string().optional(),
});

const reportTableSchema = z.object({
  title: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

/** Imagen de una gráfica guardada en el informe (data URL PNG). */
const reportImageSchema = z.object({
  title: z.string(),
  dataUrl: z.string().startsWith("data:image/"),
});

/** Un resultado añadido al informe: copia fija de lo que se veía al añadirlo. */
export const reportItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  addedAt: z.string(),
  interpretation: interpretationSchema,
  steps: z.array(stepSchema),
  tables: z.array(reportTableSchema),
  images: z.array(reportImageSchema),
  note: z.string(),
});

/** Informe acumulativo (RF-43). */
export const reportSchema = z.object({
  title: z.string(),
  includeSteps: z.boolean(),
  items: z.array(reportItemSchema),
});

export type StoredReport = z.infer<typeof reportSchema>;
export type StoredReportItem = z.infer<typeof reportItemSchema>;

/** Preferencias de usuario persistidas localmente. */
export const preferencesSchema = z.object({
  missingPolicy: z
    .enum(["excluir-por-variable", "excluir-fila-completa"])
    .default("excluir-por-variable"),
  numberFormat: z.enum(["es", "en"]).optional(),
  theme: z.enum(["light", "dark", "system"]).default("system"),
});

export type StoredPreferences = z.infer<typeof preferencesSchema>;

/** Envoltorio versionado usado para todo lo persistido en localStorage. */
export function versionedEnvelopeSchema<T extends z.ZodTypeAny>(payloadSchema: T) {
  return z.object({
    schemaVersion: z.number(),
    payload: payloadSchema,
  });
}
