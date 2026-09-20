/**
 * Contrato de entrada y salida del módulo de análisis (docs/02-arquitectura.md §7),
 * adaptado a los tipos reales de `src/core`.
 *
 * `VariableKind` se declara tanto en `core/data` como en `core/statistics` de forma
 * estructuralmente idéntica ("nominal" | "ordinal" | "discreta" | "continua"). Aquí se
 * reexporta el de `core/data` (el que viaja en el `Dataset`) y se deja constancia en
 * tiempo de compilación de que ambos son intercambiables (ver `assertKindsCompatible`
 * más abajo), de modo que si alguno cambiara en el futuro el error salte aquí y no en
 * el núcleo.
 */
import type { MissingPolicy, VariableKind } from "@/core/data";
import type {
  CentralTendencyOptions,
  ContingencyResult,
  FrequencyOptions,
  GroupingOptions,
  PositionOptions,
  VariabilityOptions,
  VariableAnalysisResult,
  VariableKind as StatisticsVariableKind,
} from "@/core/statistics";

/** Comprobación en tiempo de compilación de que ambos `VariableKind` coinciden. */
type Mutually<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export type KindsAreCompatible = Mutually<VariableKind, StatisticsVariableKind>;
/**
 * La constante es lo que hace efectiva la comprobación: si los dos
 * `VariableKind` dejaran de coincidir, `KindsAreCompatible` sería `never` y
 * esta asignación no compilaría. Un simple alias de tipo no daría error.
 */
export const KINDS_ARE_COMPATIBLE: KindsAreCompatible = true;

export type { MissingPolicy, VariableKind };

/** Origen de los pesos de la media ponderada (RF-20, doc 02). */
export type WeightsSource =
  | { readonly kind: "columna"; readonly variableId: string }
  | { readonly kind: "manual"; readonly weights: readonly number[] }
  | { readonly kind: "frecuencias" };

/** Opciones de tendencia central del feature: las del core más el origen de pesos. */
export interface CentralTendencyRequestOptions extends CentralTendencyOptions {
  readonly weightsSource?: WeightsSource;
}

/** Tipos de gráfica ofrecidos (RF-25). */
export type ChartType = "pie" | "barras" | "histograma" | "poligono" | "ojiva" | "contingencia";

/**
 * Especificación de una gráfica elegida por la persona usuaria. El módulo de
 * análisis no dibuja: solo transporta la especificación hasta `components/charts`.
 */
export interface AnalysisChartSpec {
  readonly id: string;
  readonly type: ChartType;
  readonly title: string;
  readonly variableId: string;
  readonly secondVariableId?: string;
  readonly source: "frecuencia" | "frecuencia-acumulada" | "contingencia";
  readonly labels: {
    readonly showValue: boolean;
    readonly showPercent: boolean;
    readonly showCategory: boolean;
  };
  readonly paletteKey: string;
  readonly caption: string;
}

/** Cálculos pedidos para una variable concreta. */
export interface VariableAnalysisRequest {
  readonly variableId: string;
  readonly grouping: GroupingOptions;
  readonly frequency: FrequencyOptions;
  readonly central: CentralTendencyRequestOptions;
  readonly position: PositionOptions;
  readonly variability: VariabilityOptions;
}

/** Cruce de dos variables (RF-22). */
export interface ContingencyRequest {
  readonly rowVariableId: string;
  readonly columnVariableId: string;
  readonly percentages: "ninguno" | "fila" | "columna" | "total";
}

/** Petición completa de análisis. */
export interface AnalysisRequest {
  readonly datasetId: string;
  readonly missingPolicy: MissingPolicy;
  readonly variables: readonly VariableAnalysisRequest[];
  readonly contingencies: readonly ContingencyRequest[];
  readonly charts: readonly AnalysisChartSpec[];
}

/** Clave de cada cálculo de la matriz de aplicabilidad (docs/01-requisitos §2.1). */
export type CalculationKey =
  | "frecuencias"
  | "frecuencias-agrupadas"
  | "frecuencia-acumulada"
  | "minimo-maximo"
  | "moda"
  | "mediana"
  | "media-aritmetica"
  | "media-ponderada"
  | "media-geometrica"
  | "media-armonica"
  | "cuantiles"
  | "rango"
  | "varianza"
  | "ric"
  | "contingencia";

/** Nivel de aplicabilidad: aplica, aplica con advertencia, o no aplica. */
export type ApplicabilityLevel = "ok" | "advertencia" | "no";

/** Veredicto de aplicabilidad de un cálculo sobre un tipo de variable. */
export interface Applicability {
  /** `false` solo cuando el cálculo no aplica en absoluto. */
  readonly ok: boolean;
  readonly level: ApplicabilityLevel;
  /** Motivo o advertencia en español, siempre presente (vale también como tooltip). */
  readonly reason: string;
}

/** Mapa completo de aplicabilidad para un tipo de variable. */
export type ApplicabilityMap = Readonly<Record<CalculationKey, Applicability>>;

/** Cálculo pedido que no se pudo ofrecer, con su motivo en español. */
export interface UnavailableCalculation {
  readonly key: CalculationKey;
  readonly label: string;
  readonly reason: string;
}

/** Aviso mostrado en la cabecera de resultados. */
export interface AnalysisWarning {
  readonly code:
    | "faltantes"
    | "decimal-ambiguo"
    | "tipo-mixto"
    | "muchas-categorias"
    | "tamano"
    | "lista-transpuesta"
    | "no-aplicable"
    | "variable-inexistente";
  readonly variableId?: string;
  /** Mensaje autocontenido (incluye el nombre de la variable). Se usa en el PDF. */
  readonly message: string;
  /**
   * Versión corta sin el nombre de la variable, para cuando el aviso ya se
   * muestra dentro de un bloque agrupado por variable.
   */
  readonly shortMessage?: string;
  /**
   * `true` cuando el aviso solo informa de un cálculo que no aplica a ese tipo
   * de variable (no hay nada que corregir en los datos). `false` o ausente para
   * advertencias reales sobre los datos: faltantes, decimales ambiguos, etc.
   */
  readonly informative?: boolean;
}

/** Resultado del análisis de una variable, con su petición y sus omisiones. */
export interface AnalyzedVariable {
  readonly variableId: string;
  readonly variableName: string;
  readonly kind: VariableKind;
  readonly unit?: string;
  /** `true` si la tabla agrupada llegó a calcularse. */
  readonly grouped: boolean;
  /** Petición efectiva tras aplicar la matriz de aplicabilidad. */
  readonly request: VariableAnalysisRequest;
  readonly analysis: VariableAnalysisResult;
  readonly applicability: ApplicabilityMap;
  readonly unavailable: readonly UnavailableCalculation[];
}

/** Resultado de un cruce de variables. */
export interface AnalyzedContingency {
  readonly request: ContingencyRequest;
  readonly rowVariableName: string;
  readonly columnVariableName: string;
  readonly table: ContingencyResult | null;
  readonly unavailableReason?: string;
}

/** Resultado completo del análisis. */
export interface AnalysisResult {
  readonly requestId: string;
  readonly datasetId: string;
  readonly computedAt: string;
  /** Filas del dataset analizado. */
  readonly totalRows: number;
  readonly variables: readonly AnalyzedVariable[];
  readonly contingencies: readonly AnalyzedContingency[];
  readonly charts: readonly AnalysisChartSpec[];
  readonly warnings: readonly AnalysisWarning[];
}

/** Sección de resultados identificable, para la exportación parcial (RF-32). */
export interface ResultSection {
  /** Id estable del elemento en el DOM, p. ej. `section-edad-frecuencias`. */
  readonly id: string;
  readonly title: string;
  readonly kind:
    "resumen" | "frecuencias" | "tendencia-central" | "posicion" | "variabilidad" | "contingencia";
  readonly variableId?: string;
}
