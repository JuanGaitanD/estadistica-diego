"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseLocaleNumber } from "@/core/data";

/** Selector con etiqueta, a ancho completo. */
export function Field({
  label,
  value,
  onChange,
  options,
  placeholder = "Elige",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { id: string; label: string }[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
