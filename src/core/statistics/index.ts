/**
 * API pública del núcleo estadístico de StatLab.
 *
 * Todo el módulo es TypeScript puro y funciones sin efectos: no importa React,
 * Next, ni ninguna otra capa del proyecto.
 */
export * from "./types";
export { EXPLANATIONS, explanationFor } from "./explanations";
export type { ExplanationKey } from "./explanations";
export { makeMetric, makeKeyedMetric, unavailableMetric } from "./metric";

export {
  neumaierSum,
  rawMean,
  welford,
  ascending,
  sortAscending,
  epsEq,
  DEFAULT_EPSILON,
  isFiniteNumber,
  checkSample,
  finiteOrNull,
  REASONS,
  quantile,
} from "./numeric";
export type { WelfordAccumulator, SampleCheck } from "./numeric";

export {
  buildIntervals,
  classIndexOf,
  computeClassCount,
  computeIntervalLength,
  ceilToPrecision,
  detectDecimals,
  MIN_CLASSES,
  MAX_CLASSES,
} from "./grouping";
export type { GroupingPlan, IntervalClass, ClassCountResult } from "./grouping";

export {
  computeSimpleFrequencyTable,
  computeGroupedFrequencyTable,
  DEFAULT_FREQUENCY_OPTIONS,
} from "./frequency";
export type { SimpleFrequencyParams, GroupedFrequencyParams } from "./frequency";

export {
  arithmeticMean,
  weightedMean,
  geometricMean,
  harmonicMean,
  groupedMean,
  median,
  groupedMedian,
  ordinalMedian,
  mode,
  groupedMode,
  computeCentralTendency,
  DEFAULT_CENTRAL_OPTIONS,
} from "./central-tendency";
export type { CentralTendencyParams } from "./central-tendency";

export {
  computeQuartiles,
  computeDeciles,
  computePercentiles,
  interquartileRange,
  computePosition,
  DEFAULT_POSITION_OPTIONS,
} from "./position";
export type { PositionParams } from "./position";

export {
  range,
  sampleVariance,
  populationVariance,
  standardDeviation,
  coefficientOfVariation,
  detectOutliers,
  computeVariability,
  DEFAULT_VARIABILITY_OPTIONS,
  CV_MEAN_EPSILON,
  TUKEY_FACTOR,
} from "./variability";
export type { OutlierReport, VariabilityParams } from "./variability";

export { computeContingencyTable } from "./contingency";
export type { ContingencyParams } from "./contingency";

export {
  runVariableAnalysis,
  DEFAULT_GROUPING_OPTIONS,
  DISTINCT_VALUES_THRESHOLD,
} from "./run-variable-analysis";
export type { VariableAnalysisInput } from "./run-variable-analysis";
