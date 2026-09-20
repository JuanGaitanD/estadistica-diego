/**
 * Formateo de números en español. Solo presentación: no redondea para cálculo,
 * solo para mostrar.
 */
import type { Metric } from "@/core/statistics";

export interface FormatNumberOptions {
  decimals?: number;
  locale?: string;
}

export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  const { decimals = 2, locale = "es-CO" } = options;
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export interface FormatPercentOptions {
  decimals?: number;
  locale?: string;
  /** Si el valor ya viene en escala 0-100 en lugar de 0-1. */
  alreadyScaled?: boolean;
}

export function formatPercent(value: number, options: FormatPercentOptions = {}): string {
  const { decimals = 1, locale = "es-CO", alreadyScaled = false } = options;
  if (!Number.isFinite(value)) return "—";
  const ratio = alreadyScaled ? value / 100 : value;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

/**
 * Texto de una celda de datos crudos para la vista previa y las tablas de
 * datos: los números se muestran con la convención española (coma decimal),
 * sin redondear, y los faltantes con una raya.
 *
 * @param value - Valor de la celda.
 */
export function formatCellValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 10 }).format(value);
  }
  return value;
}

/** Métricas que siempre se muestran como porcentaje, aunque su valor sea 0..100. */
const PERCENT_METRIC_KEYS: ReadonlySet<string> = new Set(["coeficiente-de-variacion"]);

/** `true` si la métrica se muestra con el sufijo de porcentaje. */
export function isPercentMetric(metric: Metric): boolean {
  return PERCENT_METRIC_KEYS.has(metric.key);
}

/**
 * Texto del valor de una métrica, con la regla única de decimales de la app:
 * los conteos enteros (`metric.integer`) van sin decimales; el resto usa los
 * decimales de presentación elegidos. Lo comparten la pantalla de resultados y
 * el PDF para que nunca se desincronicen.
 *
 * @param metric - Métrica ya calculada.
 * @param decimals - Decimales de presentación para valores no enteros.
 */
export function formatMetricValue(metric: Metric, decimals = 2): string | null {
  if (metric.value === null) return null;
  return formatNumber(metric.value, { decimals: metric.integer === true ? 0 : decimals });
}
