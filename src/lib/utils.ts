import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind de forma segura, resolviendo conflictos
 * (p. ej. "p-2 p-4" -> "p-4") y aceptando condicionales.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
