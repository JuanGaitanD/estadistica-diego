/** Código tipificado de error de importación. */
export type ImportErrorCode =
  | "archivo-vacio"
  | "tipo-no-soportado"
  | "demasiado-grande"
  | "formato-invalido"
  | "tamano-dataset";

/**
 * Error tipificado de importación, con mensaje en español apto para mostrar
 * directamente a una persona no técnica.
 */
export class ImportError extends Error {
  readonly code: ImportErrorCode;
  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = "ImportError";
    this.code = code;
  }
}
