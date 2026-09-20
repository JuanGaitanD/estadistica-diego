/**
 * API pública del asistente (wizard) de StatLab.
 *
 * `src/app` solo necesita `Wizard`; el resto se exporta para tests y para
 * reutilizar el estado desde otros módulos de `features`.
 */
export { Wizard } from "./wizard";
export { useWizardStore } from "./store/wizard-store";
export type { WizardActions, WizardStore } from "./store/wizard-store";
export { WIZARD_STEPS, DEFAULT_CALCULATION, DEFAULT_IMPORT_OPTIONS } from "./model/types";
export type {
  CalculationSelection,
  ColumnConfig,
  DecimalChoice,
  ImportOptions,
  StepIndex,
  StepValidation,
  WizardState,
} from "./model/types";
export { canProceed, parsePercentiles } from "./model/validation";
export { buildAnalysisRequest, chartElementId } from "./model/build-request";
export { usualSelection } from "./model/usual-selection";
export { SAMPLE_DATA_TEXT, SAMPLE_DATA_NAME } from "./model/sample-dataset";
