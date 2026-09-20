"use client";

/**
 * Estado del asistente con Zustand.
 *
 * Decisión (RNF-14): **no** se usa el middleware `persist` para el dataset
 * completo. Guardar cada tecleo del profesor en `localStorage` sería lento y
 * guardaría datos personales sin que él lo pida. En su lugar, el dataset se
 * guarda una sola vez al importarlo y solo se recupera con el botón explícito
 * "Recuperar último análisis"; las preferencias se guardan aparte.
 */
import { create } from "zustand";

import type { ChartKind } from "@/components/charts";
import { inferVariableKind } from "@/core/data";
import type { Dataset, DatasetSource, NumberFormat, VariableKind } from "@/core/data";
import { runAnalysis } from "@/features/analysis";
import {
  ImportError,
  importFile,
  importPastedText,
  listAvailableSheets,
} from "@/infrastructure/import";
import { clearLastDataset, loadLastDataset, saveLastDataset } from "@/infrastructure/storage";

import { buildAnalysisRequest } from "../model/build-request";
import { SAMPLE_DATA_NAME, SAMPLE_DATA_TEXT } from "../model/sample-dataset";
import {
  DEFAULT_CALCULATION,
  DEFAULT_IMPORT_OPTIONS,
  type CalculationSelection,
  type ColumnConfig,
  type DecimalChoice,
  type ImportOptions,
  type StepIndex,
  type StepValidation,
  type WizardState,
} from "../model/types";
import { usualSelection } from "../model/usual-selection";
import { canProceed as canProceedPure } from "../model/validation";

/** Acciones del asistente. Todas son puras salvo las de importación. */
export interface WizardActions {
  goToStep: (step: StepIndex) => void;
  goNext: () => void;
  goBack: () => void;

  setPastedText: (text: string) => void;
  importText: (text?: string) => void;
  importSample: () => void;
  importFromFile: (file: File) => Promise<void>;
  setImportOption: <K extends keyof ImportOptions>(key: K, value: ImportOptions[K]) => void;
  clearImportError: () => void;

  renameColumn: (id: string, name: string) => void;
  setColumnKind: (id: string, kind: VariableKind) => void;
  toggleColumn: (id: string, include: boolean) => void;
  moveCategory: (id: string, index: number, direction: -1 | 1) => void;

  patchCalculation: (patch: Partial<CalculationSelection>) => void;
  toggleChart: (variableId: string, kind: ChartKind, selected: boolean) => void;
  selectUsual: () => void;

  computeResult: () => void;
  detectStoredDataset: () => void;
  recoverLastDataset: () => boolean;
  reset: () => void;
  canProceed: (step?: StepIndex) => StepValidation;
}

export type WizardStore = WizardState & WizardActions;

const INITIAL_STATE: WizardState = {
  step: 0,
  dataset: null,
  origin: null,
  sourceName: null,
  pastedText: "",
  importOptions: DEFAULT_IMPORT_OPTIONS,
  availableSheets: [],
  importError: null,
  isImporting: false,
  columns: [],
  calculation: DEFAULT_CALCULATION,
  result: null,
  isComputing: false,
  hasStoredDataset: false,
};

/** Traduce la elección de formato decimal de la UI al del núcleo. */
export function numberFormatOf(decimal: DecimalChoice): NumberFormat | undefined {
  if (decimal === "coma") return "es";
  if (decimal === "punto") return "en";
  return undefined;
}

/** Categorías distintas de una columna, en orden de aparición. */
function categoriesOf(values: readonly (string | number | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (value === null) continue;
    const label = String(value);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/** Configuración inicial de columnas a partir del dataset importado. */
export function columnsFromDataset(dataset: Dataset): ColumnConfig[] {
  return dataset.columns.map((column) => {
    const inference = inferVariableKind(column.values);
    return {
      id: column.variable.id,
      name: column.variable.name,
      kind: column.variable.kind,
      inferredKind: column.variable.kindInferred,
      inferredReason: inference.reason,
      include: true,
      categoryOrder: categoriesOf(column.values),
    };
  });
}

/** Estado derivado de un dataset recién importado (invalida pasos 2 a 4, RF-11). */
function stateForDataset(
  dataset: Dataset,
  origin: DatasetSource,
  sourceName: string | null,
): Partial<WizardState> {
  return {
    dataset,
    origin,
    sourceName,
    columns: columnsFromDataset(dataset),
    calculation: { ...DEFAULT_CALCULATION },
    result: null,
    importError: null,
    isImporting: false,
  };
}

function messageOf(error: unknown): string {
  if (error instanceof ImportError) return error.message;
  if (error instanceof Error) return error.message;
  return "No pudimos leer esos datos. Revisa el formato e inténtalo de nuevo.";
}

/** Clave de memoización del análisis: misma petición, mismo resultado. */
function requestKey(value: unknown): string {
  return JSON.stringify(value);
}

let lastRequestKey: string | null = null;

export const useWizardStore = create<WizardStore>()((set, get) => ({
  ...INITIAL_STATE,

  goToStep: (step) => set({ step }),

  goNext: () => {
    const state = get();
    if (state.step >= 3) return;
    if (!canProceedPure(state, state.step).ok) return;
    set({ step: (state.step + 1) as StepIndex });
  },

  goBack: () => {
    const state = get();
    if (state.step <= 0) return;
    set({ step: (state.step - 1) as StepIndex });
  },

  setPastedText: (text) => set({ pastedText: text }),

  importText: (text) => {
    const state = get();
    const source = text ?? state.pastedText;
    if (source.trim().length === 0) {
      set({ importError: "Todavía no hay datos cargados. Pega tus valores o sube un archivo." });
      return;
    }
    try {
      const numberFormat = numberFormatOf(state.importOptions.decimal);
      const dataset = importPastedText(source, {
        hasHeader: state.importOptions.hasHeader,
        ...(numberFormat ? { numberFormat } : {}),
      });
      saveLastDataset(dataset);
      set({ ...stateForDataset(dataset, "texto", null), pastedText: source, availableSheets: [] });
    } catch (error) {
      set({ importError: messageOf(error) });
    }
  },

  importSample: () => {
    set({
      pastedText: SAMPLE_DATA_TEXT,
      importOptions: { ...get().importOptions, hasHeader: true },
    });
    get().importText(SAMPLE_DATA_TEXT);
    set({ sourceName: SAMPLE_DATA_NAME });
  },

  importFromFile: async (file) => {
    set({ isImporting: true, importError: null });
    try {
      const options = get().importOptions;
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const sheets = isExcel ? await listAvailableSheets(file) : [];
      const sheetName =
        options.sheetName !== null && sheets.includes(options.sheetName) ? options.sheetName : null;
      const numberFormat = numberFormatOf(options.decimal);
      const dataset = await importFile(file, {
        hasHeader: options.hasHeader,
        ...(sheetName !== null ? { sheetName } : {}),
        ...(numberFormat ? { numberFormat } : {}),
      });
      saveLastDataset(dataset);
      set({
        ...stateForDataset(dataset, isExcel ? "xlsx" : "csv", file.name),
        availableSheets: sheets,
        importOptions: { ...options, sheetName },
      });
    } catch (error) {
      set({ importError: messageOf(error), isImporting: false });
    }
  },

  setImportOption: (key, value) => {
    set({ importOptions: { ...get().importOptions, [key]: value } });
    const state = get();
    if (state.origin === "texto" && state.pastedText.trim().length > 0) {
      state.importText(state.pastedText);
    }
  },

  clearImportError: () => set({ importError: null }),

  renameColumn: (id, name) =>
    set({
      columns: get().columns.map((column) => (column.id === id ? { ...column, name } : column)),
      result: null,
    }),

  setColumnKind: (id, kind) =>
    set({
      columns: get().columns.map((column) => (column.id === id ? { ...column, kind } : column)),
      result: null,
    }),

  toggleColumn: (id, include) =>
    set({
      columns: get().columns.map((column) => (column.id === id ? { ...column, include } : column)),
      result: null,
    }),

  moveCategory: (id, index, direction) =>
    set({
      columns: get().columns.map((column) => {
        if (column.id !== id) return column;
        const order = [...column.categoryOrder];
        const target = index + direction;
        const current = order[index];
        const swapped = order[target];
        if (current === undefined || swapped === undefined) return column;
        order[index] = swapped;
        order[target] = current;
        return { ...column, categoryOrder: order };
      }),
      result: null,
    }),

  patchCalculation: (patch) =>
    set({ calculation: { ...get().calculation, ...patch }, result: null }),

  toggleChart: (variableId, kind, selected) => {
    const calculation = get().calculation;
    const current = calculation.charts[variableId] ?? [];
    const next = selected
      ? current.includes(kind)
        ? current
        : [...current, kind]
      : current.filter((entry) => entry !== kind);
    set({
      calculation: { ...calculation, charts: { ...calculation.charts, [variableId]: next } },
      result: null,
    });
  },

  selectUsual: () => {
    const state = get();
    set({ calculation: usualSelection(state.columns, state.calculation), result: null });
  },

  computeResult: () => {
    const state = get();
    if (state.dataset === null) return;
    const request = buildAnalysisRequest(state);
    if (request === null) return;
    const key = requestKey(request);
    if (state.result !== null && lastRequestKey === key) return;
    set({ isComputing: true });
    const dataset: Dataset = {
      ...state.dataset,
      columns: state.dataset.columns.map((column) => {
        const config = state.columns.find((entry) => entry.id === column.variable.id);
        if (config === undefined) return column;
        return {
          ...column,
          variable: {
            ...column.variable,
            name: config.name,
            kind: config.kind,
            kindConfirmedByUser: true,
            ...(config.kind === "ordinal" ? { categoryOrder: config.categoryOrder } : {}),
          },
        };
      }),
    };
    const result = runAnalysis(dataset, request);
    lastRequestKey = key;
    set({ result, isComputing: false });
  },

  detectStoredDataset: () => set({ hasStoredDataset: loadLastDataset() !== null }),

  recoverLastDataset: () => {
    const dataset = loadLastDataset();
    if (dataset === null) {
      set({ hasStoredDataset: false });
      return false;
    }
    set({ ...stateForDataset(dataset, dataset.source, dataset.sourceName ?? null), step: 0 });
    return true;
  },

  reset: () => {
    clearLastDataset();
    lastRequestKey = null;
    set({
      ...INITIAL_STATE,
      calculation: { ...DEFAULT_CALCULATION },
      importOptions: { ...DEFAULT_IMPORT_OPTIONS },
    });
  },

  canProceed: (step) => {
    const state = get();
    return canProceedPure(state, step ?? state.step);
  },
}));
