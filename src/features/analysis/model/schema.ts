/**
 * Validación con zod de la petición de análisis (RF-12: mensajes en español y sin
 * jerga técnica). `src/features` sí puede depender de zod; `src/core` no.
 */
import { z } from "zod";

import type { AnalysisRequest } from "./types";

const finiteNumber = z.number().refine(Number.isFinite, "Debe ser un número válido");

export const groupingOptionsSchema = z.object({
  enabled: z.boolean(),
  rule: z.enum(["sturges", "raiz", "rice", "scott", "freedman-diaconis", "manual"]),
  manualK: z.int().min(1, "El número de intervalos debe ser al menos 1").optional(),
  closure: z.enum(["cerrado-abierto", "abierto-cerrado"]),
});

export const frequencyOptionsSchema = z.object({
  relativeMode: z.enum(["proporcion", "porcentaje"]),
  showCumulative: z.boolean(),
  showClassMark: z.boolean(),
});

export const weightsSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("columna"), variableId: z.string().min(1) }),
  z.object({
    kind: z.literal("manual"),
    weights: z.array(finiteNumber).min(1, "Escribe al menos un peso"),
  }),
  z.object({ kind: z.literal("frecuencias") }),
]);

export const centralTendencyOptionsSchema = z.object({
  arithmetic: z.boolean(),
  weighted: z.boolean(),
  weightsSource: weightsSourceSchema.optional(),
  geometric: z.boolean(),
  harmonic: z.boolean(),
  median: z.boolean(),
  mode: z.boolean(),
});

export const positionOptionsSchema = z.object({
  quartiles: z.boolean(),
  quartileMethod: z.enum(["inclusivo", "exclusivo"]),
  includeQ2: z.boolean(),
  deciles: z.boolean(),
  percentiles: z.union([
    z.literal("todos"),
    z.array(
      z
        .number()
        .min(1, "Los percentiles van del 1 al 99")
        .max(99, "Los percentiles van del 1 al 99"),
    ),
  ]),
});

export const variabilityOptionsSchema = z.object({
  range: z.boolean(),
  sampleVariance: z.boolean(),
  populationVariance: z.boolean(),
  standardDeviation: z.boolean(),
  coefficientOfVariation: z.boolean(),
  iqr: z.boolean(),
  outliers: z.boolean(),
});

export const chartSpecSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["pie", "barras", "histograma", "poligono", "ojiva", "contingencia"]),
  title: z.string(),
  variableId: z.string().min(1, "Elige la variable de la gráfica"),
  secondVariableId: z.string().min(1).optional(),
  source: z.enum(["frecuencia", "frecuencia-acumulada", "contingencia"]),
  labels: z.object({
    showValue: z.boolean(),
    showPercent: z.boolean(),
    showCategory: z.boolean(),
  }),
  paletteKey: z.string().min(1),
  caption: z.string(),
});

export const variableAnalysisRequestSchema = z.object({
  variableId: z.string().min(1, "Elige una variable"),
  grouping: groupingOptionsSchema,
  frequency: frequencyOptionsSchema,
  central: centralTendencyOptionsSchema,
  position: positionOptionsSchema,
  variability: variabilityOptionsSchema,
});

export const contingencyRequestSchema = z
  .object({
    rowVariableId: z.string().min(1, "Elige la variable de las filas"),
    columnVariableId: z.string().min(1, "Elige la variable de las columnas"),
    percentages: z.enum(["ninguno", "fila", "columna", "total"]),
  })
  .refine((value) => value.rowVariableId !== value.columnVariableId, {
    message: "Para cruzar necesitas dos variables distintas",
    path: ["columnVariableId"],
  });

export const analysisRequestSchema = z.object({
  datasetId: z.string().min(1, "Falta indicar de qué datos parte el análisis"),
  missingPolicy: z.enum(["excluir-por-variable", "excluir-fila-completa"]),
  variables: z
    .array(variableAnalysisRequestSchema)
    .min(1, "Selecciona al menos una variable para analizar"),
  contingencies: z.array(contingencyRequestSchema),
  charts: z.array(chartSpecSchema),
});

/** Tipo inferido del esquema; equivalente estructural de `AnalysisRequest`. */
export type AnalysisRequestInput = z.infer<typeof analysisRequestSchema>;

/**
 * Valida una petición de análisis y la devuelve tipada. Lanza `z.ZodError` con
 * mensajes en español si no es válida.
 *
 * @param value - Valor sin confianza (formulario, localStorage rehidratado…).
 */
export function parseAnalysisRequest(value: unknown): AnalysisRequest {
  return analysisRequestSchema.parse(value) as AnalysisRequest;
}

/**
 * Variante que no lanza: devuelve la petición o la lista de mensajes de error
 * en español, lista para mostrar en la interfaz.
 *
 * @param value - Valor sin confianza.
 */
export function safeParseAnalysisRequest(
  value: unknown,
): { ok: true; request: AnalysisRequest } | { ok: false; errors: string[] } {
  const parsed = analysisRequestSchema.safeParse(value);
  if (parsed.success) return { ok: true, request: parsed.data as AnalysisRequest };
  return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) };
}
