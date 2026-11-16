import { detectDecimals } from "../grouping/intervals";

/**
 * Formato de los números que van **dentro de frases** de interpretación y paso
 * a paso (ADR-004). Los valores de las métricas siguen sin redondear; solo el
 * texto redactado por el dominio lleva cifras ya formateadas, para que
 * pantalla, PDF y Excel digan exactamente lo mismo.
 */
const LOCALE = "es-CO";
const formatters = new Map<number, Intl.NumberFormat>();

/** Número con `decimals` decimales fijos, convención es-CO (`3,75`, `1.234,5`). */
export function formatValue(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  let formatter = formatters.get(decimals);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, formatter);
  }
  const text = formatter.format(value);
  // Evita «-0,00» cuando el valor redondeado es cero.
  return /^-0(,0*)?$/.test(text) ? text.slice(1) : text;
}

/** Conteo entero: `24`, `1.200`. */
export function formatCount(value: number): string {
  return formatValue(value, 0);
}

/** Proporción 0..1 como porcentaje con un decimal: `41,7 %`. */
export function formatShare(proportion: number): string {
  return `${formatValue(proportion * 100, 1)} %`;
}

/**
 * Decimales con los que se redactan las cifras de una variable: uno más que
 * los datos, entre 1 y 3. Edades enteras → `19,6`; notas con un decimal → `3,74`.
 */
export function narrativeDecimals(values: readonly number[]): number {
  return Math.min(3, Math.max(1, detectDecimals(values) + 1));
}
