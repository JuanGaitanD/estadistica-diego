export { completePairs, CONFIDENCE, predict, REGRESSION_REASONS, simpleRegression } from "./simple";
export type {
  Interval,
  Prediction,
  RegressionFailure,
  RegressionRow,
  SimpleRegression,
} from "./simple";
export { averageRanks, pearson, spearman } from "./correlation";
export type { Correlation } from "./correlation";
export { leastSquares } from "./least-squares";
export type { LeastSquares } from "./least-squares";
export {
  compareDegrees,
  dummyCode,
  interpretMultiple,
  MULTIPLE_REASONS,
  multipleRegression,
  multipleSteps,
  polynomialRegression,
  predictMultiple,
} from "./multiple";
export type {
  Coefficient,
  DummyInfo,
  MultipleFailure,
  MultipleRegression,
  Predictor,
} from "./multiple";
export {
  confusionMatrix,
  formatOdds,
  interpretLogistic,
  LOGISTIC_REASONS,
  logisticRegression,
  logisticSteps,
  predictLogistic,
} from "./logistic";
export type {
  Confusion,
  LogisticCoefficient,
  LogisticFailure,
  LogisticIteration,
  LogisticRegression,
} from "./logistic";
