import { neumaierSum } from "../numeric/sum";
import { welford } from "../numeric/welford";
import { percentileOfValue } from "../shape/shape";
import type { CalculationStep, Interpretation } from "../types";
import { formatCount, formatValue, narrativeDecimals } from "./text";

/** Dónde queda un valor dentro de los datos: interpretación y cálculo. */
export interface LocatedValue {
  readonly interpretation: Interpretation;
  readonly steps: readonly CalculationStep[];
}

/** Qué tan común es un dato según su puntaje z (umbrales declarados). */
function rarity(z: number): string {
  const size = Math.abs(z);
  if (size < 1) return "es un valor común, cerca del centro";
  if (size < 2) return "está algo alejado del centro, pero no es raro";
  if (size < 3) return "es poco común: pocos datos se alejan tanto";
  return "es muy raro: está muy lejos de casi todos los datos";
}

/**
 * Ubica un valor dentro de una variable numérica (M1, «¿en qué percentil está
 * el valor X?»): percentil por el método R-7 (`RANGO.PERCENTIL.INC`), cuántos
 * datos quedan por debajo y por encima, y su puntaje z.
 *
 * @param sorted - Datos válidos ordenados ascendentemente (al menos 2, con variación).
 * @param x - Valor a ubicar; puede no estar en los datos.
 */
export function locateValue(sorted: readonly number[], x: number): LocatedValue | null {
  const n = sorted.length;
  const stats = welford(sorted);
  if (n < 2 || stats === null || !Number.isFinite(x)) return null;
  const sd = Math.sqrt(stats.m2 / (n - 1));
  if (sd === 0) return null;
  const d = narrativeDecimals(sorted);
  const f = (value: number): string => formatValue(value, d);
  const mean = neumaierSum(sorted) / n;
  const z = (x - mean) / sd;
  const below = sorted.filter((value) => value < x).length;
  const above = sorted.filter((value) => value > x).length;
  const min = sorted[0] ?? 0;
  const max = sorted[n - 1] ?? 0;
  const p = percentileOfValue(sorted, x);

  let headline: string;
  if (p === null) {
    headline =
      x < min
        ? `${f(x)} queda por debajo de todos los datos (el más bajo es ${f(min)}).`
        : `${f(x)} queda por encima de todos los datos (el más alto es ${f(max)}).`;
  } else {
    const pct = formatValue(100 * p, 0);
    headline = `${f(x)} está en el percentil ${pct}: aproximadamente el ${pct} % de los datos queda por debajo.`;
  }
  const side = z >= 0 ? "por encima" : "por debajo";
  const details = [
    `De ${formatCount(n)} datos, ${formatCount(below)} son menores y ${formatCount(above)} son mayores.`,
    `Está ${formatValue(Math.abs(z), 2)} desviaciones estándar ${side} del promedio (z = ${formatValue(z, 2)}): ${rarity(z)}.`,
  ];

  const steps: CalculationStep[] = [
    {
      title: "1. Puntaje z",
      text: "Cuántas desviaciones estándar separan el valor del promedio.",
      formula: `z = (x − x̄) / s = (${f(x)} − ${formatValue(mean, d + 1)}) / ${formatValue(sd, d + 1)} = ${formatValue(z, 3)}`,
      excel: `=NORMALIZACION(${f(x)}; PROMEDIO(rango); DESVEST.M(rango))`,
    },
  ];
  if (p !== null) {
    const lower = sorted[below - 1];
    const upper = sorted[below];
    const exact = upper === x;
    steps.push({
      title: "2. Percentil del valor",
      text: exact
        ? `El valor está en los datos: hay ${formatCount(below)} dato(s) menores, y se divide entre n − 1.`
        : "El valor cae entre dos datos: se interpola entre sus posiciones, igual que al calcular un percentil.",
      formula: exact
        ? `p = ${formatCount(below)} / (n − 1) = ${formatCount(below)} / ${formatCount(n - 1)} = ${formatValue(p, 4)}`
        : `p = (${formatCount(below - 1)} + (${f(x)} − ${f(lower ?? min)}) / (${f(upper ?? max)} − ${f(lower ?? min)})) / ${formatCount(n - 1)} = ${formatValue(p, 4)}`,
      excel: `=RANGO.PERCENTIL.INC(rango; ${f(x)})`,
    });
  }
  return { interpretation: { headline, details, caveats: [] }, steps };
}
