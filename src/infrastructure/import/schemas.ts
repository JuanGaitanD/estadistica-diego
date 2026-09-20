import { z } from "zod";

/**
 * Esquema de validación de las opciones comunes de importación de archivo.
 * Vive en `infrastructure` (no en `core/data`) porque `core` debe permanecer
 * libre de dependencias externas como zod.
 */
export const importFileOptionsSchema = z.object({
  hasHeader: z.boolean(),
  sheetName: z.string().min(1).optional(),
  numberFormat: z.enum(["es", "en"]).optional(),
  missing: z
    .object({
      tokens: z.array(z.string()),
      caseSensitive: z.boolean().optional(),
    })
    .optional(),
});

export type ImportFileOptionsInput = z.infer<typeof importFileOptionsSchema>;
