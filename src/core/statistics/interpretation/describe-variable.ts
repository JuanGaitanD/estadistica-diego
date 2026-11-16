import { CLASS_RULE_LABEL, detectDecimals } from "../grouping/intervals";
import { quantile } from "../numeric/quantile";
import { neumaierSum } from "../numeric/sum";
import { welford } from "../numeric/welford";
import { kurtosis, skewness } from "../shape/shape";
import type {
  CalculationStep,
  FrequencyTableResult,
  Interpretation,
  ModeResult,
  StepTable,
} from "../types";
import { TUKEY_FACTOR } from "../variability/variability";
import { formatCount, formatShare, formatValue, narrativeDecimals } from "./text";

/** Por debajo de este n se advierte que los resúmenes son inestables. */
export const SMALL_SAMPLE = 10;
/** Máximo de filas de una tabla de trabajo antes de recortarla. */
export const STEP_TABLE_MAX_ROWS = 30;
/** Diferencia (media − mediana) / desviación a partir de la cual se habla de sesgo. */
const SKEW_THRESHOLD = 0.1;
/** Desde este n se describe la forma (asimetría y curtosis); con menos es poco fiable. */
export const SHAPE_MIN_N = 8;
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

  const shape = describeShape(sorted);
  if (shape !== null) details.push(shape);

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

/**
 * Frase sobre la forma, con umbrales habituales (Bulmer): |asimetría| < 0,5
 * casi simétrica, 0,5–1 moderada, > 1 marcada; curtosis en exceso > 1 colas
 * pesadas, < −1 forma aplanada.
 */
export function describeShape(sorted: readonly number[]): string | null {
  if (sorted.length < SHAPE_MIN_N) return null;
  const g = skewness(sorted).value;
  if (g === null) return null;
  const k = kurtosis(sorted).value;
  const g2 = formatValue(g, 2);
  let text: string;
  if (Math.abs(g) < 0.5) text = `La forma es casi simétrica (asimetría ${g2})`;
  else {
    const side = g > 0 ? "hacia los valores altos" : "hacia los valores bajos";
    const level = Math.abs(g) <= 1 ? "algo cargada" : "muy cargada";
    text = `La forma está ${level}: tiene una cola ${side} (asimetría ${g2})`;
  }
  if (k !== null && k > 1) {
    text += `, y hay más datos extremos que en una campana normal (curtosis ${formatValue(k, 2)})`;
  } else if (k !== null && k < -1) {
    text += `, y los datos están repartidos de forma aplanada, con pocos extremos (curtosis ${formatValue(k, 2)})`;
  }
  return `${text}.`;
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
 * mediana, desviación estándar, coeficiente de variación, cuartiles, forma y
 * (si se agrupa) el cálculo de K y l, con sus números y su fórmula de Excel.
 *
 * @param sorted - Valores válidos ordenados ascendentemente.
 */
export function quantitativeSteps(
  sorted: readonly number[],
  grouped?: FrequencyTableResult,
): CalculationStep[] {
  const n = sorted.length;
  if (n === 0) return [];
  // Resultados con un decimal más que la narración; datos con sus propios decimales.
  const resultDecimals = narrativeDecimals(sorted) + 1;
  const dataDecimals = Math.min(6, detectDecimals(sorted));
  const f = (value: number): string => formatValue(value, resultDecimals);
  const raw = (value: number): string => formatValue(value, dataDecimals);
  const sum = neumaierSum(sorted);
  const mean = sum / n;
  const steps: CalculationStep[] = [];

  const listed = sorted.slice(0, LISTED_VALUES).map(raw).join("; ");
  steps.push({
    title: "Ordenar los datos de menor a mayor",
    text: `Hay n = ${formatCount(n)} datos válidos.`,
    formula: n > LISTED_VALUES ? `${listed}; … (${formatCount(n - LISTED_VALUES)} más)` : listed,
  });

  steps.push({
    title: "Promedio (media aritmética)",
    text: "Se suman todos los datos y el total se reparte entre la cantidad de datos.",
    formula: `x̄ = Σx / n = ${f(sum)} / ${formatCount(n)} = ${f(mean)}`,
    excel: "=PROMEDIO(rango)",
  });

  const median = quantile(sorted, 0.5) ?? mean;
  const medianText =
    n % 2 === 1
      ? `n es impar: la mediana es el dato en la posición (n + 1) / 2 = ${formatCount((n + 1) / 2)}, que vale ${raw(median)}.`
      : `n es par: la mediana es el promedio de los datos en las posiciones ${formatCount(n / 2)} y ${formatCount(n / 2 + 1)}: (${raw(sorted[n / 2 - 1] ?? 0)} + ${raw(sorted[n / 2] ?? 0)}) / 2 = ${f(median)}.`;
  steps.push({ title: "Mediana", text: medianText, excel: "=MEDIANA(rango)" });

  if (n >= 2) {
    const rows: string[][] = [];
    let squares = 0;
    for (const [index, value] of sorted.entries()) {
      const deviation = value - mean;
      squares += deviation * deviation;
      // Solo se formatean las filas que se muestran; el resto solo suma.
      if (index < STEP_TABLE_MAX_ROWS) {
        rows.push([formatCount(index + 1), raw(value), f(deviation), f(deviation * deviation)]);
      }
    }
    const variance = squares / (n - 1);
    steps.push({
      title: "Desviación estándar (muestral)",
      text: "Se mide cuánto se aleja cada dato del promedio, esas distancias se elevan al cuadrado, se suman y se dividen entre n − 1; la raíz cuadrada devuelve las unidades originales.",
      table: {
        columns: ["#", "x", "x − x̄", "(x − x̄)²"],
        rows,
        ...(n > STEP_TABLE_MAX_ROWS ? { omittedRows: n - STEP_TABLE_MAX_ROWS } : {}),
        footer: ["Σ", f(sum), f(0), f(squares)],
      },
      formula: `s² = Σ(x − x̄)² / (n − 1) = ${f(squares)} / ${formatCount(n - 1)} = ${f(variance)};  s = √${f(variance)} = ${f(Math.sqrt(variance))}`,
      excel: "=VAR.S(rango) y =DESVEST.M(rango)",
    });

    const sd = Math.sqrt(variance);
    const sameSign = (sorted[0] ?? 0) >= 0 || (sorted[n - 1] ?? 0) <= 0;
    if (sameSign && Math.abs(mean) > 1e-12) {
      steps.push({
        title: "Coeficiente de variación",
        text: "La desviación estándar como porcentaje del promedio: permite decir si la variación es poca o mucha sin importar las unidades.",
        formula: `CV = s / |x̄| · 100 = ${f(sd)} / ${f(Math.abs(mean))} · 100 = ${formatValue((100 * sd) / Math.abs(mean), 1)} %`,
        excel: "=DESVEST.M(rango)/PROMEDIO(rango)",
      });
    }

    steps.push(quartileStep(sorted, f, raw));

    if (n >= 4 && sd > 0) {
      let cubes = 0;
      let fourth = 0;
      for (const value of sorted) {
        const z = (value - mean) / sd;
        cubes += z ** 3;
        fourth += z ** 4;
      }
      const g = skewness(sorted).value ?? 0;
      const k = kurtosis(sorted).value ?? 0;
      steps.push({
        title: "Forma: asimetría y curtosis",
        text: "Cada dato se pasa a puntaje z = (x − x̄) / s. La asimetría promedia los cubos (el signo dice hacia dónde está la cola) y la curtosis las cuartas potencias (cuánto pesan los extremos frente a una campana normal, que da 0).",
        formula:
          `Σz³ = ${f(cubes)};  asimetría = n / ((n − 1)(n − 2)) · Σz³ = ${formatCount(n)} / (${formatCount(n - 1)} · ${formatCount(n - 2)}) · ${f(cubes)} = ${formatValue(g, 3)}\n` +
          `Σz⁴ = ${f(fourth)};  curtosis = n(n + 1) / ((n − 1)(n − 2)(n − 3)) · Σz⁴ − 3(n − 1)² / ((n − 2)(n − 3)) = ${formatValue(k, 3)}`,
        excel: "=COEFICIENTE.ASIMETRIA(rango) y =CURTOSIS(rango)",
      });
    }
  }
  const grouping = grouped === undefined ? null : groupingStep(grouped, sorted);
  if (grouping !== null) steps.push(grouping);
  return steps.map((step, index) => ({ ...step, title: `${index + 1}. ${step.title}` }));
}

/** Cuartiles por el método inclusivo (R-7) con sus posiciones, RIC y vallas de Tukey. */
function quartileStep(
  sorted: readonly number[],
  f: (value: number) => string,
  raw: (value: number) => string,
): CalculationStep {
  const n = sorted.length;
  const one = (p: number, name: string): { line: string; value: number } => {
    const h = (n - 1) * p + 1;
    const floor = Math.floor(h);
    const value = quantile(sorted, p) ?? 0;
    const lower = sorted[floor - 1] ?? 0;
    const upper = sorted[Math.min(floor, n - 1)] ?? lower;
    const fraction = h - floor;
    const line =
      fraction === 0
        ? `${name}: posición h = (n − 1) · ${formatValue(p, 2)} + 1 = ${formatValue(h, 2)} → x(${formatCount(floor)}) = ${raw(value)}`
        : `${name}: posición h = (n − 1) · ${formatValue(p, 2)} + 1 = ${formatValue(h, 2)} → ${raw(lower)} + ${formatValue(fraction, 2)} · (${raw(upper)} − ${raw(lower)}) = ${f(value)}`;
    return { line, value };
  };
  const q1 = one(0.25, "Q1");
  const q3 = one(0.75, "Q3");
  const iqr = q3.value - q1.value;
  return {
    title: "Cuartiles, rango intercuartílico y atípicos",
    text: "Cada cuartil se ubica en una posición de los datos ordenados; si cae entre dos datos, se interpola. Un dato es atípico si queda a más de 1,5 RIC por fuera de Q1 o Q3.",
    formula: [
      q1.line,
      q3.line,
      `RIC = Q3 − Q1 = ${f(q3.value)} − ${f(q1.value)} = ${f(iqr)}`,
      `Vallas: ${f(q1.value)} − 1,5 · ${f(iqr)} = ${f(q1.value - TUKEY_FACTOR * iqr)} y ${f(q3.value)} + 1,5 · ${f(iqr)} = ${f(q3.value + TUKEY_FACTOR * iqr)}`,
    ].join("\n"),
    excel: "=CUARTIL.INC(rango; 1) y =CUARTIL.INC(rango; 3)",
  };
}

/**
 * Paso «agrupar en intervalos»: K con la regla elegida, rango y longitud l
 * (docs/09 M1). Se añade al paso a paso cuando la variable se agrupa.
 */
export function groupingStep(
  table: FrequencyTableResult,
  sorted: readonly number[],
): CalculationStep | null {
  const k = table.k;
  const l = table.intervalLength;
  if (k === undefined || l === undefined || sorted.length === 0) return null;
  const n = sorted.length;
  const min = sorted[0] ?? 0;
  const max = sorted[n - 1] ?? 0;
  const decimals = Math.min(6, detectDecimals(sorted));
  const raw = (value: number): string => formatValue(value, decimals);
  const rule = table.rule ?? "sturges";
  const kLine =
    rule === "sturges"
      ? `K = 1 + log₂(n) = 1 + log₂(${formatCount(n)}) = ${formatValue(1 + Math.log2(n), 2)} → se redondea hacia arriba: K = ${formatCount(k)}`
      : `K = ${formatCount(k)} (regla de ${CLASS_RULE_LABEL[rule]})`;
  return {
    title: "Agrupar en intervalos",
    text: `Con muchos valores distintos los datos se agrupan en K clases del mismo ancho. Regla usada: ${CLASS_RULE_LABEL[rule]}.`,
    formula: [
      kLine,
      `Rango R = máximo − mínimo = ${raw(max)} − ${raw(min)} = ${raw(max - min)}`,
      `Ancho l = R / K = ${raw(max - min)} / ${formatCount(k)} = ${formatValue((max - min) / k, decimals + 2)} → hacia arriba con ${formatCount(decimals)} decimal(es): l = ${raw(l)}`,
    ].join("\n"),
    excel: "=1+LOG(CONTAR(rango);2) para K y =(MAX(rango)-MIN(rango))/K para l",
  };
}

/**
 * Paso a paso de una variable cualitativa: contar cada categoría, pasar a
 * proporción y porcentaje, y leer la moda (y la mediana si es ordinal).
 *
 * @param counts - Recuento por categoría, en el orden en que se muestran.
 * @param ordinalMedian - Categoría mediana si la variable es ordinal.
 */
export function categoricalSteps(
  counts: readonly CategoryCount[],
  ordinalMedian?: string | null,
): CalculationStep[] {
  const n = counts.reduce((total, entry) => total + entry.count, 0);
  if (n === 0) return [];
  const rows = counts.map((entry) => [
    entry.label,
    formatCount(entry.count),
    formatValue(entry.count / n, 3),
    formatShare(entry.count / n),
  ]);
  const top = Math.max(...counts.map((entry) => entry.count));
  const modes = counts.filter((entry) => entry.count === top).map((entry) => quote(entry.label));
  const first = counts[0];
  const steps: CalculationStep[] = [
    {
      title: "1. Contar cada categoría",
      text: "Se cuenta cuántas veces aparece cada categoría (fi); la proporción es fi / n y el porcentaje, esa proporción por 100.",
      table: {
        columns: ["Categoría", "fi", "hi = fi / n", "%"],
        ...clipStepRows(rows),
        footer: ["Total", formatCount(n), formatValue(1, 3), formatShare(1)],
      },
      ...(first !== undefined
        ? {
            formula: `Por ejemplo, ${quote(first.label)}: ${formatCount(first.count)} / ${formatCount(n)} = ${formatValue(first.count / n, 3)} → ${formatShare(first.count / n)}`,
          }
        : {}),
      excel: '=CONTAR.SI(rango; "categoría") y =CONTAR.SI(rango; "categoría")/CONTARA(rango)',
    },
    {
      title: "2. Moda",
      text:
        counts.length > 1 && modes.length === counts.length
          ? "Todas las categorías tienen la misma frecuencia: no hay moda."
          : `La categoría con la frecuencia más alta (${formatCount(top)}) es la moda: ${modes.join(", ")}.`,
    },
  ];
  if (ordinalMedian !== undefined && ordinalMedian !== null) {
    let running = 0;
    const position = (n + 1) / 2;
    const reached = counts.find((entry) => {
      running += entry.count;
      return running >= position;
    });
    steps.push({
      title: "3. Mediana (variable ordinal)",
      text: `Con las categorías en su orden, la mediana es la categoría del dato en la posición (n + 1) / 2 = ${formatValue(position, 1)}: la primera cuya frecuencia acumulada llega a esa posición.`,
      formula: `Categoría mediana: ${quote(reached?.label ?? ordinalMedian)}`,
    });
  }
  return steps;
}
