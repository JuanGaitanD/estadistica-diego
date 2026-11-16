"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseLocaleNumber } from "@/core/data";

/** Lee un número escrito por una persona (coma decimal), o `null`. */
export function readNumber(text: string): number | null {
  return parseLocaleNumber(text, undefined, ",").value;
}

export interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  /** Error a mostrar asociado al campo. */
  error?: string | null;
  className?: string;
}

/** Campo numérico con etiqueta, teclado decimal en móvil y error asociado. */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  error = null,
  className,
}: NumberFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className ?? "flex min-w-0 flex-col gap-1.5"}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...(placeholder !== undefined ? { placeholder } : {})}
        aria-invalid={error !== null}
        {...(error !== null ? { "aria-describedby": errorId } : {})}
      />
      {error !== null ? (
        <p id={errorId} className="text-destructive text-sm font-semibold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
