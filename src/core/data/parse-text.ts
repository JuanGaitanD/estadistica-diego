/** Delimitadores soportados al pegar texto tabular. */
export type TextDelimiter = "," | ";" | "\t" | " ";

/** Opciones para el parseo de texto pegado (paso 1 del asistente). */
export interface ParsePastedTextOptions {
  /** Si la primera fila contiene los nombres de las columnas. */
  readonly hasHeader: boolean;
  /** Fuerza un delimitador específico; si se omite, se autodetecta. */
  readonly delimiter?: TextDelimiter;
  /**
   * `true` cuando la persona usuaria ya declaró que sus decimales van con coma.
   * En una lista separada por comas solo separan, entonces, las comas seguidas
   * de un espacio: "1,5, 2,3" son dos datos, no cuatro.
   */
  readonly decimalComma?: boolean;
}

/** Nombre de la única columna cuando se pega una lista suelta. */
export const SINGLE_LIST_COLUMN = "Datos";

/** Resultado del parseo de texto pegado. */
export interface ParsedText {
  /** Delimitador usado (detectado o forzado). */
  readonly delimiter: TextDelimiter;
  /** Encabezados (vacíos si `hasHeader` es `false`; se generan nombres genéricos). */
  readonly headers: readonly string[];
  /** Filas de datos como texto crudo, sin encabezado. */
  readonly rows: readonly (readonly string[])[];
  /** `true` si se leyó como una lista suelta y se puso en una sola columna. */
  readonly transposedSingleList: boolean;
  /**
   * `true` cuando el texto es una lista separada por comas en la que algunas
   * comas van pegadas a dígitos y otras llevan espacio: no se puede saber si
   * son separadores de dato o decimales sin preguntar (RF-09).
   */
  readonly ambiguousDecimalList: boolean;
}

const CANDIDATE_DELIMITERS: readonly TextDelimiter[] = [",", ";", "\t", " "];

/** Coma pegada entre dígitos: parece separador decimal. */
const AMBIGUOUS_DECIMAL = /\d,\d/;
/** Coma seguida de espacio tras un dígito: parece separador de dato. */
const AMBIGUOUS_SEPARATOR = /\d,\s/;

/**
 * Detecta la ambigüedad típica de "1,5, 2,3, 4, 4, 7": hay comas pegadas
 * entre dígitos (que parecen decimales) y comas seguidas de espacio (que
 * parecen separadores de dato). Con una sola de las dos formas no hay duda.
 */
function hasAmbiguousCommas(text: string): boolean {
  return AMBIGUOUS_DECIMAL.test(text) && AMBIGUOUS_SEPARATOR.test(text);
}

/**
 * Detecta el delimitador más probable contando ocurrencias en las primeras
 * líneas no vacías del texto. En caso de empate se prefiere el orden
 * `, ; tab espacio`. Si no hay ninguno presente (una sola columna), se usa
 * coma por convención.
 */
export function detectDelimiter(lines: readonly string[]): TextDelimiter {
  const sample = lines.filter((line) => line.trim().length > 0).slice(0, 5);
  if (sample.length === 0) return ",";

  let best: TextDelimiter = ",";
  let bestCount = 0;
  for (const delimiter of CANDIDATE_DELIMITERS) {
    const counts = sample.map((line) => countOccurrences(line, delimiter));
    const total = counts.reduce((a, b) => a + b, 0);
    if (total > bestCount) {
      bestCount = total;
      best = delimiter;
    }
  }
  return best;
}

function countOccurrences(line: string, delimiter: TextDelimiter): number {
  if (delimiter === " ") {
    // Solo cuenta secuencias de espacios múltiples para no confundir con
    // separación de palabras dentro de una categoría de texto.
    const matches = line.match(/ {2,}/g);
    return matches ? matches.length : 0;
  }
  return line.split(delimiter).length - 1;
}

/**
 * Parsea texto pegado (una o varias columnas, separado por coma, punto y
 * coma, tabulador o espacios múltiples) en una matriz de celdas de texto.
 * No interpreta números ni faltantes: eso lo hace `buildDataset`.
 */
export function parsePastedText(text: string, options: ParsePastedTextOptions): ParsedText {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line, index, all) => {
    // Conserva líneas intermedias vacías pero descarta un único salto final.
    return !(index === all.length - 1 && line.trim().length === 0);
  });

  const delimiter = options.delimiter ?? detectDelimiter(lines);
  const ambiguousDecimalList =
    delimiter === "," && options.decimalComma !== true && hasAmbiguousCommas(normalized);
  // Con coma decimal declarada, en una lista solo separan las comas seguidas
  // de espacio: "1,5, 2,3" son dos datos.
  const commaSeparator: string | RegExp = options.decimalComma === true ? /,\s+/ : ",";
  const splitLine = (line: string): string[] => {
    if (delimiter === " ") return line.trim().split(/ {2,}|\t/);
    if (delimiter === ",") return line.split(commaSeparator);
    return line.split(delimiter);
  };

  const cells = lines.map((line) => splitLine(line).map((cell) => cell.trim()));
  const columnCount = cells.reduce((max, row) => Math.max(max, row.length), 0);

  const padded = cells.map((row) => {
    const copy = [...row];
    while (copy.length < columnCount) copy.push("");
    return copy;
  });

  if (options.hasHeader && padded.length > 0) {
    const [headerRow, ...rest] = padded;
    const headers = (headerRow ?? []).map((h, i) => (h.length > 0 ? h : `Columna ${i + 1}`));
    return { delimiter, headers, rows: rest, transposedSingleList: false, ambiguousDecimalList };
  }

  // Caso principal del brief: se pega "una lista de variables separada por
  // comas" en una sola línea. Leerla como una fila de N columnas daría N
  // variables con un solo dato cada una, que no es lo que nadie quiere: se
  // transpone a una única variable con N datos.
  const singleRow = padded[0];
  if (padded.length === 1 && singleRow !== undefined && singleRow.length > 1) {
    return {
      delimiter,
      headers: [SINGLE_LIST_COLUMN],
      rows: singleRow.map((cell) => [cell]),
      transposedSingleList: true,
      ambiguousDecimalList,
    };
  }

  const headers = Array.from({ length: columnCount }, (_, i) => `Columna ${i + 1}`);
  return { delimiter, headers, rows: padded, transposedSingleList: false, ambiguousDecimalList };
}
