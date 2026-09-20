import { arithmeticMean, geometricMean, groupedMean, harmonicMean, weightedMean } from "./means";
import { groupedMedian, median } from "./median";
import { groupedMode, mode } from "./mode";
import type { CentralTendencyOptions, CentralTendencyResult, FrequencyRow, Metric } from "../types";

/** Opciones de tendencia central por defecto (RF-20, RF-21). */
export const DEFAULT_CENTRAL_OPTIONS: CentralTendencyOptions = {
  arithmetic: true,
  weighted: false,
  geometric: false,
  harmonic: false,
  median: true,
  mode: true,
};

/** Parámetros del bloque de tendencia central. */
export interface CentralTendencyParams {
  readonly variableId: string;
  readonly values: readonly number[];
  readonly options?: CentralTendencyOptions;
  /** Pesos para la media ponderada, uno por dato. */
  readonly weights?: readonly number[];
  /** Filas de la tabla agrupada, si la variable está agrupada en intervalos. */
  readonly groupedRows?: readonly FrequencyRow[];
  readonly intervalLength?: number;
}

/**
 * Calcula el bloque de tendencia central de una variable cuantitativa:
 * media aritmética, ponderada, geométrica y armónica, mediana y moda, más las
 * versiones de datos agrupados cuando hay intervalos (ADR-003 §3).
 *
 * @param params - Variable, valores y opciones.
 * @returns Las métricas seleccionadas, cada una con su explicación.
 */
export function computeCentralTendency(params: CentralTendencyParams): CentralTendencyResult {
  const options = params.options ?? DEFAULT_CENTRAL_OPTIONS;
  const metrics: Metric[] = [];
  if (options.arithmetic) metrics.push(arithmeticMean(params.values));
  if (options.weighted) metrics.push(weightedMean(params.values, params.weights ?? []));
  if (options.geometric) metrics.push(geometricMean(params.values));
  if (options.harmonic) metrics.push(harmonicMean(params.values));
  if (options.median) metrics.push(median(params.values));

  const rows = params.groupedRows;
  const length = params.intervalLength ?? 0;
  const grouped =
    rows !== undefined && rows.length > 0
      ? {
          groupedMean: groupedMean(rows),
          groupedMedian: groupedMedian(rows, length),
          groupedMode: groupedMode(rows, length),
        }
      : {};

  return {
    variableId: params.variableId,
    metrics,
    mode: mode(params.values),
    ...grouped,
  };
}
