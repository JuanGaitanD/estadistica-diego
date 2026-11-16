/** Regresión lineal simple y correlación (M6). */
export { RegressionPanel, type RegressionPanelProps } from "./components/regression-panel";
export { runRegression } from "./use-cases/run-regression";
export type { NumericColumn, RegressionAnalysis } from "./use-cases/run-regression";
export { regressionWorkbook } from "./use-cases/regression-workbook";
export { regressionReportItem } from "./use-cases/regression-report";
export { LogisticPanel, MultipleRegressionPanel } from "./components/model-panels";
export type { ModelColumn } from "./use-cases/design";
