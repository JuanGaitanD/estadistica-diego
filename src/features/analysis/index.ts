/**
 * API pública del módulo de análisis de StatLab.
 *
 * - `model/`: contrato `AnalysisRequest` / `AnalysisResult` y su validación con zod.
 * - `use-cases/`: `runAnalysis` (puro) y `getApplicability` (matriz por tipo).
 * - `components/`: vistas de resultados, todas sin estado global.
 */
export * from "./model";
export { getApplicability, CALCULATION_LABELS } from "./use-cases/applicability";
export { runAnalysis } from "./use-cases/run-analysis";
export type { RunAnalysisOptions } from "./use-cases/run-analysis";
export {
  RESULT_SECTIONS,
  getResultSections,
  variableSectionId,
  contingencySectionId,
  SUMMARY_SECTION_ID,
} from "./use-cases/sections";
export type { VariableSectionKind } from "./use-cases/sections";

export { AnalysisSummary } from "./components/analysis-summary";
export type { AnalysisSummaryProps } from "./components/analysis-summary";
export { VariableResults } from "./components/variable-results";
export type { VariableResultsProps } from "./components/variable-results";
export {
  ContingencyTable,
  EXTREME_MAX_CLASS,
  EXTREME_MIN_CLASS,
} from "./components/contingency-table";
export type { ContingencyTableProps, ContingencyView } from "./components/contingency-table";
export { MetricExplanation, explanationText } from "./components/metric-explanation";
export type { MetricExplanationProps } from "./components/metric-explanation";
