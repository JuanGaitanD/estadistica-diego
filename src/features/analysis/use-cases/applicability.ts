/**
 * Matriz de aplicabilidad por tipo de variable (docs/01-requisitos.md §2.1).
 *
 * El wizard la usa para deshabilitar opciones **sin ocultarlas**, mostrando el
 * motivo; `runAnalysis` la usa para degradar a "no disponible" cualquier cálculo
 * pedido que no aplique, en lugar de lanzar.
 */
import type { Applicability, ApplicabilityMap, CalculationKey, VariableKind } from "../model/types";

const ok = (reason: string): Applicability => ({ ok: true, level: "ok", reason });
const adv = (reason: string): Applicability => ({ ok: true, level: "advertencia", reason });
const no = (reason: string): Applicability => ({ ok: false, level: "no", reason });

/** Etiqueta en español de cada cálculo, para los mensajes de "no disponible". */
export const CALCULATION_LABELS: Readonly<Record<CalculationKey, string>> = {
  frecuencias: "Tabla de frecuencias",
  "frecuencias-agrupadas": "Distribución agrupada en intervalos",
  "frecuencia-acumulada": "Frecuencias acumuladas",
  "minimo-maximo": "Mínimo y máximo",
  moda: "Moda",
  mediana: "Mediana",
  "media-aritmetica": "Media aritmética",
  "media-ponderada": "Media ponderada",
  "media-geometrica": "Media geométrica",
  "media-armonica": "Media armónica",
  cuantiles: "Cuartiles, deciles y percentiles",
  rango: "Rango",
  varianza: "Varianza, desviación estándar y CV",
  ric: "Rango intercuartílico (RIC)",
  contingencia: "Tabla de contingencia",
};

const CUALITATIVA_SIN_NUMEROS =
  "Solo se puede calcular con variables cuantitativas: una categoría no se puede sumar ni promediar.";
const NOMINAL_SIN_ORDEN =
  "Las categorías de una variable nominal no tienen un orden, así que este cálculo no tendría sentido.";

/**
 * Devuelve, para cada cálculo, si aplica a un tipo de variable y por qué.
 *
 * @param kind - Tipo de la variable.
 * @param isGrouped - Si la variable está agrupada en intervalos.
 */
export function getApplicability(kind: VariableKind, isGrouped = false): ApplicabilityMap {
  const cuantitativa = kind === "discreta" || kind === "continua";

  const frecuencias =
    kind === "continua" && !isGrouped
      ? adv(
          "Con muchos valores distintos la tabla de valores únicos se vuelve larga: conviene agrupar en intervalos.",
        )
      : ok("Cuenta cuántas veces aparece cada valor o categoría.");

  const agrupadas = (() => {
    if (!cuantitativa) {
      return no("Solo las variables cuantitativas se pueden agrupar en intervalos.");
    }
    if (kind === "discreta") {
      return adv(
        "En una variable discreta agrupar solo vale la pena si hay muchos valores distintos (más de 15).",
      );
    }
    return ok("Resume muchos valores distintos en clases comparables entre sí.");
  })();

  const acumulada =
    kind === "nominal" ? no(NOMINAL_SIN_ORDEN) : ok('Responde a "¿cuántos datos hay hasta aquí?".');

  const minimoMaximo = (() => {
    if (kind === "nominal") {
      return no(
        "En una variable nominal no hay un valor mayor ni menor; se leen como la categoría más y menos frecuente.",
      );
    }
    if (kind === "ordinal") {
      return ok("Son la categoría de menor y de mayor rango según el orden que declaraste.");
    }
    return ok("Delimitan el recorrido de los datos y ayudan a detectar errores de captura.");
  })();

  const mediana = (() => {
    if (kind === "nominal") return no(NOMINAL_SIN_ORDEN);
    if (kind === "ordinal") {
      return ok("En una variable ordinal la mediana es la categoría que queda en la mitad.");
    }
    return ok("Es el valor que parte los datos ordenados en dos mitades.");
  })();

  const mediaSimple = cuantitativa
    ? ok("Resume el centro de los datos repartiendo el total entre todos.")
    : no(CUALITATIVA_SIN_NUMEROS);

  const ponderada = cuantitativa
    ? ok("Útil cuando cada dato pesa distinto (notas por créditos, precios por cantidad).")
    : no(CUALITATIVA_SIN_NUMEROS);

  const geometrica = cuantitativa
    ? adv("Solo está definida si todos los valores son mayores que cero.")
    : no(CUALITATIVA_SIN_NUMEROS);

  const armonica = cuantitativa
    ? adv("Solo está definida si ningún valor es cero; se recomienda con valores positivos.")
    : no(CUALITATIVA_SIN_NUMEROS);

  const cuantiles = (() => {
    if (kind === "nominal") return no(NOMINAL_SIN_ORDEN);
    if (kind === "ordinal") {
      return adv("En una variable ordinal se calculan por posición, no como un número exacto.");
    }
    return ok("Ubican un dato respecto al grupo y describen la dispersión.");
  })();

  const contingencia = (() => {
    if (kind !== "continua") {
      return ok("Cuenta los casos que combinan dos categorías, para ver si se relacionan.");
    }
    return isGrouped
      ? ok("Al estar agrupada en intervalos, la variable continua ya se puede cruzar.")
      : adv("Una variable continua debe agruparse en intervalos antes de cruzarla.");
  })();

  return {
    frecuencias,
    "frecuencias-agrupadas": agrupadas,
    "frecuencia-acumulada": acumulada,
    "minimo-maximo": minimoMaximo,
    moda: ok(
      "Es el valor o la categoría que más se repite; el único promedio válido en datos cualitativos.",
    ),
    mediana,
    "media-aritmetica": mediaSimple,
    "media-ponderada": ponderada,
    "media-geometrica": geometrica,
    "media-armonica": armonica,
    cuantiles,
    rango: cuantitativa
      ? ok("Diferencia entre el máximo y el mínimo.")
      : no(CUALITATIVA_SIN_NUMEROS),
    varianza: cuantitativa
      ? ok("Miden cuánto se alejan los datos de su media.")
      : no(CUALITATIVA_SIN_NUMEROS),
    ric:
      kind === "nominal"
        ? no(NOMINAL_SIN_ORDEN)
        : kind === "ordinal"
          ? adv("En una variable ordinal el RIC se obtiene por posición de las categorías.")
          : ok("Mide la dispersión del 50 % central, sin que la afecten los valores extremos."),
    contingencia,
  };
}
