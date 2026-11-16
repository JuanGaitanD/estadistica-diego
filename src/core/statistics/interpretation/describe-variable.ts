import { detectDecimals } from "../grouping/intervals";
import { quantile } from "../numeric/quantile";
import { neumaierSum } from "../numeric/sum";
import { welford } from "../numeric/welford";
import type { CalculationStep, Interpretation, ModeResult, StepTable } from "../types";
import { TUKEY_FACTOR } from "../variability/variability";
import { formatCount, formatShare, formatValue, narrativeDecimals } from "./text";

/** Por debajo de este n se advierte que los resúmenes son inestables. */
export const SMALL_SAMPLE = 10;
/** Máximo de filas de una tabla de trabajo antes de recortarla. */
export const STEP_TABLE_MAX_ROWS = 30;
/** Diferencia (media − mediana) / desviación a partir de la cual se habla de sesgo. */
const SKEW_THRESHOLD = 0.1;
/** Máximo de datos listados en el paso «ordenar». */
const LISTED_VALUES = 60;

function quote(label: string): string {
  return `«${label}»`;
}

/**
 * Interpretación en llano de una variable numérica, a partir de sus valores
 * válidos **ordenados**. No depende de qué casillas marcó la persona: siempre
 * se calcula.
 *
 * Reglas (umbrales declarados para que se puedan discutir):
 * - Centro: media y mediana. Si difieren en más de 0,1 desviaciones se dice
 *   hacia dónde jalan los valores extremos y que la mediana representa mejor.
 * - Dispersión: coeficiente de variación < 15 % poca, 15–30 % moderada, > 30 % mucha
 *   (solo si todos los valores tienen el mismo signo y la media no es 0).
 * - Mitad central: Q1 a Q3 (R-7). Atípicos: regla de Tukey 1,5·RIC.
 */
export function interpretQuantitative(sorted: readonly number[]): Interpretation {
  const n = sorted.length;
  if (n === 0) {
    return {
      headline: "No quedan datos válidos para describir esta variable.",
      details: [],
      caveats: [],
    };
  }
  const d = narrativeDecimals(sorted);
  const f = (value: number): string => formatValue(value, d);
  const min = sorted[0] ?? 0;
  const max = sorted[n - 1] ?? 0;

  if (min === max) {
    return {
      headline: `Todos los datos valen ${f(min)}: no hay variación que describir.`,
      details: [],
      caveats: n < SMALL_SAMPLE ? [`Solo hay ${formatCount(n)} dato(s).`] : [],
    };
  }

  const stats = welford(sorted);
  const mean = stats?.mean ?? min;
  const sd = Math.sqrt((stats?.m2 ?? 0) / (n - 1));
  const median = quantile(sorted, 0.5) ?? mean;
  const q1 = quantile(sorted, 0.25) ?? min;
  const q3 = quantile(sorted, 0.75) ?? max;
  const details: string[] = [];
  const caveats: string[] = [];

  const shift = sd > 0 ? (mean - median) / sd : 0;
  let headline: string;
  if (Math.abs(shift) <= SKEW_THRESHOLD) {
    headline =
      `El valor típico es ${f(mean)} (el promedio) y la mitad de los datos queda por debajo de ${f(median)}. ` +
      "Como promedio y mediana casi coinciden, los datos se reparten de forma pareja alrededor del centro.";
  } else {
    const direction =
      shift > 0
        ? "algunos valores altos lo jalan hacia arriba"
        : "algunos valores bajos lo jalan hacia abajo";
    headline =
      `El valor típico es ${f(median)} (la mediana: la mitad de los datos queda por debajo). ` +
      `El promedio es ${f(mean)} porque ${direction}; aquí la mediana representa mejor al dato típico.`;
  }

  details.push(
    `La mitad central de los datos está entre ${f(q1)} y ${f(q3)}; el más bajo es ${f(min)} y el más alto ${f(max)}.`,
  );

  const sameSign = min >= 0 || max <= 0;
  if (sameSign && Math.abs(mean) > 1e-12) {
    const cv = (100 * sd) / Math.abs(mean);
    const level =
      cv < 15
        ? "poca variación: los datos se parecen entre sí"
        : cv <= 30
          ? "una variación moderada"
          : "mucha variación: los datos son bastante distintos entre sí";
    details.push(
      `En promedio, cada dato se aleja ${f(sd)} del promedio (desviación estándar), el ${formatValue(cv, 1)} % del promedio: hay ${level}.`,
    );
  } else {
    details.push(`En promedio, cada dato se aleja ${f(sd)} del promedio (desviación estándar).`);
  }

  const iqr = q3 - q1;
  const lower = q1 - TUKEY_FACTOR * iqr;
  const upper = q3 + TUKEY_FACTOR * iqr;
  const outliers = sorted.filter((value) => value < lower || value > upper);
  if (outliers.length === 0) {
    details.push("No hay valores atípicos: ningún dato se sale mucho de lo común.");
  } else {
    const shown = outliers.slice(0, 5).map(f).join("; ");
    const more = outliers.length > 5 ? ` y ${formatCount(outliers.length - 5)} más` : "";
    details.push(
      `Hay ${formatCount(outliers.length)} valor(es) atípico(s) (${shown}${more}): revisa si son errores de captura o casos especiales, porque pueden distorsionar el promedio.`,
    );
  }

  if (n < SMALL_SAMPLE) {
    caveats.push(
      `Con solo ${formatCount(n)} datos estos resúmenes pueden cambiar bastante al agregar más.`,
    );
  }
  return { headline, details, caveats };
}

/** Recuento de una categoría para la interpretación de variables cualitativas. */
export interface CategoryCount {
  readonly label: string;
  readonly count: number;
}

/**
 * Interpretación en llano de una variable cualitativa.
 *
 * @param counts - Recuento por categoría (en cualquier orden).
 * @param mode - Resultado de la moda ya calculado.
 * @param ordinalMedian - Categoría mediana si la variable es ordinal.
 */
export function interpretCategorical(
  counts: readonly CategoryCount[],
  mode: ModeResult,
  ordinalMedian?: string | null,
): Interpretation {
  const n = counts.reduce((total, entry) => total + entry.count, 0);
  if (n === 0) {
    return {
      headline: "No quedan datos válidos para describir esta variable.",
      details: [],
      caveats: [],
    };
  }
  const details: string[] = [];
  const caveats: string[] = [];
  const share = (count: number): string => formatShare(count / n);

  let headline: string;
  if (counts.length === 1) {
    headline = `Todos los casos son ${quote(counts[0]?.label ?? "")}: no hay variación que describir.`;
  } else if (mode.kind === "amodal") {
    const each = counts[0]?.count ?? 0;
    headline = `Las ${formatCount(counts.length)} categorías aparecen la misma cantidad de veces (${formatCount(each)} cada una): ninguna destaca.`;
  } else if (mode.values.length === 1) {
    const top = mode.values[0];
    const count = top?.count ?? 0;
    headline = `Lo más común es ${quote(String(top?.value))}: ${formatCount(count)} de ${formatCount(n)} casos (${share(count)}).`;
    if (count / n > 0.5) headline += " Es más de la mitad.";
  } else {
    const labels = mode.values.map((entry) => quote(String(entry.value)));
    const last = labels.pop() ?? "";
    const count = mode.values[0]?.count ?? 0;
    headline = `Empatan como lo más común ${labels.join(", ")} y ${last}, con ${formatCount(count)} casos cada una (${share(count)}).`;
  }

  if (mode.kind !== "amodal" && counts.length > 1) {
    const least = counts.reduce((a, b) => (b.count < a.count ? b : a));
    details.push(
      `Hay ${formatCount(counts.length)} categorías distintas; la menos frecuente es ${quote(least.label)} (${formatCount(least.count)}, ${share(least.count)}).`,
    );
  }
  if (ordinalMedian !== undefined && ordinalMedian !== null) {
    details.push(
      `Siguiendo el orden de las categorías, la mitad de los casos está en ${quote(ordinalMedian)} o por debajo.`,
    );
  }
  if (counts.length > 10) {
    caveats.push(
      "Con tantas categorías conviene agrupar las poco frecuentes para que las gráficas se lean bien.",
    );
  }
  if (n < SMALL_SAMPLE) {
    caveats.push(`Con solo ${formatCount(n)} casos los porcentajes pueden cambiar mucho.`);
  }
  return { headline, details, caveats };
}

/** Recorta una tabla de trabajo larga y deja constancia de cuántas filas faltan. */
export function clipStepRows(
  rows: readonly (readonly string[])[],
): Pick<StepTable, "rows" | "omittedRows"> {
  if (rows.length <= STEP_TABLE_MAX_ROWS) return { rows };
  return {
    rows: rows.slice(0, STEP_TABLE_MAX_ROWS),
    omittedRows: rows.length - STEP_TABLE_MAX_ROWS,
  };
}

/**
 * Paso a paso de las medidas básicas de una variable numérica: ordenar, media,
 * mediana y desviación estándar muestral, con sus números y su fórmula de Excel.
 *
 * @param sorted - Valores válidos ordenados ascendentemente.
 */
export function quantitativeSteps(sorted: readonly number[]): CalculationStep[] {
  const n = sorted.length;
  if (n === 0) return [];
  // Resultados con un decimal más que la narración; datos con sus propios decimales.
  const f = (value: number): string => formatValue(value, narrativeDecimals(sorted) + 1);
  const raw = (value: number): string => formatValue(value, Math.min(6, detectDecimals(sorted)));
  const sum = neumaierSum(sorted);
  const mean = sum / n;
  const steps: CalculationStep[] = [];

  const listed = sorted.slice(0, LISTED_VALUES).map(raw).join("; ");
  steps.push({
    title: "1. Ordenar los datos de menor a mayor",
    text: `Hay n = ${formatCount(n)} datos válidos.`,
    formula: n > LISTED_VALUES ? `${listed}; … (${formatCount(n - LISTED_VALUES)} más)` : listed,
  });

  steps.push({
    title: "2. Promedio (media aritmética)",
    text: "Se suman todos los datos y el total se reparte entre la cantidad de datos.",
    formula: `x̄ = Σx / n = ${f(sum)} / ${formatCount(n)} = ${f(mean)}`,
    excel: "=PROMEDIO(rango)",
  });

  const median = quantile(sorted, 0.5) ?? mean;
  const medianText =
    n % 2 === 1
      ? `n es impar: la mediana es el dato en la posición (n + 1) / 2 = ${formatCount((n + 1) / 2)}, que vale ${raw(median)}.`
      : `n es par: la mediana es el promedio de los datos en las posiciones ${formatCount(n / 2)} y ${formatCount(n / 2 + 1)}: (${raw(sorted[n / 2 - 1] ?? 0)} + ${raw(sorted[n / 2] ?? 0)}) / 2 = ${f(median)}.`;
  steps.push({ title: "3. Mediana", text: medianText, excel: "=MEDIANA(rango)" });

  if (n >= 2) {
    const rows: string[][] = [];
    let squares = 0;
    for (const [index, value] of sorted.entries()) {
      const deviation = value - mean;
      squares += deviation * deviation;
      rows.push([formatCount(index + 1), raw(value), f(deviation), f(deviation * deviation)]);
    }
    const variance = squares / (n - 1);
    steps.push({
      title: "4. Desviación estándar (muestral)",
      text: "Se mide cuánto se aleja cada dato del promedio, esas distancias se elevan al cuadrado, se suman y se dividen entre n − 1; la raíz cuadrada devuelve las unidades originales.",
      table: {
        columns: ["#", "x", "x − x̄", "(x − x̄)²"],
        ...clipStepRows(rows),
        footer: ["Σ", f(sum), f(0), f(squares)],
      },
      formula: `s² = Σ(x − x̄)² / (n − 1) = ${f(squares)} / ${formatCount(n - 1)} = ${f(variance)};  s = √${f(variance)} = ${f(Math.sqrt(variance))}`,
      excel: "=VAR.S(rango) y =DESVEST.M(rango)",
    });
  }
  return steps;
}
