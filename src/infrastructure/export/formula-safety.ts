/**
 * Caracteres con los que una hoja de cálculo interpreta la celda como fórmula
 * (inyección de fórmulas). Se neutralizan anteponiendo un apóstrofo, que Excel
 * y Hojas de cálculo tratan como marca de texto literal.
 */
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** Texto que Excel no ejecuta como fórmula al abrirlo o pegarlo. */
export function neutralizeFormula(value: string): string {
  const first = value[0];
  if (first === undefined || !FORMULA_TRIGGERS.has(first)) return value;
  // Un número negativo legítimo ("-3,5") no es una fórmula: se deja intacto.
  if (first === "-" && /^-\d[\d.,]*$/.test(value)) return value;
  return `'${value}`;
}
