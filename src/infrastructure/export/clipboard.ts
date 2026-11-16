/**
 * Copiar al portapapeles (RF-54). `navigator.clipboard` existe en todos los
 * navegadores del suelo declarado (Safari 16.4+, Chrome 111+, Firefox 128+)
 * y solo en contexto seguro (HTTPS o localhost).
 */
export class ClipboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipboardError";
  }
}

function clipboard(): Clipboard {
  if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
    throw new ClipboardError("Este navegador no permite copiar desde la página.");
  }
  return navigator.clipboard;
}

/** Copia texto plano. */
export async function copyText(text: string): Promise<void> {
  await clipboard().writeText(text);
}

/** Copia una imagen (PNG) para pegarla en documentos, chats o presentaciones. */
export async function copyImage(blob: Blob): Promise<void> {
  const api = clipboard();
  if (typeof ClipboardItem === "undefined") {
    throw new ClipboardError("Este navegador no permite copiar imágenes.");
  }
  await api.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
}

/**
 * Tabla como texto separado por tabuladores: se pega en Excel, Hojas de
 * cálculo o Word como tabla. Los tabuladores y saltos dentro de una celda se
 * reemplazan por espacios para no romper la cuadrícula.
 */
export function tableToTsv(
  columns: readonly string[],
  rows: readonly (readonly (string | number)[])[],
): string {
  const clean = (cell: string | number): string => String(cell).replace(/[\t\r\n]+/g, " ");
  return [columns, ...rows].map((row) => row.map(clean).join("\t")).join("\n");
}
