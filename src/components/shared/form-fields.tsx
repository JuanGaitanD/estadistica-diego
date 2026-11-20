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

/**
 * Qué acepta un campo numérico: `signed` (con signo, por defecto),
 * `decimal` (sin signo; montos, tasas, cantidades) o `integer` (solo dígitos).
 */
export type NumberKind = "signed" | "decimal" | "integer";

const NOT_ALLOWED: Readonly<Record<NumberKind, RegExp>> = {
  signed: /[^\d.,-]/g,
  decimal: /[^\d.,]/g,
  integer: /\D/g,
};

/**
 * Quita lo que no puede ir en un número escrito a mano: letras, espacios y
 * símbolos. Deja dígitos, la coma y el punto (decimal o de miles) y, si es
 * con signo, un solo «-» al inicio.
 */
export function cleanNumberText(text: string, kind: NumberKind = "signed"): string {
  const kept = text.replace(NOT_ALLOWED[kind], "");
  return kind === "signed" ? kept.replace(/(?!^)-/g, "") : kept;
}

export interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  /** Error a mostrar asociado al campo. */
  error?: string | null;
  className?: string;
  /** Al salir del campo (por ejemplo, para darle formato al número). */
  onBlur?: () => void;
  /** Qué caracteres acepta; por defecto, un número con signo. */
  kind?: NumberKind;
}

/**
 * Campo numérico con etiqueta, teclado numérico en móvil y error asociado. No
 * deja escribir letras ni símbolos: se usa texto (no `type="number"`) para
 * aceptar la coma decimal y los puntos de miles.
 */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  error = null,
  className,
  onBlur,
  kind = "signed",
}: NumberFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className ?? "flex min-w-0 flex-col gap-1.5"}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode={kind === "integer" ? "numeric" : "decimal"}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(cleanNumberText(event.target.value, kind))}
        {...(onBlur !== undefined ? { onBlur } : {})}
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
