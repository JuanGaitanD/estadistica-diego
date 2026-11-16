"use client";

import { Check, FilePlus2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { useReportStore, type ReportItemInput } from "../store/report-store";

export interface AddToReportButtonProps {
  /** Arma la copia del resultado en el momento de añadirlo (puede capturar gráficas). */
  readonly build: () => ReportItemInput | Promise<ReportItemInput>;
  /** Qué se añade, para el nombre accesible («la variable Nota»). */
  readonly what: string;
}

/** «Añadir al informe» (RF-43). */
export function AddToReportButton({ build, what }: AddToReportButtonProps) {
  const add = useReportStore((state) => state.add);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  const handleClick = async (): Promise<void> => {
    setState("busy");
    try {
      add(await build());
      setState("done");
      toast.success(`Añadiste ${what} al informe.`);
    } catch {
      setState("idle");
      toast.error(`No se pudo añadir ${what} al informe.`);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={state === "busy"}
      aria-label={`Añadir ${what} al informe`}
      onClick={() => void handleClick()}
    >
      {state === "done" ? <Check aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
      {state === "done" ? "En el informe" : "Añadir al informe"}
    </Button>
  );
}
