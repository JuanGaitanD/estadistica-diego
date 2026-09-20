import { quantile } from "../numeric/quantile";
import { sortAscending } from "../numeric/compare";
import { welford } from "../numeric/welford";
import { checkSample } from "../numeric/validate";
import type { ClassRule, GroupingOptions } from "../types";

/** Cota inferior y superior del número de clases K (ADR-003 §2.1). */
export const MIN_CLASSES = 2;
export const MAX_CLASSES = 50;

/** Máximo de decimales que se detectan en los datos. */
const MAX_DECIMALS = 10;

/** Una clase del agrupamiento en intervalos. */
export interface IntervalClass {
  readonly index: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  /** Marca de clase xi = (Li + Ls) / 2. */
  readonly classMark: number;
  /** "[1,5, 2,0)" en la convención elegida. */
  readonly label: string;
  readonly includesLower: boolean;
  readonly includesUpper: boolean;
}

/** Plan de agrupamiento: K, l y las clases resultantes. */
export interface GroupingPlan {
  /** Regla efectivamente aplicada (puede diferir de la pedida si hubo caída a Sturges). */
  readonly rule: ClassRule;
  readonly requestedRule: ClassRule;
  readonly k: number;
  /** Longitud de intervalo l. */
  readonly intervalLength: number;
  readonly decimals: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly range: number;
  readonly classes: readonly IntervalClass[];
  readonly warnings: readonly string[];
}

function decimalsOf(value: number): number {
  if (Number.isInteger(value)) return 0;
  const text = Math.abs(value).toString();
  const exponential = /e-(\d+)$/i.exec(text);
  if (exponential?.[1] !== undefined) {
    const mantissa = text.split(/e/i)[0] ?? "";
    const dot = mantissa.indexOf(".");
    const mantissaDecimals = dot < 0 ? 0 : mantissa.length - dot - 1;
    return Math.min(Number(exponential[1]) + mantissaDecimals, MAX_DECIMALS);
  }
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : Math.min(text.length - dot - 1, MAX_DECIMALS);
}

/**
 * Número de decimales detectado en los datos: el máximo de los decimales de
 * cada valor, acotado a 10.
 *
 * @param values - Valores finitos.
 */
export function detectDecimals(values: readonly number[]): number {
  let decimals = 0;
  for (const value of values) {
    const current = decimalsOf(value);
    if (current > decimals) decimals = current;
  }
  return decimals;
}

/**
 * Redondeo hacia arriba a un número fijo de decimales.
 *
 * Fórmula: `techo(x · 10^d) / 10^d`, con una tolerancia relativa que evita que
 * el ruido de coma flotante añada un decimal de más.
 *
 * @param value - Valor a redondear.
 * @param decimals - Decimales de destino.
 */
export function ceilToPrecision(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  return Math.ceil(scaled - 1e-9 * Math.max(1, Math.abs(scaled))) / factor;
}

function roundToPrecision(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clampK(k: number): number {
  if (!Number.isFinite(k)) return MIN_CLASSES;
  return Math.min(MAX_CLASSES, Math.max(MIN_CLASSES, Math.ceil(k)));
}

/** Resultado del cálculo del número de clases. */
export interface ClassCountResult {
  readonly k: number;
  readonly rule: ClassRule;
  readonly requestedRule: ClassRule;
  readonly warnings: readonly string[];
}

function sturgesK(n: number): number {
  return Math.ceil(1 + Math.log2(n));
}

/**
 * Número de clases K según la regla elegida (ADR-003 §2.1), acotado a [2, 50].
 *
 * Fórmulas: Sturges `K = techo(1 + log2 n)`; raíz `K = techo(raíz(n))`;
 * Rice `K = techo(2 · n^(1/3))`; Scott `h = 3,49 · s · n^(-1/3)` y `K = techo(R/h)`;
 * Freedman–Diaconis `h = 2 · RIC · n^(-1/3)` y `K = techo(R/h)`.
 * Si Scott o FD dan `h = 0` se cae a Sturges con aviso.
 *
 * @param values - Valores finitos de la variable.
 * @param rule - Regla pedida.
 * @param manualK - K fijado por el usuario, obligatorio con la regla `"manual"`.
 */
export function computeClassCount(
  values: readonly number[],
  rule: ClassRule,
  manualK?: number,
): ClassCountResult {
  const n = values.length;
  const warnings: string[] = [];
  if (n === 0) {
    return { k: MIN_CLASSES, rule: "sturges", requestedRule: rule, warnings: [] };
  }

  const sorted = sortAscending(values);
  const minimum = sorted[0] ?? 0;
  const maximum = sorted[n - 1] ?? 0;
  const range = maximum - minimum;

  const fallback = (message: string): ClassCountResult => {
    warnings.push(message);
    return { k: clampK(sturgesK(n)), rule: "sturges", requestedRule: rule, warnings };
  };

  const finish = (k: number, appliedRule: ClassRule): ClassCountResult => {
    const clamped = clampK(k);
    if (clamped !== Math.ceil(k) && Number.isFinite(k)) {
      warnings.push(
        `El número de clases se ajustó a ${clamped} para mantenerlo entre ${MIN_CLASSES} y ${MAX_CLASSES}.`,
      );
    }
    return { k: clamped, rule: appliedRule, requestedRule: rule, warnings };
  };

  switch (rule) {
    case "manual": {
      if (manualK === undefined || !Number.isFinite(manualK) || manualK < 1) {
        return fallback("No se indicó un número de clases válido; se usó la regla de Sturges.");
      }
      return finish(manualK, "manual");
    }
    case "raiz":
      return finish(Math.sqrt(n), "raiz");
    case "rice":
      return finish(2 * Math.cbrt(n), "rice");
    case "scott": {
      const accumulator = welford(values);
      const variance = accumulator !== null && n > 1 ? accumulator.m2 / (n - 1) : 0;
      const h = 3.49 * Math.sqrt(variance) * n ** (-1 / 3);
      if (h <= 0 || range === 0) {
        return fallback("La regla de Scott no es aplicable (dispersión nula); se usó Sturges.");
      }
      return finish(range / h, "scott");
    }
    case "freedman-diaconis": {
      const q1 = quantile(sorted, 0.25);
      const q3 = quantile(sorted, 0.75);
      const iqr = q1 !== null && q3 !== null ? q3 - q1 : 0;
      const h = 2 * iqr * n ** (-1 / 3);
      if (h <= 0 || range === 0) {
        return fallback(
          "La regla de Freedman–Diaconis no es aplicable (RIC nulo); se usó Sturges.",
        );
      }
      return finish(range / h, "freedman-diaconis");
    }
    case "sturges":
    default:
      return finish(sturgesK(n), "sturges");
  }
}

/**
 * Longitud de intervalo l.
 *
 * Fórmula: `l = redondeoArriba(R / K, d)`, con `d` los decimales de los datos.
 * Se redondea hacia arriba para garantizar `K · l >= R`. Si el resultado fuera
 * cero se usa la unidad mínima de la precisión (`10^-d`).
 *
 * @param range - Rango R = máximo − mínimo.
 * @param k - Número de clases.
 * @param decimals - Decimales detectados en los datos.
 */
export function computeIntervalLength(range: number, k: number, decimals: number): number {
  if (k <= 0) return 0;
  const rounded = ceilToPrecision(range / k, decimals);
  if (rounded > 0) return rounded;
  return 10 ** -decimals;
}

function formatBound(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

/**
 * Construye las clases del agrupamiento en intervalos (ADR-003 §2).
 *
 * Límite inferior de la primera clase: el mínimo observado.
 * `Li(i+1) = Ls(i)`, `Ls(i) = Li(i) + l`, marca de clase `xi = (Li + Ls)/2`.
 * Con la convención `cerrado-abierto` las clases son `[Li, Ls)` y la última
 * `[Li, Ls]`; con `abierto-cerrado` son `(Li, Ls]` y la primera `[Li, Ls]`.
 *
 * @param values - Valores finitos de la variable.
 * @param options - Opciones de agrupamiento (regla, K manual y convención de cierre).
 * @returns El plan de agrupamiento, o `null` si no hay datos válidos.
 */
export function buildIntervals(
  values: readonly number[],
  options: GroupingOptions,
): GroupingPlan | null {
  const check = checkSample(values, 1);
  if (!check.ok) return null;

  const sorted = sortAscending(values);
  const n = sorted.length;
  const minimum = sorted[0] ?? 0;
  const maximum = sorted[n - 1] ?? 0;
  const range = maximum - minimum;
  const decimals = detectDecimals(values);
  const closedLower = options.closure === "cerrado-abierto";

  if (range === 0) {
    const label = `[${formatBound(minimum, decimals)}, ${formatBound(maximum, decimals)}]`;
    return {
      rule: options.rule,
      requestedRule: options.rule,
      k: 1,
      intervalLength: 0,
      decimals,
      minimum,
      maximum,
      range,
      classes: [
        {
          index: 0,
          lowerBound: minimum,
          upperBound: maximum,
          classMark: minimum,
          label,
          includesLower: true,
          includesUpper: true,
        },
      ],
      warnings: ["Todos los valores son iguales: se generó una única clase."],
    };
  }

  const count = computeClassCount(values, options.rule, options.manualK);
  const intervalLength = computeIntervalLength(range, count.k, decimals);
  const classes: IntervalClass[] = [];
  for (let index = 0; index < count.k; index += 1) {
    const lowerBound = roundToPrecision(minimum + index * intervalLength, decimals + 2);
    const upperBound = roundToPrecision(minimum + (index + 1) * intervalLength, decimals + 2);
    const last = index === count.k - 1;
    const first = index === 0;
    const includesLower = closedLower || first;
    const includesUpper = !closedLower || last;
    const open = includesLower ? "[" : "(";
    const close = includesUpper ? "]" : ")";
    classes.push({
      index,
      lowerBound,
      upperBound,
      classMark: (lowerBound + upperBound) / 2,
      label: `${open}${formatBound(lowerBound, decimals)}, ${formatBound(upperBound, decimals)}${close}`,
      includesLower,
      includesUpper,
    });
  }

  return {
    rule: count.rule,
    requestedRule: options.rule,
    k: count.k,
    intervalLength,
    decimals,
    minimum,
    maximum,
    range,
    classes,
    warnings: count.warnings,
  };
}

/**
 * Índice de la clase a la que pertenece un valor, según la convención de cierre.
 *
 * @param classes - Clases del plan de agrupamiento.
 * @param value - Valor a clasificar.
 * @returns El índice de la clase, o `-1` si el valor queda fuera de todas.
 */
export function classIndexOf(classes: readonly IntervalClass[], value: number): number {
  for (const item of classes) {
    const aboveLower = item.includesLower ? value >= item.lowerBound : value > item.lowerBound;
    const belowUpper = item.includesUpper ? value <= item.upperBound : value < item.upperBound;
    if (aboveLower && belowUpper) return item.index;
  }
  return -1;
}
