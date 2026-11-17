export {
  categoricalSteps,
  clipStepRows,
  describeShape,
  groupingStep,
  interpretCategorical,
  interpretQuantitative,
  quantitativeSteps,
  SHAPE_MIN_N,
  SMALL_SAMPLE,
  STEP_TABLE_MAX_ROWS,
} from "./describe-variable";
export type { CategoryCount } from "./describe-variable";
export { ASSOCIATION_GAP, contingencySteps, interpretContingency } from "./describe-contingency";
export { formatCount, formatShare, formatValue, narrativeDecimals } from "./text";
export { locateValue } from "./locate-value";
export type { LocatedValue } from "./locate-value";
export {
  ALPHA,
  correlationStrength,
  interpretCorrelation,
  interpretPrediction,
  interpretRegression,
  regressionSteps,
  residualHistogram,
} from "./describe-regression";
