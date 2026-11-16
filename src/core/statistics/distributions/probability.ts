import { formatCount, formatShare, formatValue } from "../interpretation/text";
import type { CalculationStep, Interpretation } from "../types";
import {
  chiSquareCdf,
  chiSquarePdf,
  chiSquareQuantile,
  fCdf,
  fPdf,
  fQuantile,
  normalCdf,
  normalPdf,
  tPdf,
} from "./continuous";
import { binomialCdf, binomialPmf, poissonCdf, poissonPmf } from "./discrete";
import { tCdf, tQuantile } from "./student-t";

/** Distribución con sus parámetros. */
export type DistributionSpec =
  | { readonly kind: "normal"; readonly mean: number; readonly sd: number }
  | { readonly kind: "t"; readonly df: number }
  | { readonly kind: "chi2"; readonly df: number }
  | { readonly kind: "f"; readonly d1: number; readonly d2: number }
  | { readonly kind: "binomial"; readonly n: number; readonly p: number }
  | { readonly kind: "poisson"; readonly lambda: number };

/** Qué probabilidad se pide. */
export type ProbabilityQuery =
  | { readonly type: "menor"; readonly a: number }
  | { readonly type: "mayor"; readonly a: number }
  | { readonly type: "entre"; readonly a: number; readonly b: number };

export const DISTRIBUTION_LABEL: Readonly<Record<DistributionSpec["kind"], string>> = {
  normal: "Normal",
  t: "t de Student",
  chi2: "Chi-cuadrado",
  f: "F de Snedecor",
  binomial: "Binomial",
  poisson: "Poisson",
};

export function isDiscrete(spec: DistributionSpec): boolean {
  return spec.kind === "binomial" || spec.kind === "poisson";
}

/** Motivo en llano si los parámetros no valen, o `null`. */
export function validateSpec(spec: DistributionSpec): string | null {
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  switch (spec.kind) {
    case "normal":
      return Number.isFinite(spec.mean) && positive(spec.sd)
        ? null
        : "La desviación estándar tiene que ser mayor que 0.";
    case "t":
    case "chi2":
      return positive(spec.df) ? null : "Los grados de libertad tienen que ser mayores que 0.";
    case "f":
      return positive(spec.d1) && positive(spec.d2)
        ? null
        : "Los dos grados de libertad tienen que ser mayores que 0.";
    case "binomial":
      return Number.isInteger(spec.n) &&
        spec.n >= 1 &&
        spec.n <= 10000 &&
        spec.p >= 0 &&
        spec.p <= 1
        ? null
        : "n tiene que ser un entero entre 1 y 10.000, y p estar entre 0 y 1.";
    case "poisson":
      return positive(spec.lambda) && spec.lambda <= 1000
        ? null
        : "λ tiene que ser mayor que 0 (y como mucho 1.000).";
  }
}

/** P(X ≤ x). */
export function cdf(spec: DistributionSpec, x: number): number {
  switch (spec.kind) {
    case "normal":
      return normalCdf(x, spec.mean, spec.sd);
    case "t":
      return tCdf(x, spec.df);
    case "chi2":
      return chiSquareCdf(x, spec.df);
    case "f":
      return fCdf(x, spec.d1, spec.d2);
    case "binomial":
      return binomialCdf(Math.floor(x), spec.n, spec.p);
    case "poisson":
      return poissonCdf(Math.floor(x), spec.lambda);
  }
}

/** Densidad (continuas) o probabilidad puntual (discretas). */
export function density(spec: DistributionSpec, x: number): number {
  switch (spec.kind) {
    case "normal":
      return normalPdf(x, spec.mean, spec.sd);
    case "t":
      return tPdf(x, spec.df);
    case "chi2":
      return chiSquarePdf(x, spec.df);
    case "f":
      return fPdf(x, spec.d1, spec.d2);
    case "binomial":
      return binomialPmf(x, spec.n, spec.p);
    case "poisson":
      return poissonPmf(x, spec.lambda);
  }
}

/** La probabilidad pedida. En discretas, «mayor» y «entre» incluyen los extremos. */
export function probabilityOf(spec: DistributionSpec, query: ProbabilityQuery): number {
  const discrete = isDiscrete(spec);
  const below = (x: number): number => (discrete ? cdf(spec, Math.ceil(x) - 1) : cdf(spec, x));
  const value =
    query.type === "menor"
      ? cdf(spec, query.a)
      : query.type === "mayor"
        ? 1 - below(query.a)
        : cdf(spec, Math.max(query.a, query.b)) - below(Math.min(query.a, query.b));
  return Math.min(1, Math.max(0, value));
}

/** Rango del eje para dibujar la distribución. */
export function plotRange(spec: DistributionSpec): { min: number; max: number } {
  switch (spec.kind) {
    case "normal":
      return { min: spec.mean - 4 * spec.sd, max: spec.mean + 4 * spec.sd };
    case "t": {
      const edge = Math.max(4, tQuantile(0.995, spec.df));
      return { min: -edge, max: edge };
    }
    case "chi2":
      return { min: 0, max: chiSquareQuantile(0.999, spec.df) };
    case "f":
      return { min: 0, max: Math.min(fQuantile(0.995, spec.d1, spec.d2), 50) };
    case "binomial":
      return { min: 0, max: spec.n };
    case "poisson":
      return { min: 0, max: Math.max(5, Math.ceil(spec.lambda + 5 * Math.sqrt(spec.lambda))) };
  }
}

/** Puntos para la gráfica: densidad continua (200) o barras discretas (hasta 200). */
export function densityPoints(spec: DistributionSpec): { x: number; y: number }[] {
  const { min, max } = plotRange(spec);
  if (isDiscrete(spec)) {
    const step = Math.max(1, Math.ceil((max - min + 1) / 200));
    const points = [];
    for (let k = min; k <= max; k += step) points.push({ x: k, y: density(spec, k) });
    return points;
  }
  const points = [];
  for (let i = 0; i <= 200; i += 1) {
    const x = min + ((max - min) * i) / 200;
    const y = density(spec, x);
    points.push({ x, y: Number.isFinite(y) ? y : 0 });
  }
  return points;
}

/** ¿Cae x dentro de la región pedida? (para sombrear). */
export function inRegion(spec: DistributionSpec, query: ProbabilityQuery, x: number): boolean {
  const lo = query.type === "entre" ? Math.min(query.a, query.b) : query.a;
  const hi = query.type === "entre" ? Math.max(query.a, query.b) : query.a;
  if (query.type === "menor") return x <= query.a;
  if (query.type === "mayor") return x >= query.a;
  return x >= lo && x <= hi;
}

function specText(spec: DistributionSpec): string {
  const f = (v: number) => formatValue(v, Number.isInteger(v) ? 0 : 3).replace(/,?0+$/, "");
  switch (spec.kind) {
    case "normal":
      return `una normal con media ${f(spec.mean)} y desviación ${f(spec.sd)}`;
    case "t":
      return `una t de Student con ${f(spec.df)} grados de libertad`;
    case "chi2":
      return `una chi-cuadrado con ${f(spec.df)} grados de libertad`;
    case "f":
      return `una F con ${f(spec.d1)} y ${f(spec.d2)} grados de libertad`;
    case "binomial":
      return `una binomial con n = ${formatCount(spec.n)} intentos y probabilidad de éxito p = ${f(spec.p)}`;
    case "poisson":
      return `una Poisson con un promedio de λ = ${f(spec.lambda)} casos`;
  }
}

function queryText(query: ProbabilityQuery): string {
  const f = (v: number) => formatValue(v, Number.isInteger(v) ? 0 : 3).replace(/,?0+$/, "");
  if (query.type === "menor") return `X ≤ ${f(query.a)}`;
  if (query.type === "mayor") return `X ≥ ${f(query.a)}`;
  return `${f(Math.min(query.a, query.b))} ≤ X ≤ ${f(Math.max(query.a, query.b))}`;
}

function excelFor(spec: DistributionSpec, x: string): string {
  switch (spec.kind) {
    case "normal":
      return `=DISTR.NORM.N(${x}; ${formatValue(spec.mean, 3)}; ${formatValue(spec.sd, 3)}; VERDADERO)`;
    case "t":
      return `=DISTR.T.N(${x}; ${spec.df}; VERDADERO)`;
    case "chi2":
      return `=DISTR.CHICUAD(${x}; ${spec.df}; VERDADERO)`;
    case "f":
      return `=DISTR.F.N(${x}; ${spec.d1}; ${spec.d2}; VERDADERO)`;
    case "binomial":
      return `=DISTR.BINOM.N(${x}; ${spec.n}; ${formatValue(spec.p, 3)}; VERDADERO)`;
    case "poisson":
      return `=POISSON.DIST(${x}; ${formatValue(spec.lambda, 3)}; VERDADERO)`;
  }
}

/**
 * Interpretación y cálculo de una probabilidad (M3): la cifra en porcentaje y
 * en «de cada 100», qué distribución se usó y la fórmula de Excel.
 */
export function describeProbability(
  spec: DistributionSpec,
  query: ProbabilityQuery,
): { probability: number; interpretation: Interpretation; steps: CalculationStep[] } {
  const p = probabilityOf(spec, query);
  const discrete = isDiscrete(spec);
  const q = queryText(query);
  const perHundred = Math.round(p * 100);
  const headline = `P(${q}) = ${formatShare(p)} (${formatValue(p, 4)}): ${
    p < 0.005
      ? "es muy raro, menos de 1 de cada 200 casos."
      : `más o menos ${formatCount(perHundred)} de cada 100 casos.`
  }`;
  const details = [`Se calculó con ${specText(spec)}.`];
  if (discrete && query.type !== "menor") {
    details.push(
      "En una variable que cuenta casos, los extremos se incluyen: «al menos 3» cuenta el 3.",
    );
  }

  const steps: CalculationStep[] = [];
  if (spec.kind === "normal") {
    const z = (x: number) => (x - spec.mean) / spec.sd;
    const values = query.type === "entre" ? [query.a, query.b] : [query.a];
    steps.push({
      title: "1. Estandarizar",
      text: "Cada valor se pasa a puntaje z para usar la normal estándar (media 0, desviación 1).",
      formula: values
        .map(
          (x) =>
            `z = (${formatValue(x, 3)} − ${formatValue(spec.mean, 3)}) / ${formatValue(spec.sd, 3)} = ${formatValue(z(x), 3)};  Φ(z) = ${formatValue(normalCdf(x, spec.mean, spec.sd), 4)}`,
        )
        .join("\n"),
    });
  }
  if (spec.kind === "binomial") {
    steps.push({
      title: `${steps.length + 1}. Probabilidad de cada valor`,
      text: "La binomial cuenta éxitos en n intentos independientes; cada valor k tiene probabilidad C(n, k)·p^k·(1 − p)^(n − k).",
      formula: `P(X = k) = C(${spec.n}, k)·${formatValue(spec.p, 3)}^k·${formatValue(1 - spec.p, 3)}^(${spec.n} − k)`,
    });
  }
  if (spec.kind === "poisson") {
    steps.push({
      title: `${steps.length + 1}. Probabilidad de cada valor`,
      text: "La Poisson cuenta casos en un intervalo con promedio λ; cada valor k tiene probabilidad e^(−λ)·λ^k / k!.",
      formula: `P(X = k) = e^(−${formatValue(spec.lambda, 3)})·${formatValue(spec.lambda, 3)}^k / k!`,
    });
  }
  const rule =
    query.type === "menor"
      ? `P(${q}) = F(${formatValue(query.a, 3)})`
      : query.type === "mayor"
        ? discrete
          ? `P(${q}) = 1 − F(${formatValue(Math.ceil(query.a) - 1, 0)})`
          : `P(${q}) = 1 − F(${formatValue(query.a, 3)})`
        : discrete
          ? `P(${q}) = F(${formatValue(Math.floor(Math.max(query.a, query.b)), 0)}) − F(${formatValue(Math.ceil(Math.min(query.a, query.b)) - 1, 0)})`
          : `P(${q}) = F(${formatValue(Math.max(query.a, query.b), 3)}) − F(${formatValue(Math.min(query.a, query.b), 3)})`;
  steps.push({
    title: `${steps.length + 1}. Probabilidad acumulada`,
    text: "F(x) es la probabilidad acumulada hasta x, el área bajo la curva (o la suma de barras) a la izquierda.",
    formula: `${rule} = ${formatValue(p, 4)}`,
    excel: excelFor(spec, "x"),
  });
  return { probability: p, interpretation: { headline, details, caveats: [] }, steps };
}
