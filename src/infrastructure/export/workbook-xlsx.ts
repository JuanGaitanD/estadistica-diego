// ExcelJS se carga al exportar, no al abrir la app. A diferencia de SheetJS
// (versión libre), escribe estilos, anchos, celdas combinadas y paneles congelados.

/** Aspecto de una celda; el renderizador lo traduce a relleno, fuente y bordes. */
export type CellStyle =
  "title" | "subtitle" | "section" | "header" | "input" | "total" | "highlight" | "note";

export interface WorkbookCell {
  readonly value?: string | number | null;
  /** Fórmula en sintaxis interna de Excel (inglés, comas), sin «=». */
  readonly formula?: string;
  /** Formato de número de Excel, por ejemplo `"$"#,##0` o `0.00%`. */
  readonly format?: string;
  readonly style?: CellStyle;
  /** Combina la celda con las siguientes hasta ocupar `span` columnas y ajusta el texto. */
  readonly span?: number;
}

export type WorkbookEntry = WorkbookCell | string | number | null;

export interface WorkbookSheet {
  readonly name: string;
  readonly rows: readonly (readonly WorkbookEntry[])[];
  /** Ancho de cada columna en caracteres. */
  readonly widths?: readonly number[];
  /** Filas y columnas que quedan fijas al desplazarse. */
  readonly freeze?: { readonly rows: number; readonly columns: number };
}

const DARK = "FF1F3A5F";
const GRAY = "FF555555";
const FILLS: Partial<Record<CellStyle, string>> = {
  header: DARK,
  section: "FFDCE4EE",
  input: "FFFFF4CC",
  highlight: "FFE3F1E6",
};
const FONTS: Partial<Record<CellStyle, object>> = {
  title: { bold: true, size: 16, color: { argb: DARK } },
  subtitle: { italic: true, color: { argb: GRAY } },
  section: { bold: true, color: { argb: DARK } },
  header: { bold: true, color: { argb: "FFFFFFFF" } },
  // Convención de los modelos financieros: lo que se edita va en azul.
  input: { color: { argb: "FF1F4FBF" } },
  total: { bold: true },
  highlight: { bold: true },
  note: { italic: true, color: { argb: GRAY } },
};

/** Libro XLSX con estilos y fórmulas vivas que Excel recalcula al abrir. */
export async function buildWorkbookXlsx(sheets: readonly WorkbookSheet[]): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;

  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name, {
      // Para imprimir o pasar a PDF: horizontal y a lo ancho de la página.
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      ...(spec.freeze !== undefined
        ? { views: [{ state: "frozen", xSplit: spec.freeze.columns, ySplit: spec.freeze.rows }] }
        : {}),
    });
    const widths = spec.widths ?? [];
    widths.forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
    spec.rows.forEach((row, rowIndex) =>
      row.forEach((entry, columnIndex) => {
        if (entry === null || entry === "") return;
        const data: WorkbookCell = typeof entry === "object" ? entry : { value: entry };
        const cell = sheet.getCell(rowIndex + 1, columnIndex + 1);
        if (data.formula !== undefined) cell.value = { formula: data.formula, date1904: false };
        else if (data.value !== undefined && data.value !== null) cell.value = data.value;
        if (data.format !== undefined) cell.numFmt = data.format;
        const style = data.style;
        if (style !== undefined) {
          const fill = FILLS[style];
          if (fill !== undefined)
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
          const font = FONTS[style];
          if (font !== undefined) cell.font = font;
          if (style === "header") cell.alignment = { vertical: "middle", wrapText: true };
          if (style === "total" || style === "highlight")
            cell.border = { top: { style: "thin", color: { argb: "FF8899AA" } } };
        }
        if (data.span !== undefined && data.span > 1) {
          sheet.mergeCells(rowIndex + 1, columnIndex + 1, rowIndex + 1, columnIndex + data.span);
          cell.alignment = { ...cell.alignment, wrapText: true, vertical: "top" };
          // Excel no ajusta el alto de las filas combinadas: se estima por el largo del texto.
          const room = widths
            .slice(columnIndex, columnIndex + data.span)
            .reduce((sum, width) => sum + width, 0);
          const text = String(data.value ?? "");
          sheet.getRow(rowIndex + 1).height = Math.max(
            15,
            Math.ceil(text.length / Math.max(room, 10)) * 15,
          );
        }
      }),
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
