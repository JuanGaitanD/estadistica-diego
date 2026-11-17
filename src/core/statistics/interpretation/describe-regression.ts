import { computeGroupedFrequencyTable } from "../frequency/frequency-table";
import { detectDecimals } from "../grouping/intervals";
import { skewness } from "../shape/shape";
import type { Correlation } from "../regression/correlation";
import type { Prediction, SimpleRegression } from "../regression/simple";
import type { CalculationStep, FrequencyTableResult, Interpretation } from "../types";
import { formatCount, formatShare, formatValue } from "./text";
import { clipStepRows, SMALL_SAMPLE } from "./describe-variable";

/** Nivel de significancia con el que se lee el valor p. */
export const ALPHA = 0.05;

/** Fuerza de una correlación por su valor absoluto (umbrales declarados). */
export function correlationStrength(r: number): string {
  const size = Math.abs(r);
  if (size < 0.1) return "prácticamente nula";
  if (size < 0.3) return "débil";
  if (size < 0.7) return "moderada";
  return "fuerte";
}

/** Número sin ceros de relleno: `0,6`, `2,2`, `0,375`. */
function compact(value: number, maxDecimals = 3): string {
  const text = formatValue(value, maxDecimals);
  return text.includes(",") ? text.replace(/,?0+$/, "") : text;
}

/** Decimales del paso a paso: uno más que los datos, entre 2 y 4. */
function stepDecimals(model: SimpleRegression): number {
  const xs = model.rows.map((row) => row.x);
  const ys = model.rows.map((row) => row.y);
  return Math.min(4, Math.max(2, Math.max(detectDecimals(xs), detectDecimals(ys)) + 1));
}

function pText(p: number): string {
  return p < 0.001 ? "menor que 0,001" : formatValue(p, 3);
}

/**
 * Interpretación en llano de la regresión simple (RF-51): cuánto cambia Y por
 * cada unidad de X, qué tanto explica la recta, si la pendiente puede ser azar
 * y las advertencias honestas (causalidad, extrapolación, muestra pequeña).
 */
export function interpretRegression(
  model: SimpleRegression,
  xName: string,
  yName: string,
): Interpretation {
  const b1 = compact(Math.abs(model.b1));
  const verb = model.b1 > 0 ? "sube" : model.b1 < 0 ? "baja" : "no cambia";
  const headline =
    model.b1 === 0
      ? `${yName} no cambia con ${xName}: la recta es plana en ${compact(model.b0)}.`
      : `Por cada unidad más de ${xName}, ${yName} ${verb} ${b1} en promedio. La recta es Ŷ = ${compact(model.b0)} ${model.b1 < 0 ? "−" : "+"} ${b1}·X.`;

  const details = [
    `La recta explica el ${formatShare(model.r2)} de la variación de ${yName} (R² = ${formatValue(model.r2, 2)}); la relación es ${correlationStrength(model.r)} y ${model.r >= 0 ? "positiva" : "negativa"} (r = ${formatValue(model.r, 2)}).`,
    model.pB1 < ALPHA
      ? `Es muy poco probable que una pendiente así salga por azar si en realidad no hubiera relación (valor p ${pText(model.pB1)}).`
      : `Con estos datos no se puede descartar que la pendiente sea solo azar (valor p ${pText(model.pB1)}, mayor que 0,05).`,
    `La recta suele equivocarse en unas ${compact(model.standardError)} unidades de ${yName} (error estándar de la estimación).`,
  ];
  const zeroInside = model.minX <= 0 && model.maxX >= 0;
  if (zeroInside) {
    details.push(`Con ${xName} = 0 la recta predice ${compact(model.b0)}.`);
  }

  const caveats = [
    `Que se muevan juntas no prueba que ${xName} cause ${yName}: puede haber otra causa detrás.`,
    `La recta solo vale entre ${compact(model.minX)} y ${compact(model.maxX)} de ${xName}, que es donde hay datos.`,
  ];
  if (!zeroInside) {
    caveats.push(
      `b0 = ${compact(model.b0)} es el valor de la recta en ${xName} = 0, que está fuera de tus datos: tómalo como punto de partida de la recta, no como predicción.`,
    );
  }
  if (model.n < SMALL_SAMPLE) {
    caveats.push(
      `Con solo ${formatCount(model.n)} parejas de datos la recta puede cambiar bastante al agregar más.`,
    );
  }
  return { headline, details, caveats };
}

/**
 * El método de los 5 pasos de la clase con los números de la persona, más la
 * bondad del ajuste y la prueba de la pendiente (docs/09 M6).
 */
export function regressionSteps(model: SimpleRegression): CalculationStep[] {
  const d = stepDecimals(model);
  const f = (value: number): string => formatValue(value, d);
  const c = (value: number): string => compact(value, d);
  const { n, sumX, sumY, sumXX, sumXY } = model;
  const numerator = sumXY - (sumX * sumY) / n;
  const denominator = sumXX - (sumX * sumX) / n;

  const workRows = model.rows.map((row) => [c(row.x), c(row.y), c(row.xx), c(row.xy)]);
  const fitRows = model.rows.map((row) => [
    c(row.x),
    c(row.y),
    f(row.fitted),
    f(row.residual),
    f(row.residualSquared),
    f(row.totalSquared),
  ]);

  return [
    {
      title: "1. El modelo y la suma de errores al cuadrado",
      text: "Se busca la recta Yi = B0 + B1·Xi que pase lo más cerca posible de los puntos. Cada punto se aleja de la recta un error ei = Yi − (B0 + B1·Xi); mínimos cuadrados elige B0 y B1 para que la suma de esos errores al cuadrado sea lo más pequeña posible: se minimiza, no se maximiza.",
      formula: "S(B0, B1) = Σ(Yi − B0 − B1·Xi)²  →  mínimo",
    },
    {
      title: "2. Derivar S respecto a B0 y a B1",
      text: "En el punto más bajo de S la pendiente de la superficie es cero en las dos direcciones.",
      formula: "∂S/∂B0 = −2·Σ(Yi − B0 − B1·Xi)\n∂S/∂B1 = −2·Σ Xi·(Yi − B0 − B1·Xi)",
    },
    {
      title: "3. Igualar a cero: las ecuaciones normales",
      text: "Al igualar las derivadas a cero y repartir las sumas quedan dos ecuaciones con dos incógnitas. Sus números salen de esta tabla.",
      table: {
        columns: ["X", "Y", "X²", "XY"],
        ...clipStepRows(workRows),
        footer: [`ΣX = ${c(sumX)}`, `ΣY = ${c(sumY)}`, `ΣX² = ${c(sumXX)}`, `ΣXY = ${c(sumXY)}`],
      },
      formula: `ΣY = n·b0 + b1·ΣX   →   ${c(sumY)} = ${formatCount(n)}·b0 + ${c(sumX)}·b1\nΣXY = b0·ΣX + b1·ΣX²   →   ${c(sumXY)} = ${c(sumX)}·b0 + ${c(sumXX)}·b1`,
      excel:
        "=SUMA(rango_X), =SUMA(rango_Y), =SUMAPRODUCTO(rango_X; rango_X), =SUMAPRODUCTO(rango_X; rango_Y)",
    },
    {
      title: "4. Resolver el sistema",
      text: "De la primera ecuación se despeja b0 y se reemplaza en la segunda (eliminación); queda b1 solo.",
      formula: [
        `b0 = (ΣY − b1·ΣX) / n = (${c(sumY)} − b1·${c(sumX)}) / ${formatCount(n)}`,
        `b1 = (ΣXY − ΣX·ΣY/n) / (ΣX² − (ΣX)²/n) = (${c(sumXY)} − ${c(sumX)}·${c(sumY)}/${formatCount(n)}) / (${c(sumXX)} − ${c(sumX)}²/${formatCount(n)}) = ${f(numerator)} / ${f(denominator)} = ${f(model.b1)}`,
        `b0 = (${c(sumY)} − ${f(model.b1)}·${c(sumX)}) / ${formatCount(n)} = ${f(model.b0)}`,
      ].join("\n"),
      excel: "=PENDIENTE(rango_Y; rango_X) y =INTERSECCION.EJE(rango_Y; rango_X)",
    },
    {
      title: "5. La recta",
      text: "Con b0 y b1 se escribe la recta y se usa para predecir Y a partir de X.",
      formula: `Ŷ = ${f(model.b0)} ${model.b1 < 0 ? "−" : "+"} ${f(Math.abs(model.b1))}·X`,
      excel: "=PRONOSTICO.LINEAL(x; rango_Y; rango_X)",
    },
    {
      title: "6. Qué tan bien se ajusta",
      text: "Se compara cada Y con lo que predice la recta. SCE suma los errores al cuadrado (lo que la recta no explica) y SCT la variación total de Y alrededor de su promedio.",
      table: {
        columns: ["X", "Y", "Ŷ", "e = Y − Ŷ", "e²", "(Y − Ȳ)²"],
        ...clipStepRows(fitRows),
        footer: ["", "", "", f(0), `SCE = ${f(model.sce)}`, `SCT = ${f(model.sct)}`],
      },
      formula: [
        `R² = 1 − SCE / SCT = 1 − ${f(model.sce)} / ${f(model.sct)} = ${formatValue(model.r2, 4)}`,
        `r = ${model.b1 < 0 ? "−" : "+"}√R² = ${formatValue(model.r, 4)}  (lleva el signo de b1; √R² sola lo pierde)`,
        `SCR = SCT − SCE = ${f(model.scr)}`,
      ].join("\n"),
      excel: "=COEFICIENTE.R2(rango_Y; rango_X) y =COEF.DE.CORREL(rango_X; rango_Y)",
    },
    {
      title: "7. ¿La pendiente puede ser azar?",
      text: `Se compara b1 con su error estándar. Con n − 2 = ${formatCount(model.df)} grados de libertad, el valor p dice qué tan raro sería ver una pendiente así si en la población no hubiera relación.`,
      formula: [
        `s = √(SCE / (n − 2)) = √(${f(model.sce)} / ${formatCount(model.df)}) = ${formatValue(model.standardError, 4)}`,
        `ee(b1) = s / √Σ(X − X̄)² = ${formatValue(model.seB1, 4)};  t = b1 / ee(b1) = ${formatValue(model.tB1, 3)};  valor p = ${pText(model.pB1)}`,
        `IC 95 % de b1: ${formatValue(model.ciB1.lower, 4)} a ${formatValue(model.ciB1.upper, 4)};  de b0: ${formatValue(model.ciB0.lower, 4)} a ${formatValue(model.ciB0.upper, 4)}`,
      ].join("\n"),
      excel: "=ESTIMACION.LINEAL(rango_Y; rango_X; VERDADERO; VERDADERO)",
    },
  ];
}

/** Interpretación de una predicción concreta. */
export function interpretPrediction(
  prediction: Prediction,
  xName: string,
  yName: string,
): Interpretation {
  const caveats = prediction.extrapolation
    ? [
        `${compact(prediction.x)} está fuera de los valores de ${xName} que hay en los datos: la recta se estira donde no hay datos y la predicción puede fallar mucho.`,
      ]
    : [];
  return {
    headline: `Para ${xName} = ${compact(prediction.x)} la recta predice ${yName} ≈ ${compact(prediction.y)}.`,
    details: [
      `Un caso nuevo con ese ${xName} quedaría, con 95 % de confianza, entre ${compact(prediction.interval.lower)} y ${compact(prediction.interval.upper)}.`,
    ],
    caveats,
  };
}

/** Interpretación de una correlación (Pearson o Spearman). */
export function interpretCorrelation(
  correlation: Correlation,
  xName: string,
  yName: string,
): Interpretation {
  const label = correlation.method === "pearson" ? "Pearson" : "Spearman";
  const direction =
    correlation.r > 0
      ? `cuando ${xName} sube, ${yName} tiende a subir`
      : `cuando ${xName} sube, ${yName} tiende a bajar`;
  const headline =
    Math.abs(correlation.r) < 0.1
      ? `${xName} y ${yName} prácticamente no se mueven juntas (r de ${label} = ${formatValue(correlation.r, 2)}).`
      : `La relación entre ${xName} y ${yName} es ${correlationStrength(correlation.r)}: ${direction} (r de ${label} = ${formatValue(correlation.r, 2)}).`;
  return {
    headline,
    details: [
      correlation.p < ALPHA
        ? `Es poco probable que sea casualidad (valor p ${pText(correlation.p)}).`
        : `No se puede descartar que sea casualidad (valor p ${pText(correlation.p)}).`,
      correlation.method === "pearson"
        ? "Pearson mide qué tan cerca están los puntos de una recta."
        : "Spearman compara los órdenes (rangos): sirve aunque la relación sea curva o los datos sean ordinales.",
    ],
    caveats: ["Correlación no es causalidad."],
  };
}

/** Con menos residuos la forma del histograma no dice nada. */
const RESIDUAL_SHAPE_MIN = 8;

/**
 * Histograma de los residuos (clases de Sturges) y su lectura: si el modelo
 * es adecuado, forman una campana centrada en 0. Los residuos se redondean a
 * un decimal más que Y para que las clases no arrastren ruido de coma flotante.
 */
export function residualHistogram(
  residuals: readonly number[],
  y: readonly number[],
): { table: FrequencyTableResult; reading: string } | null {
  if (residuals.length < 2) return null;
  const factor = 10 ** Math.min(4, detectDecimals(y) + 1);
  const rounded = residuals.map((e) => Math.round(e * factor) / factor);
  const table = computeGroupedFrequencyTable({
    variableId: "residuos",
    values: rounded,
    grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
  });
  if (table.rows.length === 0) return null;
  const g = skewness(residuals).value;
  let reading: string;
  if (residuals.length < RESIDUAL_SHAPE_MIN || g === null) {
    reading = `Con ${formatCount(residuals.length)} residuos la forma todavía no se puede juzgar.`;
  } else if (Math.abs(g) < 0.5) {
    reading = `Los residuos se reparten casi simétricos alrededor de 0 (asimetría ${formatValue(g, 2)}): el supuesto de que los errores son normales se ve razonable.`;
  } else {
    const side = g > 0 ? "hacia los valores altos" : "hacia los valores bajos";
    reading =
      Math.abs(g) <= 1
        ? `Los residuos tienen algo de cola ${side} (asimetría ${formatValue(g, 2)}): el supuesto de errores normales se cumple a medias; con muchos datos importa poco.`
        : `Los residuos tienen una cola marcada ${side} (asimetría ${formatValue(g, 2)}): los valores p y los intervalos del modelo son orientativos. Revisa si hay datos atípicos o si conviene transformar Y.`;
  }
  return { table, reading };
}
