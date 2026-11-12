/**
 * Utilidades de paleta para gráficas (docs/05-diseno.md #6).
 *
 * La asignación variable -> color debe ser determinista: la misma categoría
 * (misma clave de texto) siempre recibe el mismo color en todas las gráficas
 * de una sesión de resultados, sin depender del orden de renderizado.
 */

export const CATEGORICAL_CHART_COUNT = 8;

/** Devuelve el color categórico `var(--chart-n)` para un índice (0-based), cíclico. */
export function getCategoricalColor(index: number): string {
  const n =
    (((index % CATEGORICAL_CHART_COUNT) + CATEGORICAL_CHART_COUNT) % CATEGORICAL_CHART_COUNT) + 1;
  return `var(--chart-${n})`;
}

/**
 * Hash FNV-1a de 32 bits, estable entre ejecuciones y plataformas.
 */
function fnv1a(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Índice de color determinista (0..count-1) para una clave de categoría dada.
 * Misma clave => mismo índice siempre, sin importar el orden de aparición.
 */
export function colorIndexFor(key: string, count: number = CATEGORICAL_CHART_COUNT): number {
  if (count <= 0) return 0;
  return fnv1a(key) % count;
}

/** Color categórico determinista para una clave de categoría. */
export function categoricalColorFor(key: string): string {
  return getCategoricalColor(colorIndexFor(key));
}

const HEAT_STEPS = 5;

/**
 * Color secuencial (heatmap) para t en [0, 1]. Mapea a --heat-1..--heat-5.
 */
export function sequentialColor(t: number): string {
  return `var(--heat-${heatStep(t)})`;
}

/** Paso (1 a 5) de la escala secuencial al que cae `t`. */
function heatStep(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return Math.min(HEAT_STEPS, Math.max(1, Math.ceil(clamped * HEAT_STEPS) || 1));
}

/**
 * Texto legible recomendado sobre un paso de heatmap. Se elige por paso, no por
 * umbral: pasos 1 a 3 llevan el texto del tema (>= 5,5:1) y los pasos 4 y 5 el
 * color `--sobre-calor` (superficie en claro, fondo en oscuro; >= 5,3:1).
 */
export function heatTextClassName(t: number): string {
  return heatStep(t) >= 4 ? "text-[var(--sobre-calor)]" : "text-foreground";
}
