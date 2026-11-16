import type { VariableKind } from "@/core/statistics";

/**
 * Nota de tipos: el core no exporta un `VariableKind` distinto para
 * "cualitativa/cuantitativa"; reutilizamos el `VariableKind` de
 * `src/core/statistics/types.ts` ("nominal" | "ordinal" | "discreta" | "continua"),
 * que es el mismo usado en `src/core/data`.
 */
export type ChartKind = "pie" | "bar" | "pareto" | "box" | "polygon" | "ogive";

/** Todos los tipos de gráfica, en el orden en que se ofrecen. */
export const CHART_KINDS: readonly ChartKind[] = [
  "pie",
  "bar",
  "pareto",
  "box",
  "polygon",
  "ogive",
];

interface ChartRegistryEntry {
  readonly label: string;
  readonly description: string;
}

export const CHART_REGISTRY: Record<ChartKind, ChartRegistryEntry> = {
  pie: {
    label: "Gráfico circular",
    description: "Reparte un círculo según la participación de cada categoría.",
  },
  bar: {
    label: "Barras o histograma",
    description:
      "Compara la frecuencia de cada categoría; con clases es un histograma de barras pegadas.",
  },
  pareto: {
    label: "Diagrama de Pareto",
    description:
      "Ordena las categorías de la más a la menos frecuente y acumula el porcentaje: muestra qué pocas reúnen la mayoría.",
  },
  box: {
    label: "Caja y bigotes",
    description: "Muestra la mitad central de los datos, la mediana, el recorrido y los atípicos.",
  },
  polygon: {
    label: "Polígono de frecuencias",
    description: "Une las marcas de clase para mostrar la forma de la distribución.",
  },
  ogive: {
    label: "Ojiva",
    description:
      "Muestra la frecuencia acumulada para leer cuántos datos hay por debajo de un valor.",
  },
};

export interface AppliesToResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/**
 * Matriz de aplicabilidad de gráficas por tipo de variable y agrupamiento
 * (docs/05-diseno.md §6 y docs/01-requisitos.md §2.2).
 */
export function appliesTo(
  kind: ChartKind,
  variableKind: VariableKind,
  isGrouped: boolean,
): AppliesToResult {
  switch (kind) {
    case "pie": {
      if (variableKind === "nominal" || variableKind === "ordinal") return { ok: true };
      return {
        ok: false,
        reason: "El gráfico circular aplica a variables cualitativas (nominales u ordinales).",
      };
    }
    case "bar": {
      if (variableKind === "continua" && !isGrouped) {
        return {
          ok: false,
          reason:
            "Las variables continuas deben agruparse en clases antes de graficarse como barras (histograma).",
        };
      }
      return { ok: true };
    }
    case "pareto": {
      if (variableKind === "nominal") return { ok: true };
      return {
        ok: false,
        reason:
          "El diagrama de Pareto reordena las categorías por frecuencia: aplica a variables nominales, donde no hay un orden propio.",
      };
    }
    case "box": {
      if (variableKind === "discreta" || variableKind === "continua") return { ok: true };
      return {
        ok: false,
        reason: "El diagrama de caja necesita números: aplica a variables cuantitativas.",
      };
    }
    case "polygon": {
      if (variableKind === "nominal") {
        return {
          ok: false,
          reason: "El polígono de frecuencias no aplica a variables cualitativas nominales.",
        };
      }
      if (variableKind === "ordinal") {
        return {
          ok: false,
          reason:
            "El polígono de frecuencias no es recomendable para variables ordinales; usa un gráfico de barras.",
        };
      }
      if (!isGrouped) {
        return {
          ok: false,
          reason:
            "El polígono de frecuencias requiere una tabla de frecuencias agrupada (con marca de clase).",
        };
      }
      return { ok: true };
    }
    case "ogive": {
      if (variableKind === "nominal") {
        return {
          ok: false,
          reason:
            "La ojiva requiere un orden entre categorías o clases; no aplica a variables nominales.",
        };
      }
      if (!isGrouped) {
        return {
          ok: false,
          reason:
            "La ojiva requiere una tabla de frecuencias agrupada, con límites de clase y acumulados.",
        };
      }
      return { ok: true };
    }
    default:
      return { ok: false, reason: "Tipo de gráfica desconocido." };
  }
}
