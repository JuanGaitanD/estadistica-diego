/** Número máximo de celdas (filas × columnas) admitidas en un dataset. */
export const MAX_CELLS = 200_000;

/** Error lanzado cuando un dataset excede el límite de tamaño soportado. */
export class DatasetSizeError extends Error {
  readonly code = "tamano" as const;
  constructor(cellCount: number) {
    super(
      `El archivo tiene ${cellCount.toLocaleString("es-ES")} celdas y supera el máximo permitido ` +
        `de ${MAX_CELLS.toLocaleString("es-ES")}. Reduce el número de filas o columnas e inténtalo de nuevo.`,
    );
    this.name = "DatasetSizeError";
  }
}

/**
 * Verifica que el tamaño del dataset (filas × columnas) no exceda `MAX_CELLS`.
 * Lanza `DatasetSizeError` con un mensaje en español si se supera.
 */
export function assertWithinCellLimit(rowCount: number, columnCount: number): void {
  const cellCount = rowCount * columnCount;
  if (cellCount > MAX_CELLS) {
    throw new DatasetSizeError(cellCount);
  }
}
