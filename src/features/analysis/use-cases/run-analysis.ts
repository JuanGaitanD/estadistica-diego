/**
 * Caso de uso puro: ejecutar un `AnalysisRequest` sobre un `Dataset`.
 *
 * Reglas (docs/02-arquitectura.md §7 y docs/01-requisitos.md §2.1):
 * - Nunca lanza por un cálculo imposible: lo devuelve como "no disponible" con el
 *   motivo en español, para que la pantalla de resultados lo explique.
 * - No formatea ni redondea: eso ocurre solo en la capa de presentación (RNF-05).
 * - No conoce el store ni React; se puede probar en Node puro.
 *
 * Rendimiento (RNF-06): el trabajo pesado es `runVariableAnalysis`, que ordena una
 * sola vez por variable (el array ordenado se reutiliza en posición, variabilidad y
 * mínimo/máximo) y recorre los datos un número constante de veces. Además, cuando la
 * variable se agrupa en intervalos no se calcula la tabla de valores únicos, que con
 * datos continuos tendría tantas filas como datos.
 *
 * Medición en este repositorio (`run-analysis.robustness.test.ts`, Windows 11, Node 22):
 * el peor caso razonable —50 000 filas, 4 variables, todos los bloques activos con
 * deciles, percentiles, agrupación y atípicos— tarda unos 500-630 ms en el hilo
 * principal. Un análisis típico (1-2 variables) queda holgadamente por debajo. El paso
 * de resultados pinta antes un esqueleto de carga, así que la interfaz no se congela
 * sin aviso. Si en el futuro se pidieran los percentiles "todos" sobre muchas variables
 * y se superara el presupuesto, el punto de corte natural sería mover `runAnalysis`
 * completo a un Web Worker: su entrada y su salida son datos serializables.
 */
import type { CellValue, Column, Dataset, DatasetWarning } from "@/core/data";
import {
  computeContingencyTable,
  runVariableAnalysis,
  type CentralTendencyOptions,
  type FrequencyRow,
  type ObservedValue,
  type PositionOptions,
  type VariabilityOptions,
} from "@/core/statistics";

import type {
  AnalysisRequest,
  CentralTendencyRequestOptions,
  AnalysisResult,
  AnalysisWarning,
  AnalyzedContingency,
  AnalyzedVariable,
  ApplicabilityMap,
  CalculationKey,
  UnavailableCalculation,
  VariableAnalysisRequest,
} from "../model/types";
import { CALCULATION_LABELS, getApplicability } from "./applicability";

/** Opciones de ejecución; permiten fijar identificador y fecha en los tests. */
export interface RunAnalysisOptions {
  readonly requestId?: string;
  /** Fecha ISO-8601 del cálculo. */
  readonly computedAt?: string;
}

function newId(): string {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  const uuid = cryptoApi?.randomUUID?.();
  return uuid ?? `analisis-${Date.now()}`;
}

/** Índices de fila descartados cuando la política es "excluir fila completa". */
function rowsToDrop(dataset: Dataset, columns: readonly Column[]): ReadonlySet<number> {
  const dropped = new Set<number>();
  for (let row = 0; row < dataset.rowCount; row += 1) {
    if (columns.some((column) => (column.values[row] ?? null) === null)) dropped.add(row);
  }
  return dropped;
}

function valuesOf(column: Column, dropped: ReadonlySet<number>): (ObservedValue | null)[] {
  const out: (ObservedValue | null)[] = [];
  column.values.forEach((value: CellValue, index: number) => {
    if (dropped.has(index)) return;
    out.push(value);
  });
  return out;
}

/** Etiqueta de la clase a la que pertenece un valor, según la tabla agrupada. */
function classLabelOf(value: number, rows: readonly FrequencyRow[]): string | null {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row === undefined || row.lowerBound === undefined || row.upperBound === undefined) continue;
    const isLast = index === rows.length - 1;
    const inside = isLast
      ? value >= row.lowerBound && value <= row.upperBound
      : value >= row.lowerBound && value < row.upperBound;
    if (inside) return row.label;
  }
  return null;
}

interface EffectiveRequest {
  readonly request: VariableAnalysisRequest;
  readonly unavailable: UnavailableCalculation[];
}

function disable(unavailable: UnavailableCalculation[], key: CalculationKey, reason: string): void {
  if (unavailable.some((entry) => entry.key === key)) return;
  unavailable.push({ key, label: CALCULATION_LABELS[key], reason });
}

/**
 * Aplica la matriz de aplicabilidad a lo que pidió la persona usuaria: apaga lo
 * que no aplica y lo registra como "no disponible" con su motivo.
 */
function applyApplicability(
  request: VariableAnalysisRequest,
  applicability: ApplicabilityMap,
): EffectiveRequest {
  const unavailable: UnavailableCalculation[] = [];

  const grouping = { ...request.grouping };
  if (grouping.enabled && !applicability["frecuencias-agrupadas"].ok) {
    grouping.enabled = false;
    disable(unavailable, "frecuencias-agrupadas", applicability["frecuencias-agrupadas"].reason);
  }

  const frequency = { ...request.frequency };
  if (frequency.showCumulative && !applicability["frecuencia-acumulada"].ok) {
    frequency.showCumulative = false;
    disable(unavailable, "frecuencia-acumulada", applicability["frecuencia-acumulada"].reason);
  }
  if (frequency.showClassMark && !grouping.enabled) {
    frequency.showClassMark = false;
  }

  // Cada interruptor de tendencia central se apaga si su cálculo no aplica al
  // tipo de variable. Se escribe campo a campo (en lugar de indexar por clave)
  // para que TypeScript compruebe que no falta ninguno.
  const keep = (enabled: boolean, key: CalculationKey): boolean => {
    if (!enabled) return false;
    if (applicability[key].ok) return true;
    disable(unavailable, key, applicability[key].reason);
    return false;
  };
  const central: CentralTendencyRequestOptions = {
    ...request.central,
    arithmetic: keep(request.central.arithmetic, "media-aritmetica"),
    weighted: keep(request.central.weighted, "media-ponderada"),
    geometric: keep(request.central.geometric, "media-geometrica"),
    harmonic: keep(request.central.harmonic, "media-armonica"),
    median: keep(request.central.median, "mediana"),
    mode: keep(request.central.mode, "moda"),
  };

  const position: PositionOptions = { ...request.position };
  const wantsPosition =
    position.quartiles ||
    position.deciles ||
    position.percentiles === "todos" ||
    position.percentiles.length > 0;
  if (!applicability.cuantiles.ok && wantsPosition) {
    disable(unavailable, "cuantiles", applicability.cuantiles.reason);
  }
  const positionEffective: PositionOptions = applicability.cuantiles.ok
    ? position
    : { ...position, quartiles: false, deciles: false, percentiles: [] };

  const requested = request.variability;
  const varianceOk = applicability.varianza.ok;
  const ricOk = applicability.ric.ok;
  if (
    !varianceOk &&
    (requested.sampleVariance ||
      requested.populationVariance ||
      requested.standardDeviation ||
      requested.coefficientOfVariation)
  ) {
    disable(unavailable, "varianza", applicability.varianza.reason);
  }
  if (!ricOk && (requested.iqr || requested.outliers)) {
    disable(unavailable, "ric", applicability.ric.reason);
  }
  const variability: VariabilityOptions = {
    range: keep(requested.range, "rango"),
    sampleVariance: varianceOk && requested.sampleVariance,
    populationVariance: varianceOk && requested.populationVariance,
    standardDeviation: varianceOk && requested.standardDeviation,
    coefficientOfVariation: varianceOk && requested.coefficientOfVariation,
    iqr: ricOk && requested.iqr,
    outliers: ricOk && requested.outliers,
  };

  return {
    request: {
      variableId: request.variableId,
      grouping,
      frequency,
      central,
      position: positionEffective,
      variability,
    },
    unavailable,
  };
}

interface ResolvedWeights {
  readonly weights?: readonly number[];
  readonly reason?: string;
}

/**
 * Resuelve los pesos de la media ponderada alineándolos con los datos válidos de
 * la variable analizada (un peso por dato que entra al cálculo).
 */
function resolveWeights(
  request: VariableAnalysisRequest,
  values: readonly (ObservedValue | null)[],
  columnsById: ReadonlyMap<string, Column>,
  dropped: ReadonlySet<number>,
): ResolvedWeights {
  if (!request.central.weighted) return {};
  const source = request.central.weightsSource;
  if (source === undefined) {
    return { reason: "Elige de dónde salen los pesos para poder calcular la media ponderada." };
  }
  if (source.kind === "frecuencias") {
    return {
      reason:
        "Los pesos por frecuencias solo tienen sentido con la variable agrupada: en ese caso ya se calcula la media de datos agrupados.",
    };
  }
  const numericPositions: number[] = [];
  values.forEach((value, index) => {
    if (typeof value === "number" && Number.isFinite(value)) numericPositions.push(index);
  });

  if (source.kind === "manual") {
    if (source.weights.length !== numericPositions.length) {
      return {
        reason: `Hacen falta ${numericPositions.length} pesos, uno por dato válido, y escribiste ${source.weights.length}.`,
      };
    }
    return { weights: source.weights };
  }

  const weightColumn = columnsById.get(source.variableId);
  if (weightColumn === undefined) {
    return { reason: "La columna elegida como pesos ya no está en los datos." };
  }
  const weightValues = valuesOf(weightColumn, dropped);
  const weights: number[] = [];
  for (const position of numericPositions) {
    const raw = weightValues[position];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return {
        reason: `La columna "${weightColumn.variable.name}" no tiene un peso numérico para cada dato válido.`,
      };
    }
    weights.push(raw);
  }
  return { weights };
}

function datasetWarningsFor(
  warnings: readonly DatasetWarning[],
  variableIds: ReadonlySet<string>,
): AnalysisWarning[] {
  return warnings
    .filter((warning) => warning.variableId === undefined || variableIds.has(warning.variableId))
    .map((warning) => ({
      code: warning.code,
      ...(warning.variableId !== undefined ? { variableId: warning.variableId } : {}),
      message: warning.message,
    }));
}

/**
 * Ejecuta el análisis completo: extrae los vectores del dataset, aplica la matriz
 * de aplicabilidad, llama al núcleo estadístico y reúne los avisos en español.
 *
 * @param dataset - Datos ya importados y clasificados.
 * @param request - Qué variables y qué cálculos pidió la persona usuaria.
 * @param options - Identificador y fecha (para resultados deterministas en tests).
 * @returns El resultado completo, sin ningún formateo de presentación.
 */
export function runAnalysis(
  dataset: Dataset,
  request: AnalysisRequest,
  options: RunAnalysisOptions = {},
): AnalysisResult {
  const columnsById = new Map(dataset.columns.map((column) => [column.variable.id, column]));
  const warnings: AnalysisWarning[] = [];

  const requestedIds = new Set<string>();
  for (const variable of request.variables) requestedIds.add(variable.variableId);
  for (const cross of request.contingencies) {
    requestedIds.add(cross.rowVariableId);
    requestedIds.add(cross.columnVariableId);
  }

  const involvedColumns = [...requestedIds]
    .map((id) => columnsById.get(id))
    .filter((column): column is Column => column !== undefined);

  const dropped =
    request.missingPolicy === "excluir-fila-completa"
      ? rowsToDrop(dataset, involvedColumns)
      : new Set<number>();
  if (dropped.size > 0) {
    warnings.push({
      code: "faltantes",
      message: `Se excluyeron ${dropped.size} fila(s) completas porque les faltaba algún dato de las variables analizadas.`,
    });
  }

  const variables: AnalyzedVariable[] = [];
  const groupedRowsByVariable = new Map<string, readonly FrequencyRow[]>();

  for (const variableRequest of request.variables) {
    const column = columnsById.get(variableRequest.variableId);
    if (column === undefined) {
      warnings.push({
        code: "variable-inexistente",
        variableId: variableRequest.variableId,
        message: `La variable "${variableRequest.variableId}" ya no está en los datos; se omitió del análisis.`,
      });
      continue;
    }

    const kind = column.variable.kind;
    const applicability = getApplicability(kind, variableRequest.grouping.enabled);
    const effective = applyApplicability(variableRequest, applicability);
    const values = valuesOf(column, dropped);
    const resolvedWeights = resolveWeights(effective.request, values, columnsById, dropped);
    if (resolvedWeights.reason !== undefined) {
      disable(effective.unavailable, "media-ponderada", resolvedWeights.reason);
    }

    const centralOptions: CentralTendencyOptions = {
      arithmetic: effective.request.central.arithmetic,
      weighted: effective.request.central.weighted && resolvedWeights.weights !== undefined,
      geometric: effective.request.central.geometric,
      harmonic: effective.request.central.harmonic,
      median: effective.request.central.median,
      mode: effective.request.central.mode,
    };

    const analysis = runVariableAnalysis({
      variableId: column.variable.id,
      kind,
      values,
      ...(column.variable.categoryOrder !== undefined
        ? { categoryOrder: column.variable.categoryOrder }
        : {}),
      grouping: effective.request.grouping,
      frequency: effective.request.frequency,
      central: centralOptions,
      position: effective.request.position,
      variability: effective.request.variability,
      ...(resolvedWeights.weights !== undefined ? { weights: resolvedWeights.weights } : {}),
    });

    if (analysis.groupedFrequency !== undefined) {
      groupedRowsByVariable.set(column.variable.id, analysis.groupedFrequency.rows);
    }

    for (const entry of effective.unavailable) {
      warnings.push({
        code: "no-aplicable",
        variableId: column.variable.id,
        informative: true,
        message: `${entry.label} no se calculó en "${column.variable.name}": ${entry.reason}`,
        shortMessage: `${entry.label}: ${entry.reason}`,
      });
    }

    variables.push({
      variableId: column.variable.id,
      variableName: column.variable.name,
      kind,
      ...(column.variable.unit !== undefined ? { unit: column.variable.unit } : {}),
      grouped: analysis.groupedFrequency !== undefined,
      request: effective.request,
      analysis,
      applicability,
      unavailable: effective.unavailable,
    });
  }

  const contingencies: AnalyzedContingency[] = [];
  for (const cross of request.contingencies) {
    const rowColumn = columnsById.get(cross.rowVariableId);
    const columnColumn = columnsById.get(cross.columnVariableId);
    if (rowColumn === undefined || columnColumn === undefined) {
      const missingId = rowColumn === undefined ? cross.rowVariableId : cross.columnVariableId;
      warnings.push({
        code: "variable-inexistente",
        variableId: missingId,
        message: `No se pudo cruzar: la variable "${missingId}" ya no está en los datos.`,
      });
      contingencies.push({
        request: cross,
        rowVariableName: rowColumn?.variable.name ?? cross.rowVariableId,
        columnVariableName: columnColumn?.variable.name ?? cross.columnVariableId,
        table: null,
        unavailableReason: `La variable "${missingId}" ya no está en los datos.`,
      });
      continue;
    }

    const asCategories = (column: Column): (ObservedValue | null)[] => {
      const raw = valuesOf(column, dropped);
      const groupedRows = groupedRowsByVariable.get(column.variable.id);
      if (column.variable.kind === "continua" && groupedRows !== undefined) {
        return raw.map((value) =>
          typeof value === "number" ? classLabelOf(value, groupedRows) : value,
        );
      }
      return raw;
    };

    for (const column of [rowColumn, columnColumn]) {
      const grouped = groupedRowsByVariable.has(column.variable.id);
      const verdict = getApplicability(column.variable.kind, grouped).contingencia;
      if (verdict.level === "advertencia") {
        warnings.push({
          code: "no-aplicable",
          variableId: column.variable.id,
          informative: true,
          message: `La variable "${column.variable.name}" se cruzó sin agrupar: ${verdict.reason}`,
          shortMessage: `Se cruzó sin agrupar: ${verdict.reason}`,
        });
      }
    }

    const table = computeContingencyTable({
      rowVariableId: rowColumn.variable.id,
      columnVariableId: columnColumn.variable.id,
      rowValues: asCategories(rowColumn),
      columnValues: asCategories(columnColumn),
      ...(rowColumn.variable.categoryOrder !== undefined
        ? { rowOrder: rowColumn.variable.categoryOrder }
        : {}),
      ...(columnColumn.variable.categoryOrder !== undefined
        ? { columnOrder: columnColumn.variable.categoryOrder }
        : {}),
    });
    if (table.excluded > 0) {
      warnings.push({
        code: "faltantes",
        message: `En el cruce de "${rowColumn.variable.name}" y "${columnColumn.variable.name}" se excluyeron ${table.excluded} fila(s) por datos faltantes.`,
      });
    }

    contingencies.push({
      request: cross,
      rowVariableName: rowColumn.variable.name,
      columnVariableName: columnColumn.variable.name,
      table,
    });
  }

  const charts = request.charts.filter((chart) => {
    const exists =
      columnsById.has(chart.variableId) &&
      (chart.secondVariableId === undefined || columnsById.has(chart.secondVariableId));
    if (!exists) {
      warnings.push({
        code: "variable-inexistente",
        variableId: chart.variableId,
        message: `Se omitió la gráfica "${chart.title}" porque su variable ya no está en los datos.`,
      });
    }
    return exists;
  });

  warnings.unshift(...datasetWarningsFor(dataset.warnings, requestedIds));

  return {
    requestId: options.requestId ?? newId(),
    datasetId: request.datasetId,
    computedAt: options.computedAt ?? new Date().toISOString(),
    totalRows: dataset.rowCount,
    variables,
    contingencies,
    charts,
    warnings,
  };
}
