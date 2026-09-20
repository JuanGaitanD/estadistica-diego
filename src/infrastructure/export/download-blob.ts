/** Reemplaza caracteres no válidos en nombres de archivo de Windows/macOS/Linux. */
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, "-").trim();
  return cleaned.length > 0 ? cleaned : "descarga";
}

/**
 * Dispara la descarga de un `Blob` en el navegador con el nombre de archivo
 * indicado (saneado). Aislada del resto de exportadores para poder probarlos
 * sin depender de un DOM real de descarga.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const safeName = sanitizeFilename(filename);
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
