import type { CellValue, VariableKind } from "./types";

/** Resultado de inferir el tipo de una variable a partir de sus valores. */
export interface KindInference {
  readonly kind: VariableKind;
  /** Nivel de confianza entre 0 y 1. */
  readonly confidence: number;
  /** Motivo en español, legible por una persona no técnica. */
  readonly reason: string;
}

/**
 * Infiere el `VariableKind` (nominal, ordinal, discreta o continua) de una
 * columna de valores ya limpios (números o texto; `null` = faltante).
 *
 * Reglas:
 * - Si se provee `knownOrder`, y todas las categorías observadas están
 *   contenidas en ese orden, se infiere "ordinal" con confianza alta.
 * - Si todos los valores no nulos son numéricos y enteros, "discreta".
 * - Si todos los valores no nulos son numéricos con al menos un decimal,
 *   "continua".
 * - Si hay mezcla de números y texto, "nominal" con confianza baja y aviso
 *   de tipo mixto.
 * - En cualquier otro caso (texto puro), "nominal".
 *
 * La inferencia es siempre una sugerencia editable por la persona usuaria.
 */
export function inferVariableKind(
  values: readonly CellValue[],
  knownOrder?: readonly string[],
): KindInference {
  const present = values.filter((v): v is string | number => v !== null);

  if (present.length === 0) {
    return {
      kind: "nominal",
      confidence: 0.3,
      reason: "No hay datos suficientes para inferir el tipo; se asigna nominal por defecto.",
    };
  }

  if (knownOrder && knownOrder.length > 0) {
    const asStrings = present.map((v) => String(v));
    const allInOrder = asStrings.every((v) => knownOrder.includes(v));
    if (allInOrder) {
      return {
        kind: "ordinal",
        confidence: 0.95,
        reason: "Todas las categorías coinciden con el orden declarado por la persona usuaria.",
      };
    }
  }

  const numericCount = present.filter((v) => typeof v === "number").length;
  const textCount = present.length - numericCount;

  if (numericCount === present.length) {
    const hasDecimals = present.some((v) => typeof v === "number" && !Number.isInteger(v));
    if (hasDecimals) {
      return {
        kind: "continua",
        confidence: 0.9,
        reason: "Todos los valores son numéricos y al menos uno tiene decimales.",
      };
    }
    const distinctCount = new Set(present).size;
    const looksDiscrete = distinctCount <= Math.max(20, present.length * 0.3);
    return {
      kind: "discreta",
      confidence: looksDiscrete ? 0.85 : 0.6,
      reason: looksDiscrete
        ? "Todos los valores son enteros y forman un conjunto acotado de categorías numéricas."
        : "Todos los valores son enteros, aunque con muchos valores distintos.",
    };
  }

  if (numericCount > 0 && textCount > 0) {
    return {
      kind: "nominal",
      confidence: 0.4,
      reason:
        "La columna mezcla texto y números; se trata como nominal y conviene revisarla manualmente.",
    };
  }

  return {
    kind: "nominal",
    confidence: 0.7,
    reason: "Todos los valores son texto sin un orden declarado.",
  };
}
