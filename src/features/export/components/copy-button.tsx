"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyText } from "@/infrastructure/export";

export interface CopyButtonProps {
  /** Texto a copiar; se calcula al pulsar. */
  readonly getText: () => string;
  /** Qué se copia, para el nombre accesible y el aviso («la interpretación»). */
  readonly what: string;
  readonly label?: string;
}

/** Botón «Copiar» con confirmación breve (RF-54). */
export function CopyButton({ getText, what, label = "Copiar" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (): Promise<void> => {
    try {
      await copyText(getText());
      setCopied(true);
      toast.success(`Copiaste ${what}.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`No se pudo copiar ${what}.`);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`${label} ${what}`}
      onClick={() => void handleClick()}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {label}
    </Button>
  );
}
