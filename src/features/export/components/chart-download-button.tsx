"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { TARGET_44 } from "./copy-button";
import {
  captureElementAsPng,
  copyImage,
  exportElementAsPng,
  exportElementAsSvg,
} from "@/infrastructure/export";

export interface ChartDownloadButtonProps {
  readonly elementId: string;
  /** Nombre base del archivo, sin extensión. */
  readonly filename: string;
}

type Action = "copiar" | "png" | "svg";

/** Acciones de una gráfica: copiar como imagen, descargar PNG o SVG (RF-33, RF-54). */
export function ChartDownloadButton({ elementId, filename }: ChartDownloadButtonProps) {
  const [busy, setBusy] = useState<Action | null>(null);
  const base = filename.replace(/\.(png|svg)$/i, "");

  const run = async (action: Action): Promise<void> => {
    setBusy(action);
    try {
      if (action === "png") await exportElementAsPng(elementId, `${base}.png`);
      if (action === "svg") exportElementAsSvg(elementId, `${base}.svg`);
      if (action === "copiar") {
        const element = document.getElementById(elementId);
        if (element === null) throw new Error("sin gráfica");
        await copyImage(await captureElementAsPng(element));
        toast.success("Copiaste la gráfica como imagen.");
      }
    } catch {
      toast.error(
        action === "copiar" ? "No se pudo copiar la gráfica." : "No se pudo descargar la gráfica.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={TARGET_44}
        disabled={busy !== null}
        onClick={() => void run("copiar")}
      >
        Copiar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={TARGET_44}
        disabled={busy !== null}
        aria-label="Descargar la gráfica en PNG"
        onClick={() => void run("png")}
      >
        PNG
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={TARGET_44}
        disabled={busy !== null}
        aria-label="Descargar la gráfica en SVG"
        onClick={() => void run("svg")}
      >
        SVG
      </Button>
    </>
  );
}
