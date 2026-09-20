/**
 * Contrato de tipos del modelo de datos de StatLab (ver docs/02-arquitectura.md, sección 7).
 *
 * Este módulo es TypeScript puro: no importa React, Next ni librerías externas.
 */

/** Tipo de variable estadística según su naturaleza y escala de medición. */
export type VariableKind = "nominal" | "ordinal" | "discreta" | "continua";

/** Valor de una celda del dataset. `null` representa un valor faltante. */
export type CellValue = string | number | null;

/** Origen de un dataset importado. */
export type DatasetSource = "texto" | "csv" | "xlsx";

/** Política de tratamiento de valores faltantes al calcular resultados. */
export type MissingPolicy = "excluir-por-variable" | "excluir-fila-completa";

/**
 * Metadatos y clasificación de una variable (columna) del dataset.
 */
export interface Variable {
  /** Identificador estable, base de la paleta de colores. */
  readonly id: string;
  /** Nombre mostrado (encabezado de la columna). */
  readonly name: string;
  /** Tipo vigente, editable por la persona usuaria. */
  readonly kind: VariableKind;
  /** Tipo que dedujo el sistema automáticamente. */
  readonly kindInferred: VariableKind;
  /** `true` si la persona usuaria confirmó o cambió el tipo inferido. */
  readonly kindConfirmedByUser: boolean;
  /** Orden declarado de categorías; obligatorio cuando `kind === "ordinal"`. */
  readonly categoryOrder?: readonly string[];
  /** Unidad de medida, si aplica. */
  readonly unit?: string;
  /** Número de decimales detectado en los datos originales. */
  readonly decimals?: number;
}

/** Columna de datos: la variable que la describe y sus valores. */
export interface Column {
  readonly variable: Variable;
  readonly values: readonly CellValue[];
  /** Cantidad de valores tratados como faltantes en esta columna. */
  readonly missingCount: number;
}

/** Advertencia legible en español para mostrar en la interfaz. */
export interface DatasetWarning {
  readonly code:
    | "faltantes"
    | "tipo-mixto"
    | "muchas-categorias"
    | "tamano"
    | "decimal-ambiguo"
    /** Se pegó una lista suelta y se leyó como una sola variable. */
    | "lista-transpuesta";
  readonly variableId?: string;
  readonly message: string;
}

/** Conjunto de datos completo, resultado de cualquiera de las vías de importación. */
export interface Dataset {
  readonly id: string;
  readonly source: DatasetSource;
  /** Nombre de archivo u hoja de origen, cuando aplica. */
  readonly sourceName?: string;
  readonly columns: readonly Column[];
  readonly rowCount: number;
  /** Fecha de creación en formato ISO-8601. */
  readonly createdAt: string;
  readonly warnings: readonly DatasetWarning[];
}

/**
 * Configuración de detección de valores faltantes: qué cadenas de texto,
 * además de la celda vacía, se consideran ausencia de dato.
 */
export interface MissingValueConfig {
  /** Tokens reconocidos como faltantes (comparados tras recortar espacios). */
  readonly tokens: readonly string[];
  /** Si la comparación distingue mayúsculas de minúsculas. Por defecto `false`. */
  readonly caseSensitive?: boolean;
}

/** Formato de separador decimal para interpretar números en texto. */
export type NumberFormat = "es" | "en";
