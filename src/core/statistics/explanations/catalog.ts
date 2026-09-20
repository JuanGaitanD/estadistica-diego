import type { Explanation } from "../types";

/**
 * Catálogo de microtextos "qué significa / para qué sirve" (01-requisitos §5).
 * Todo resultado del dominio viaja con su `Explanation`; la UI nunca inventa texto.
 */
export const EXPLANATIONS = {
  "n-efectivo": {
    what: "Cuántos datos válidos quedan en la variable tras excluir los faltantes",
    why: "Saber sobre cuántas observaciones se calculó cada estadístico",
    formula: "n = nº de observaciones no faltantes",
  },
  "tabla-de-frecuencias": {
    what: "El recuento de cada valor o clase, con sus proporciones y acumuladas",
    why: "Resumir toda la variable en una sola tabla legible",
    formula: "fi, hi = fi/n, Fi = suma de f1..fi, Hi = Fi/n",
  },
  "frecuencia-absoluta": {
    what: "Cuántas veces aparece cada valor o clase",
    why: "Ver qué valores dominan y cuáles son raros",
    formula: "fi = nº de datos que pertenecen a la clase i",
  },
  "frecuencia-relativa": {
    what: "La proporción del total que representa cada valor (0 a 1)",
    why: "Comparar grupos de distinto tamaño",
    formula: "hi = fi / n",
  },
  "frecuencia-porcentual": {
    what: "Lo mismo que la relativa, expresada en %",
    why: "Comunicar resultados de forma intuitiva",
    formula: "pi = 100 · hi",
  },
  "frecuencia-acumulada": {
    what: "Cuántos datos hay hasta esa clase inclusive",
    why: "Responder cuántos datos están por debajo de un valor",
    formula: "Fi = suma de f1..fi, Hi = Fi / n",
  },
  "marca-de-clase": {
    what: "El punto medio de un intervalo",
    why: "Representar el intervalo en cálculos y gráficas",
    formula: "xi = (Li + Ls) / 2",
  },
  minimo: {
    what: "El valor más pequeño observado",
    why: "Delimitar el recorrido y detectar errores de captura",
    formula: "mínimo = x(1) en la muestra ordenada",
  },
  maximo: {
    what: "El valor más grande observado",
    why: "Delimitar el recorrido y detectar valores extremos",
    formula: "máximo = x(n) en la muestra ordenada",
  },
  "numero-de-intervalos": {
    what: "En cuántas clases se agrupan los datos",
    why: "Resumir muchos valores distintos sin perder la forma de la distribución",
    formula: "Sturges: K = techo(1 + log2 n), acotado a [2, 50]",
  },
  "longitud-de-intervalo": {
    what: "El ancho de cada clase",
    why: "Garantizar clases comparables entre sí",
    formula: "l = redondeoArriba(Rango / K, decimales de los datos)",
  },
  moda: {
    what: "El valor o valores que más se repiten",
    why: "Identificar lo más típico; único promedio válido para datos cualitativos",
    formula: "Mo = valor o valores con frecuencia máxima fmax",
  },
  "moda-agrupada": {
    what: "La moda interpolada dentro de la clase de mayor frecuencia",
    why: "Estimar el valor más típico cuando los datos están agrupados en intervalos",
    formula: "Mo = Li + (D1 / (D1 + D2)) · l, con D1 = fi − f(i−1), D2 = fi − f(i+1)",
  },
  "media-aritmetica": {
    what: "El reparto equitativo del total entre todos los datos",
    why: "Resumir el centro cuando no hay valores extremos",
    formula: "x̄ = (1/n) · suma de xi",
  },
  "media-agrupada": {
    what: "La media estimada a partir de las marcas de clase",
    why: "Resumir el centro cuando solo se conservan los datos agrupados",
    formula: "x̄ = suma de (fi · xi) / n, con xi la marca de clase",
  },
  "media-ponderada": {
    what: "Promedio en el que cada dato pesa distinto",
    why: "Notas por créditos, precios por cantidad vendida",
    formula: "x̄w = suma de (wi · xi) / suma de wi, con wi ≥ 0 y suma de wi > 0",
  },
  "media-geometrica": {
    what: "Promedio multiplicativo (raíz n-ésima del producto)",
    why: "Promediar tasas de crecimiento, índices y razones",
    formula: "G = (producto de xi)^(1/n) = exp((1/n) · suma de ln xi), requiere xi > 0",
  },
  "media-armonica": {
    what: "Inverso del promedio de los inversos",
    why: "Promediar velocidades y razones con numerador constante",
    formula: "H = n / suma de (1/xi), requiere xi > 0",
  },
  mediana: {
    what: "El valor que parte los datos ordenados en dos mitades",
    why: "Centro robusto ante valores extremos o asimetría",
    formula: "Me = cuantil 0,5 por interpolación lineal (R-7)",
  },
  "mediana-agrupada": {
    what: "La mediana interpolada dentro de la clase donde se alcanza la mitad de los datos",
    why: "Estimar el centro cuando los datos están agrupados en intervalos",
    formula: "Me = Li + ((n/2 − F(i−1)) / fi) · l",
  },
  "mediana-ordinal": {
    what: "La categoría que ocupa la posición central en el orden declarado",
    why: "Resumir el centro de una variable ordinal sin promediar categorías",
    formula: "n impar: posición (n+1)/2; n par: posición n/2 + 1",
  },
  cuartiles: {
    what: "Cortan los datos ordenados en cuatro partes iguales",
    why: "Describir dispersión y detectar asimetría",
    formula: "Q1 = Q(0,25), Q2 = Q(0,50), Q3 = Q(0,75)",
  },
  deciles: {
    what: "Cortan los datos ordenados en diez partes iguales",
    why: "Ubicar un dato respecto al grupo",
    formula: "Dk = Q(k/10), k = 1..9",
  },
  percentiles: {
    what: "Cortan los datos ordenados en cien partes iguales",
    why: "Ubicar un dato respecto al grupo (estar en el percentil 90)",
    formula: "Pk = Q(k/100)",
  },
  rango: {
    what: "Diferencia entre máximo y mínimo",
    why: "Medida rápida de dispersión, muy sensible a extremos",
    formula: "R = máximo − mínimo",
  },
  "varianza-muestral": {
    what: "Promedio de las desviaciones al cuadrado respecto a la media, dividido por n−1",
    why: "Base matemática de la dispersión y de la inferencia",
    formula: "s² = suma de (xi − x̄)² / (n − 1), requiere n ≥ 2",
  },
  "varianza-poblacional": {
    what: "Promedio de las desviaciones al cuadrado respecto a la media, dividido por n",
    why: "Describir la dispersión cuando los datos son toda la población",
    formula: "σ² = suma de (xi − x̄)² / n",
  },
  "desviacion-estandar": {
    what: "La dispersión típica, en las mismas unidades de los datos",
    why: "Decir cuánto se aleja en promedio un dato de la media",
    formula: "s = raíz cuadrada de s²",
  },
  "desviacion-estandar-poblacional": {
    what: "La dispersión típica poblacional, en las mismas unidades de los datos",
    why: "Decir cuánto se aleja en promedio un dato de la media en toda la población",
    formula: "σ = raíz cuadrada de σ²",
  },
  "coeficiente-de-variacion": {
    what: "La desviación estándar como porcentaje de la media",
    why: "Comparar dispersión entre variables con unidades distintas",
    formula: "CV = 100 · s / |x̄|",
  },
  ric: {
    what: "Longitud del 50 % central de los datos (Q3 − Q1)",
    why: "Medir dispersión sin que la afecten los valores extremos",
    formula: "RIC = Q3 − Q1",
  },
  "limite-inferior-tukey": {
    what: "El límite por debajo del cual un dato se considera atípico",
    why: "Señalar posibles errores o casos excepcionales por el extremo bajo",
    formula: "Q1 − 1,5 · RIC",
  },
  "limite-superior-tukey": {
    what: "El límite por encima del cual un dato se considera atípico",
    why: "Señalar posibles errores o casos excepcionales por el extremo alto",
    formula: "Q3 + 1,5 · RIC",
  },
  "valores-atipicos": {
    what: "Datos fuera de Q1 − 1,5·RIC y Q3 + 1,5·RIC",
    why: "Señalar posibles errores o casos excepcionales",
    formula: "xi < Q1 − 1,5·RIC o xi > Q3 + 1,5·RIC",
  },
  "tabla-de-contingencia": {
    what: "Cuenta los casos que combinan dos categorías",
    why: "Explorar si dos variables están relacionadas",
    formula: "n_ij; marginales n_i. y n_.j; total N",
  },
} as const satisfies Record<string, Explanation>;

/** Clave válida del catálogo de explicaciones. */
export type ExplanationKey = keyof typeof EXPLANATIONS;

/**
 * Devuelve la explicación de una métrica del catálogo.
 *
 * @param key - Clave de la métrica (por ejemplo `"media-aritmetica"`).
 */
export function explanationFor(key: ExplanationKey): Explanation {
  return EXPLANATIONS[key];
}
