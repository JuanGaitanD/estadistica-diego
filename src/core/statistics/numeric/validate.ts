/** Motivos de indisponibilidad reutilizados por todo el dominio (en español). */
export const REASONS = {
  sinDatos: "No quedan datos válidos en esta variable",
  noNumerico: "Los datos contienen valores no numéricos (NaN o infinito)",
  minimoDos: "Se necesitan al menos 2 datos",
  soloPositivos: "Solo está definida cuando todos los valores son mayores que cero",
  pesosInvalidos: "Los pesos deben ser mayores o iguales a cero",
  pesosSumaCero: "La suma de los pesos debe ser mayor que cero",
  pesosLongitud: "Debe haber un peso por cada dato",
  mediaCero: "No es interpretable cuando la media es cero o casi cero",
  signosMixtos: "No es interpretable cuando la variable tiene valores de ambos signos",
  fueraDeRango: "El método exclusivo no define este cuantil para el tamaño de la muestra",
  proporcionInvalida: "La proporción debe estar entre 0 y 1",
} as const;

/**
 * Indica si un valor es un número finito utilizable en un cálculo.
 *
 * @param value - Valor a comprobar.
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Resultado de validar una muestra numérica. */
export type SampleCheck = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Valida que la muestra tenga el tamaño mínimo pedido y solo números finitos.
 * Un `NaN` o un infinito en la entrada se rechaza; nunca se propaga al resultado.
 *
 * @param values - Muestra a validar.
 * @param minimum - Tamaño mínimo exigido (por defecto 1).
 */
export function checkSample(values: readonly number[], minimum = 1): SampleCheck {
  if (values.some((value) => !isFiniteNumber(value))) {
    return { ok: false, reason: REASONS.noNumerico };
  }
  if (values.length === 0) return { ok: false, reason: REASONS.sinDatos };
  if (values.length < minimum) return { ok: false, reason: REASONS.minimoDos };
  return { ok: true };
}

/**
 * Convierte un número en un valor seguro para la salida: `null` si no es finito.
 *
 * @param value - Número calculado.
 */
export function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}
