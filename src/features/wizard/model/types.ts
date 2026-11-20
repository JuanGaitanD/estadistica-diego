/**
 * Tipos del estado del asistente (wizard) de StatLab.
 *
 * El estado es de datos planos y serializables: las acciones del store son
 * puras sobre él, de modo que se pueden probar sin React.
 */
import type { Dataset, DatasetSource, VariableKind } from "@/core/data";
import type { ChartKind } from "@/components/charts";
import type { AnalysisResult } from "@/features/analysis";

/** Índice de validación: 0 datos, 1 variables, 2 cálculos, 3 resultados (RF-12). */
export type StepIndex = 0 | 1 | 2 | 3;

/**
 * Zonas del espacio de trabajo (RF-41). «Inicio» es el tablero desde el que se
 * elige qué hacer; «Rentable» (RF-57) no usa el conjunto de datos: se abre siempre.
 */
export const ZONES = [
  { id: "inicio", title: "Inicio", hint: "Elige qué hacer" },
  { id: "datos", title: "Datos", hint: "Carga o escribe" },
  { id: "explorar", title: "Explorar", hint: "Qué dicen tus datos" },
  { id: "analizar", title: "Analizar", hint: "Responde una pregunta" },
  { id: "informe", title: "Informe", hint: "Junta y exporta" },
  { id: "rentabilidad", title: "Rentable", hint: "¿Vale la pena?" },
] as const;

export type Zone = (typeof ZONES)[number]["id"];

/** Herramientas de «Estadística avanzada» que se abren dentro de Analizar. */
export const ANALYSIS_PANELS = [
  { id: "probabilidad", title: "Probabilidad", hint: "Qué tan probable es un valor" },
  { id: "estimar", title: "Intervalos de confianza", hint: "Qué decir de toda la población" },
  { id: "probar", title: "Pruebas de hipótesis", hint: "Si una diferencia es real" },
  { id: "regresion", title: "Correlación y regresión", hint: "Predecir un número con otro" },
  { id: "multiple", title: "Regresión múltiple", hint: "Con varias variables o una curva" },
  { id: "logistica", title: "Regresión logística", hint: "Predecir un sí o un no" },
] as const;

export type AnalysisPanel = (typeof ANALYSIS_PANELS)[number]["id"];

/** Formato decimal elegido por la persona usuaria en el paso 1 (RF-09). */
export type DecimalChoice = "auto" | "coma" | "punto";

/** Opciones de importación del paso 1. */
export interface ImportOptions {
  /** RF-03: la primera fila trae los nombres de las columnas. */
  readonly hasHeader: boolean;
  /** RF-05: hoja elegida del XLSX (null = la primera). */
  readonly sheetName: string | null;
  readonly decimal: DecimalChoice;
}

/** Configuración editable de una columna en el paso 2. */
export interface ColumnConfig {
  readonly id: string;
  readonly name: string;
  readonly kind: VariableKind;
  readonly inferredKind: VariableKind;
  /** Motivo de la sugerencia, en español (`inferVariableKind`). */
  readonly inferredReason: string;
  readonly include: boolean;
  /** Orden declarado de categorías; solo se usa si `kind === "ordinal"`. */
  readonly categoryOrder: readonly string[];
}

/** Regla de cálculo del número de clases K (RF-17). */
export type ClassRuleChoice =
  "sturges" | "raiz" | "rice" | "scott" | "freedman-diaconis" | "manual";

/** Selección de cálculos y gráficas del paso 3. */
export interface CalculationSelection {
  readonly frequencies: boolean;
  /** RF-15: relativa **o** porcentual, nunca ambas. */
  readonly relativeMode: "proporcion" | "porcentaje";
  readonly cumulative: boolean;
  readonly grouped: boolean;
  readonly rule: ClassRuleChoice;
  readonly manualK: number;

  readonly mode: boolean;
  readonly median: boolean;
  readonly arithmetic: boolean;
  readonly weighted: boolean;
  readonly weightsVariableId: string | null;
  readonly geometric: boolean;
  readonly harmonic: boolean;

  readonly quartiles: boolean;
  readonly quartileMethod: "inclusivo" | "exclusivo";
  readonly deciles: boolean;
  readonly percentiles: boolean;
  /** Lista escrita a mano, p. ej. "10, 90". */
  readonly percentilesText: string;

  readonly range: boolean;
  readonly variance: boolean;
  readonly standardDeviation: boolean;
  readonly coefficientOfVariation: boolean;
  readonly iqr: boolean;

  readonly contingency: boolean;
  readonly contingencyRowId: string | null;
  readonly contingencyColumnId: string | null;
  readonly contingencyPercentages: "ninguno" | "fila" | "columna" | "total";

  /** Gráficas elegidas por variable. */
  readonly charts: Readonly<Record<string, readonly ChartKind[]>>;
}

/** Estado completo del asistente. */
export interface WizardState {
  readonly zone: Zone;
  /** Herramienta abierta en Analizar; `null` muestra todas las preguntas. */
  readonly panel: AnalysisPanel | null;
  readonly dataset: Dataset | null;
  readonly origin: DatasetSource | null;
  readonly sourceName: string | null;
  readonly pastedText: string;
  readonly importOptions: ImportOptions;
  readonly availableSheets: readonly string[];
  readonly importError: string | null;
  readonly isImporting: boolean;
  readonly columns: readonly ColumnConfig[];
  readonly calculation: CalculationSelection;
  /**
   * `false` mientras la selección sea la habitual: entonces se rehace sola al
   * cambiar los tipos de variable. Pasa a `true` cuando la persona la ajusta.
   */
  readonly calculationCustomized: boolean;
  readonly result: AnalysisResult | null;
  readonly isComputing: boolean;
  /** `true` si hay un análisis guardado en el navegador que se puede recuperar. */
  readonly hasStoredDataset: boolean;
}

/** Veredicto de validación de un paso (RF-12). */
export type StepValidation =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

/** Valores iniciales de las opciones de importación. */
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  hasHeader: true,
  sheetName: null,
  decimal: "auto",
};

/** Selección inicial: nada marcado salvo la tabla de frecuencias. */
export const DEFAULT_CALCULATION: CalculationSelection = {
  frequencies: true,
  relativeMode: "porcentaje",
  cumulative: false,
  grouped: false,
  rule: "sturges",
  manualK: 5,

  mode: false,
  median: false,
  arithmetic: false,
  weighted: false,
  weightsVariableId: null,
  geometric: false,
  harmonic: false,

  quartiles: false,
  quartileMethod: "inclusivo",
  deciles: false,
  percentiles: false,
  percentilesText: "10, 90",

  range: false,
  variance: false,
  standardDeviation: false,
  coefficientOfVariation: false,
  iqr: false,

  contingency: false,
  contingencyRowId: null,
  contingencyColumnId: null,
  contingencyPercentages: "ninguno",

  charts: {},
};
