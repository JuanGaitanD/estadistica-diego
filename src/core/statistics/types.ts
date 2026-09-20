/**
 * Contrato de tipos del núcleo estadístico (ver docs/02-arquitectura.md §7).
 *
 * `src/core/statistics` no importa nada fuera de sí mismo, por lo que los tipos
 * que también existen en `src/core/data` (como `VariableKind`) se redeclaran aquí
 * de forma estructuralmente idéntica: el dominio estadístico recibe arrays ya
 * limpios y no conoce el modelo de datos.
 */

/** Tipo de variable, en los mismos términos que `core/data`. */
export type VariableKind = "nominal" | "ordinal" | "discreta" | "continua";

/** Valor que puede tomar una observación categórica o numérica ya limpia. */
export type ObservedValue = string | number;

/** Microtexto pedagógico que acompaña obligatoriamente a todo resultado (RF-30). */
export interface Explanation {
  /** "Qué significa". */
  readonly what: string;
  /** "Para qué sirve". */
  readonly why: string;
  /** Fórmula en notación legible, para el modo docente. */
  readonly formula?: string;
}

/** Métrica individual: valor calculable o `null` con su motivo, nunca `NaN`. */
export interface Metric {
  readonly key: string;
  readonly label: string;
  readonly value: number | null;
  readonly unavailableReason?: string;
  readonly explanation: Explanation;
  /**
   * `true` cuando el valor es un conteo o una cantidad entera por naturaleza
   * (n, frecuencias, número de clases). La UI y el PDF lo muestran sin
   * decimales: "24", nunca "24,00".
   */
  readonly integer?: boolean;
}

export interface GroupingOptions {
  readonly enabled: boolean;
  readonly rule: "sturges" | "raiz" | "rice" | "scott" | "freedman-diaconis" | "manual";
  readonly manualK?: number;
  readonly closure: "cerrado-abierto" | "abierto-cerrado";
}

/** Regla de cálculo del número de clases K. */
export type ClassRule = GroupingOptions["rule"];

export interface FrequencyOptions {
  readonly relativeMode: "proporcion" | "porcentaje";
  readonly showCumulative: boolean;
  readonly showClassMark: boolean;
}

export interface CentralTendencyOptions {
  readonly arithmetic: boolean;
  readonly weighted: boolean;
  readonly geometric: boolean;
  readonly harmonic: boolean;
  readonly median: boolean;
  readonly mode: boolean;
}

/** Método de cuantiles: inclusivo = R-7 (por defecto), exclusivo = R-6. */
export type QuantileMethod = "inclusivo" | "exclusivo";

export interface PositionOptions {
  readonly quartiles: boolean;
  readonly quartileMethod: QuantileMethod;
  readonly includeQ2: boolean;
  readonly deciles: boolean;
  readonly percentiles: readonly number[] | "todos";
}

export interface VariabilityOptions {
  readonly range: boolean;
  readonly sampleVariance: boolean;
  readonly populationVariance: boolean;
  readonly standardDeviation: boolean;
  readonly coefficientOfVariation: boolean;
  readonly iqr: boolean;
  readonly outliers: boolean;
}

export interface FrequencyRow {
  /** "3" o "[1.5, 2.0)". */
  readonly label: string;
  readonly lowerBound?: number;
  readonly upperBound?: number;
  /** Marca de clase xi. */
  readonly classMark?: number;
  /** fi */
  readonly absolute: number;
  /** hi en proporción 0..1 */
  readonly relative: number;
  /** Fi */
  readonly cumulativeAbsolute: number;
  /** Hi */
  readonly cumulativeRelative: number;
}

export interface FrequencyTableResult {
  readonly variableId: string;
  readonly grouped: boolean;
  readonly rule?: ClassRule;
  readonly k?: number;
  /** Longitud de intervalo l. */
  readonly intervalLength?: number;
  readonly rows: readonly FrequencyRow[];
  /** n efectivo tras excluir faltantes. */
  readonly n: number;
  readonly excluded: number;
  readonly warnings: readonly string[];
  readonly explanation: Explanation;
}

export interface ModeEntry {
  readonly value: ObservedValue;
  readonly count: number;
}

export interface ModeResult {
  readonly kind: "amodal" | "unimodal" | "multimodal";
  /** Etiqueta didáctica: "amodal", "unimodal", "bimodal", "trimodal", "multimodal". */
  readonly label: string;
  readonly values: readonly ModeEntry[];
  readonly explanation: Explanation;
}

export interface CentralTendencyResult {
  readonly variableId: string;
  readonly metrics: readonly Metric[];
  readonly mode: ModeResult;
  readonly groupedMean?: Metric;
  readonly groupedMedian?: Metric;
  readonly groupedMode?: Metric;
}

export interface PositionResult {
  readonly variableId: string;
  readonly method: QuantileMethod;
  readonly quartiles: readonly Metric[];
  readonly deciles: readonly Metric[];
  readonly percentiles: readonly Metric[];
}

export interface VariabilityResult {
  readonly variableId: string;
  readonly metrics: readonly Metric[];
  readonly outliers: readonly number[];
  readonly fences: { readonly lower: number; readonly upper: number } | null;
}

export interface ContingencyCell {
  readonly absolute: number;
  readonly rowPercent: number;
  readonly columnPercent: number;
  readonly totalPercent: number;
}

/**
 * Índices del máximo y del mínimo de una fila o columna. `maxIndex`/`minIndex`
 * son el primer índice empatado (contrato de la arquitectura); `maxIndexes` y
 * `minIndexes` listan todos los empates para el resaltado (ADR-003 §6).
 */
export interface ExtremeIndexes {
  readonly maxIndex: number;
  readonly minIndex: number;
  readonly maxIndexes: readonly number[];
  readonly minIndexes: readonly number[];
}

export interface ContingencyResult {
  readonly rowVariableId: string;
  readonly columnVariableId: string;
  readonly rowLabels: readonly string[];
  readonly columnLabels: readonly string[];
  readonly cells: readonly (readonly ContingencyCell[])[];
  readonly rowTotals: readonly number[];
  readonly columnTotals: readonly number[];
  readonly grandTotal: number;
  readonly excluded: number;
  readonly rowExtremes: readonly ExtremeIndexes[];
  readonly columnExtremes: readonly ExtremeIndexes[];
  readonly explanation: Explanation;
}

/** Mediana posicional de una variable ordinal: devuelve la categoría, no un número. */
export interface OrdinalMedianResult {
  readonly label: string | null;
  readonly unavailableReason?: string;
  readonly explanation: Explanation;
}

export interface VariableAnalysisResult {
  readonly variableId: string;
  readonly kind: VariableKind;
  /** n, mínimo, máximo (RF-16). */
  readonly summary: readonly Metric[];
  readonly frequency?: FrequencyTableResult;
  readonly groupedFrequency?: FrequencyTableResult;
  readonly central?: CentralTendencyResult;
  readonly ordinalMedian?: OrdinalMedianResult;
  readonly position?: PositionResult;
  readonly variability?: VariabilityResult;
  /** Advertencias en español para el usuario. */
  readonly notes: readonly string[];
}
