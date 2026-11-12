"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportElementAsPng } from "@/infrastructure/export";

export interface ChartDownloadButtonProps {
  readonly elementId: string;
  readonly filename: string;
}

/** Botón pequeño para descargar una gráfica individual como PNG. */
export function ChartDownloadButton({ elementId, filename }: ChartDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClick = async (): Promise<void> => {
    setIsDownloading(true);
    try {
      await exportElementAsPng(elementId, filename);
    } catch {
      toast.error("No se pudo descargar la gráfica.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isDownloading}
      onClick={() => void handleClick()}
    >
      Descargar PNG
    </Button>
  );
}
