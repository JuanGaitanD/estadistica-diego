// Fase 2: implementación con Gemini

/** Entrada mínima para generar un informe asistido por IA. */
export interface AiReportInput {
  /** Resumen textual de los resultados estadísticos a interpretar. */
  summary: string;
  /** Idioma del informe (por defecto "es"). */
  language?: string;
}

/** Salida mínima del informe generado. */
export interface AiReportOutput {
  /** Informe en Markdown. */
  markdown: string;
}

/** Puerto de generación de informes. La infraestructura concreta se inyecta desde features. */
export interface AiReportProvider {
  generateReport(input: AiReportInput): Promise<AiReportOutput>;
}
