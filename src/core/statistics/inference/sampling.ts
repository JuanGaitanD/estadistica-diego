import { formatCount, formatValue, narrativeDecimals } from "../interpretation/text";
import { neumaierSum } from "../numeric/sum";
import { skewness } from "../shape/shape";
import type { CalculationStep, Interpretation } from "../types";

/**
 * Generador de números al azar con semilla (mulberry32): la misma semilla da
 * la misma simulación, así se puede repetir y probar.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Resultado de simular la distribución de los promedios muestrales. */
export interface SamplingSimulation {
  /** Promedio de cada muestra simulada. */
  readonly means: readonly number[];
  readonly sampleSize: number;
  readonly populationMean: number;
  /** Desviación de los datos tomados como población (dividiendo entre N). */
  readonly populationSd: number;
  readonly meanOfMeans: number;
  readonly sdOfMeans: number;
  /** σ / √n: cuánto deberían variar los promedios según el teorema. */
  readonly expectedSe: number;
  readonly interpretation: Interpretation;
  readonly steps: readonly CalculationStep[];
}

const meanOf = (values: readonly number[]) => neumaierSum(values) / values.length;
const sdOf = (values: readonly number[], mean: number) =>
  Math.sqrt(neumaierSum(values.map((v) => (v - mean) ** 2)) / values.length);

function shapeWords(g: number | null): string {
  if (g === null || Math.abs(g) < 0.5) return "tiene una forma casi simétrica";
  const side = g > 0 ? "hacia los valores altos" : "hacia los valores bajos";
  return Math.abs(g) <= 1 ? `tiene algo de cola ${side}` : `tiene una cola marcada ${side}`;
}

/**
 * Teorema del límite central por simulación: toma `repetitions` muestras de
 * `sampleSize` datos al azar (con reemplazo) de `population` y guarda el
 * promedio de cada una. Los promedios se reparten como una campana centrada
 * en μ con desviación σ/√n, aunque los datos no tengan forma de campana.
 */
export function simulateSampleMeans(
  population: readonly number[],
  sampleSize: number,
  name: string,
  { repetitions = 1000, seed = 1 }: { repetitions?: number; seed?: number } = {},
): SamplingSimulation | null {
  const size = population.length;
  if (size < 2 || !Number.isInteger(sampleSize) || sampleSize < 1 || repetitions < 2) {
    return null;
  }
  const random = seededRandom(seed);
  const means = Array.from({ length: repetitions }, () => {
    let sum = 0;
    for (let i = 0; i < sampleSize; i += 1) sum += population[Math.floor(random() * size)]!;
    return sum / sampleSize;
  });
  const mu = meanOf(population);
  const sigma = sdOf(population, mu);
  if (!(sigma > 0)) return null;
  const meanOfMeans = meanOf(means);
  const sdOfMeans = sdOf(means, meanOfMeans);
  const expectedSe = sigma / Math.sqrt(sampleSize);
  const gData = skewness(population).value;
  const gMeans = skewness(means).value;
  const d = narrativeDecimals(population);
  const f = (v: number) => formatValue(v, d);
  const f2 = (v: number) => formatValue(v, d + 1);
  const n = formatCount(sampleSize);
  const caveats = ["Es una simulación al azar: cada vez sale un poco distinto."];
  if (gMeans !== null && Math.abs(gMeans) >= 0.5) {
    caveats.unshift(
      `Con muestras de ${n} los promedios todavía conservan parte de la cola: cuanto más cargados están los datos, más grandes tienen que ser las muestras para que salga la campana.`,
    );
  }
  return {
    means,
    sampleSize,
    populationMean: mu,
    populationSd: sigma,
    meanOfMeans,
    sdOfMeans,
    expectedSe,
    interpretation: {
      headline: `${name} ${shapeWords(gData)}, pero los promedios de ${formatCount(repetitions)} muestras de ${n} datos se agrupan alrededor de ${f(meanOfMeans)}, muy cerca del promedio de los datos (${f(mu)}).`,
      details: [
        `Los promedios varían menos que los datos: su desviación es ${f2(sdOfMeans)} frente a ${f2(sigma)} (un ${formatValue((100 * sdOfMeans) / sigma, 0)} %), casi lo que anticipa el teorema, σ/√n = ${f2(sigma)}/√${n} = ${f2(expectedSe)}. Con muestras cuatro veces más grandes, varían la mitad.`,
        gData !== null && gMeans !== null
          ? `La asimetría baja de ${formatValue(gData, 2)} en los datos a ${formatValue(gMeans, 2)} en los promedios: por eso la t y los intervalos funcionan con muestras grandes aunque los datos no sean normales.`
          : "Por eso la t y los intervalos funcionan con muestras grandes aunque los datos no sean normales.",
      ],
      caveats,
    },
    steps: [
      {
        title: "1. Los datos como población",
        text: `Se toman los ${formatCount(size)} datos de ${name} como si fueran toda la población.`,
        formula: `μ = ${f2(mu)};  σ = √(Σ(x − μ)² / N) = ${f2(sigma)}`,
      },
      {
        title: "2. Muchas muestras",
        text: `Se sacan ${formatCount(repetitions)} muestras de ${n} datos al azar, con reemplazo, y se calcula el promedio de cada una.`,
        formula: `x̄ₖ = (x₁ + … + x${sampleSize === 1 ? "₁" : "ₙ"}) / ${n},  k = 1 … ${formatCount(repetitions)}`,
      },
      {
        title: "3. Lo que dice el teorema",
        text: "Los promedios se reparten como una normal con centro μ y desviación σ/√n (el error estándar).",
        formula: `promedio de los x̄ = ${f2(meanOfMeans)} (μ = ${f2(mu)});  desviación de los x̄ = ${f2(sdOfMeans)} (σ/√n = ${f2(expectedSe)})`,
      },
    ],
  };
}
