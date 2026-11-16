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
  CLASS_RULE_LABEL,
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

export {
  boxPlotSummary,
  kurtosis,
  percentileOfValue,
  skewness,
  SHAPE_REASONS,
  zScores,
} from "./shape";
export type { BoxPlotSummary } from "./shape";

export { lnGamma, regularizedBeta, tCdf, tQuantile, tTwoTailedP } from "./distributions";

export {
  averageRanks,
  completePairs,
  CONFIDENCE,
  pearson,
  predict,
  REGRESSION_REASONS,
  simpleRegression,
  spearman,
} from "./regression";
export type {
  Correlation,
  Interval,
  Prediction,
  RegressionFailure,
  RegressionRow,
  SimpleRegression,
} from "./regression";

export { computeContingencyTable } from "./contingency";
export type { ContingencyParams } from "./contingency";

export {
  runVariableAnalysis,
  DEFAULT_GROUPING_OPTIONS,
  DISTINCT_VALUES_THRESHOLD,
} from "./run-variable-analysis";
export type { VariableAnalysisInput } from "./run-variable-analysis";

export {
  categoricalSteps,
  ALPHA,
  clipStepRows,
  contingencySteps,
  correlationStrength,
  interpretCorrelation,
  interpretPrediction,
  interpretRegression,
  regressionSteps,
  describeShape,
  groupingStep,
  locateValue,
  SHAPE_MIN_N,
  interpretCategorical,
  interpretContingency,
  ASSOCIATION_GAP,
  interpretQuantitative,
  quantitativeSteps,
  formatCount,
  formatShare,
  formatValue,
  narrativeDecimals,
  SMALL_SAMPLE,
  STEP_TABLE_MAX_ROWS,
} from "./interpretation";
export type { CategoryCount, LocatedValue } from "./interpretation";
