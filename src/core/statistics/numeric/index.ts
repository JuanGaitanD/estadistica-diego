export { neumaierSum, rawMean } from "./sum";
export { welford } from "./welford";
export type { WelfordAccumulator } from "./welford";
export { ascending, sortAscending, isSortedAscending, epsEq, DEFAULT_EPSILON } from "./compare";
export { isFiniteNumber, checkSample, finiteOrNull, REASONS } from "./validate";
export type { SampleCheck } from "./validate";
export { quantile } from "./quantile";
