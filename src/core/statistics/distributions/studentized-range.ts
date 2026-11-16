import { invertCdf, standardNormalCdf } from "./continuous";
import { lnGamma } from "./special";

/*
 * Distribución del rango estudentizado (prueba de Tukey). Traducción del
 * algoritmo de Copenhaver y Holland (1988) tal como lo usa R en `ptukey`:
 * integración de Gauss-Legendre sobre la densidad del rango y sobre la
 * chi de la desviación.
 */

const XLEG = [
  0.98156063424671925069, 0.90411725637047485668, 0.76990267419430468704, 0.5873179542866174473,
  0.36783149899818019375, 0.12523340851146891547,
];
const ALEG = [
  0.047175336386511827195, 0.10693932599531843096, 0.16007832854334622633, 0.20316742672306592175,
  0.23349253653835480876, 0.249147045813402785,
];

/** P(rango de cc normales estándar ≤ w), con rr rangos. */
function wprob(w: number, rr: number, cc: number): number {
  const nleg = 12;
  const ihalf = 6;
  const qsqz = w * 0.5;
  if (qsqz >= 8) return 1;
  let prW = 2 * standardNormalCdf(qsqz) - 1;
  prW = prW >= 1 ? 1 : prW ** cc;
  const wincr = w > 3 ? 2 : 3;
  let blb = qsqz;
  const binc = (8 - qsqz) / wincr;
  let bub = blb + binc;
  let einsum = 0;
  const cc1 = cc - 1;
  for (let wi = 1; wi <= wincr; wi += 1) {
    let elsum = 0;
    const a = 0.5 * (bub + blb);
    const b = 0.5 * (bub - blb);
    for (let jj = 1; jj <= nleg; jj += 1) {
      let j: number;
      let xx: number;
      if (ihalf < jj) {
        j = nleg - jj + 1;
        xx = XLEG[j - 1] ?? 0;
      } else {
        j = jj;
        xx = -(XLEG[j - 1] ?? 0);
      }
      const ac = a + b * xx;
      const qexpo = ac * ac;
      if (qexpo > 60) break;
      const pplus = 2 * standardNormalCdf(ac);
      const pminus = 2 * standardNormalCdf(ac - w);
      let rinsum = pplus * 0.5 - pminus * 0.5;
      if (rinsum >= Math.exp(-30 / cc1)) {
        rinsum = (ALEG[j - 1] ?? 0) * Math.exp(-0.5 * qexpo) * rinsum ** cc1;
        elsum += rinsum;
      }
    }
    elsum *= (2 * b * cc) / Math.sqrt(2 * Math.PI);
    einsum += elsum;
    blb = bub;
    bub += binc;
  }
  prW += einsum;
  if (prW <= Math.exp(-30 / rr)) return 0;
  prW = prW ** rr;
  return prW >= 1 ? 1 : prW;
}

const XLEGQ = [
  0.9894009349916499326, 0.94457502307323257608, 0.86563120238783174388, 0.7554044083550030339,
  0.61787624440264374845, 0.45801677765722738634, 0.28160355077925891323, 0.095012509837637440185,
];
const ALEGQ = [
  0.027152459411754094852, 0.062253523938647892863, 0.09515851168249278481, 0.12462897125553387205,
  0.14959598881657673208, 0.16915651939500253819, 0.18260341504492358887, 0.18945061045506849629,
];

/**
 * P(Q ≤ q) del rango estudentizado con `k` grupos y `df` grados de libertad
 * (`ptukey(q, k, df)` de R).
 */
export function studentizedRangeCdf(q: number, k: number, df: number): number {
  if (q <= 0) return 0;
  if (df > 25000) return wprob(q, 1, k);
  const nlegq = 16;
  const ihalfq = 8;
  const f2 = df * 0.5;
  let f2lf = f2 * Math.log(df) - df * Math.LN2 - lnGamma(f2);
  const f21 = f2 - 1;
  const ff4 = df * 0.25;
  const ulen = df <= 100 ? 1 : df <= 800 ? 0.5 : df <= 5000 ? 0.25 : 0.125;
  f2lf += Math.log(ulen);
  let ans = 0;
  for (let i = 1; i <= 50; i += 1) {
    let otsum = 0;
    const twa1 = (2 * i - 1) * ulen;
    for (let jj = 1; jj <= nlegq; jj += 1) {
      let j: number;
      let t1: number;
      if (ihalfq < jj) {
        j = jj - ihalfq - 1;
        const x = (XLEGQ[j] ?? 0) * ulen;
        t1 = f2lf + f21 * Math.log(twa1 + x) - (x + twa1) * ff4;
      } else {
        j = jj - 1;
        const x = (XLEGQ[j] ?? 0) * ulen;
        t1 = f2lf + f21 * Math.log(twa1 - x) + (x - twa1) * ff4;
      }
      if (t1 >= -30) {
        const x = (XLEGQ[j] ?? 0) * ulen;
        const qsqz =
          ihalfq < jj ? q * Math.sqrt((x + twa1) * 0.5) : q * Math.sqrt((twa1 - x) * 0.5);
        otsum += wprob(qsqz, 1, k) * (ALEGQ[j] ?? 0) * Math.exp(t1);
      }
    }
    if (i * ulen >= 1 && otsum <= 1e-14) break;
    ans += otsum;
  }
  return Math.min(1, ans);
}

/** Cuantil del rango estudentizado (`qtukey(p, k, df)`). */
export function studentizedRangeQuantile(p: number, k: number, df: number): number {
  return invertCdf((q) => studentizedRangeCdf(q, k, df), p, 0, 6);
}
