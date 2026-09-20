import type { ComponentType } from "react";

import type { VariableKind } from "@/core/statistics";

import type { BarChartProps } from "./bar-chart";
import { BarChart } from "./bar-chart";
import type { FrequencyPolygonProps } from "./frequency-polygon";
import { FrequencyPolygon } from "./frequency-polygon";
import type { OgiveProps } from "./ogive";
import { Ogive } from "./ogive";
import type { PieChartProps } from "./pie-chart";
import { PieChart } from "./pie-chart";

/**
 * Nota de tipos: el core no exporta un `VariableKind` distinto para
 * "cualitativa/cuantitativa"; reutilizamos el `VariableKind` de
 * `src/core/statistics/types.ts` ("nominal" | "ordinal" | "discreta" | "continua"),
 * que es el mismo usado en `src/core/data`.
 */
export type ChartKind = "pie" | "bar" | "polygon" | "ogive";

interface ChartRegistryEntry {
  readonly component: ComponentType<
    PieChartProps | BarChartProps | FrequencyPolygonProps | OgiveProps
  >;
  readonly label: string;
  readonly description: string;
}

export const CHART_REGISTRY: Record<ChartKind, ChartRegistryEntry> = {
  pie: {
    component: PieChart as ChartRegistryEntry["component"],
    label: "Gráfico circular",
    description: "Reparte un círculo según la participación de cada categoría.",
  },
  bar: {
    component: BarChart as ChartRegistryEntry["component"],
    label: "Gráfico de barras",
    description: "Compara la frecuencia de cada categoría o clase entre sí.",
  },
  polygon: {
    component: FrequencyPolygon as ChartRegistryEntry["component"],
    label: "Polígono de frecuencias",
    description: "Une las marcas de clase para mostrar la forma de la distribución.",
  },
  ogive: {
    component: Ogive as ChartRegistryEntry["component"],
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
