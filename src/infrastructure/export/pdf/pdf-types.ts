/** Secciones que puede tener un reporte PDF, en el orden en el que se dibujan. */
export type ReportSection =
  | { readonly kind: "text"; readonly title: string; readonly paragraphs: readonly string[] }
  | {
      readonly kind: "table";
      readonly title: string;
      readonly columns: readonly string[];
      readonly rows: readonly (readonly (string | number)[])[];
      readonly note?: string;
    }
  | {
      readonly kind: "image";
      readonly title: string;
      readonly dataUrl: string;
      readonly caption?: string;
    }
  | {
      readonly kind: "metrics";
      readonly title: string;
      readonly items: readonly {
        readonly label: string;
        readonly value: string;
        readonly explanation?: string;
      }[];
    };

/** Especificación completa de un reporte PDF, independiente de jsPDF. */
export interface ReportPdfSpec {
  /** Título del documento, ej. "StatLab". */
  readonly title: string;
  readonly analysisName: string;
  readonly generatedAt: Date;
  /** Tamaño de muestra (n de datos), mostrado en la portada. */
  readonly sampleSize: number;
  readonly sections: readonly ReportSection[];
}
