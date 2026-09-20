/**
 * Suma compensada de Neumaier.
 *
 * Fórmula: acumula la suma y, por separado, la pérdida de precisión de cada
 * término (`c`), devolviendo `suma + c`. Evita la deriva de la suma ingenua
 * cuando los sumandos tienen magnitudes muy distintas.
 *
 * @param values - Valores finitos a sumar.
 * @returns La suma compensada; `0` para un array vacío.
 */
export function neumaierSum(values: readonly number[]): number {
  let sum = 0;
  let compensation = 0;
  for (const value of values) {
    const t = sum + value;
    compensation += Math.abs(sum) >= Math.abs(value) ? sum - t + value : value - t + sum;
    sum = t;
  }
  return sum + compensation;
}

/**
 * Media aritmética cruda, sin validaciones de dominio ni explicación.
 *
 * Fórmula: `x̄ = (1/n) · suma de xi`, con la suma compensada de Neumaier.
 *
 * @param values - Valores finitos.
 * @returns La media, o `null` si no hay datos.
 */
export function rawMean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return neumaierSum(values) / values.length;
}
