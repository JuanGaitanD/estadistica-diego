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
