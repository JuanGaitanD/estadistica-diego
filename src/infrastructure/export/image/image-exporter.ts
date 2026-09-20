import { toBlob } from "html-to-image";
import { downloadBlob } from "../download-blob";

/** Error de exportación de imágenes, con código estable y mensaje en español. */
export class ExportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ExportError";
    this.code = code;
  }
}

/** Opciones de captura de un elemento como PNG. */
export interface CaptureElementOptions {
  /** Relación de píxeles de la imagen resultante. Por defecto `2`. */
  readonly pixelRatio?: number;
  /** Color de fondo forzado (evita fondos transparentes en el PDF/descarga). Por defecto blanco. */
  readonly backgroundColor?: string;
}

/**
 * Captura un elemento del DOM como PNG usando `html-to-image`, forzando un
 * fondo blanco y una relación de píxeles alta por defecto para que la
 * imagen se vea nítida al incrustarla en el PDF o al descargarla suelta.
 */
export async function captureElementAsPng(
  element: HTMLElement,
  options: CaptureElementOptions = {},
): Promise<Blob> {
  const pixelRatio = options.pixelRatio ?? 2;
  const backgroundColor = options.backgroundColor ?? "#ffffff";

  let blob: Blob | null;
  try {
    blob = await toBlob(element, { pixelRatio, backgroundColor });
  } catch {
    throw new ExportError("capture-failed", "Error al capturar la imagen");
  }

  if (!blob) {
    throw new ExportError("capture-failed", "Error al capturar la imagen");
  }

  return blob;
}

/** Reemplaza caracteres no válidos en nombres de archivo, igual que `download-blob`. */
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, "-").trim();
  return cleaned.length > 0 ? cleaned : "descarga";
}

/**
 * Busca un elemento por id, lo captura como PNG y dispara su descarga.
 * Lanza `ExportError` si el elemento no existe en el DOM.
 */
export async function exportElementAsPng(
  elementId: string,
  filename: string,
  options: CaptureElementOptions = {},
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new ExportError("element-not-found", "No se encontró el elemento de la gráfica");
  }

  const blob = await captureElementAsPng(element, options);
  downloadBlob(blob, filename.endsWith(".png") ? filename : `${filename}.png`);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Descarga una PNG por cada id de elemento indicado, en orden, con una
 * pequeña pausa entre cada descarga para que el navegador no bloquee
 * descargas múltiples disparadas de forma consecutiva.
 */
export async function exportAllChartsAsPng(
  elementIds: readonly string[],
  baseName: string,
  options: CaptureElementOptions = {},
): Promise<void> {
  const safeBaseName = sanitizeFilename(baseName);

  for (let index = 0; index < elementIds.length; index += 1) {
    const elementId = elementIds[index];
    if (elementId === undefined) continue;

    const filename = `${safeBaseName}-${index + 1}.png`;
    await exportElementAsPng(elementId, filename, options);

    if (index < elementIds.length - 1) {
      await wait(300);
    }
  }
}
