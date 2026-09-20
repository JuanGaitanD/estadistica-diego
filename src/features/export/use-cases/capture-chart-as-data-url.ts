import { captureElementAsPng, ExportError } from "@/infrastructure/export";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new ExportError("read-failed", "Error al leer la imagen capturada"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Captura un elemento del DOM (por id) como PNG y lo devuelve como data URL,
 * listo para incrustar en una sección `{ kind: "image" }` de `ReportPdfSpec`.
 * Encapsula la dependencia de `infrastructure/export` para que
 * `build-report-spec.ts` reciba esta función inyectada y siga siendo
 * testeable sin DOM real.
 */
export async function captureChartAsDataUrl(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new ExportError("element-not-found", "No se encontró el elemento de la gráfica");
  }
  const blob = await captureElementAsPng(element);
  return blobToDataUrl(blob);
}
