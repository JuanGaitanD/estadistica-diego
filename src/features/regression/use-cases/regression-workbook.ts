import type { SimpleRegression } from "@/core/statistics";
import type { ExportableTable, ExportCell } from "@/infrastructure/export";

/**
 * Libro de Excel de la regresión con **fórmulas vivas** (RF-55): la tabla de
 * trabajo calcula X², XY, Ŷ, e, e² y (Y − Ȳ)² con fórmulas, y al lado van
 * b1, b0, R², r, SCE, SCT, el error estándar y las sumas de las ecuaciones
 * normales. Si se cambia un dato, todo se recalcula: sirve para comprobar en
 * clase. Las fórmulas van en la sintaxis interna (inglés); Excel las muestra
 * en español.
 */
export function regressionWorkbook(
  model: SimpleRegression,
  xName: string,
  yName: string,
): ExportableTable[] {
  const first = 2;
  const last = model.n + 1;
  const range = (column: string): string => `${column}${first}:${column}${last}`;
  const measures: [string, ExportCell][] = [
    [
      "Pendiente b1 (PENDIENTE)",
      { formula: `SLOPE(${range("B")},${range("A")})`, value: model.b1 },
    ],
    [
      "Intersección b0 (INTERSECCION.EJE)",
      { formula: `INTERCEPT(${range("B")},${range("A")})`, value: model.b0 },
    ],
    ["R² (COEFICIENTE.R2)", { formula: `RSQ(${range("B")},${range("A")})`, value: model.r2 }],
    ["r (COEF.DE.CORREL)", { formula: `CORREL(${range("A")},${range("B")})`, value: model.r }],
    ["SCE = Σe²", { formula: `SUM(${range("G")})`, value: model.sce }],
    ["SCT = Σ(Y − Ȳ)²", { formula: `SUM(${range("H")})`, value: model.sct }],
    [
      "Error estándar de la estimación (ERROR.TIPICO.XY)",
      { formula: `STEYX(${range("B")},${range("A")})`, value: model.standardError },
    ],
    ["n", { formula: `COUNT(${range("A")})`, value: model.n }],
    ["ΣX", { formula: `SUM(${range("A")})`, value: model.sumX }],
    ["ΣY", { formula: `SUM(${range("B")})`, value: model.sumY }],
    ["ΣX²", { formula: `SUM(${range("C")})`, value: model.sumXX }],
    ["ΣXY", { formula: `SUM(${range("D")})`, value: model.sumXY }],
  ];
  const rows: ExportCell[][] = [];
  const height = Math.max(model.n, measures.length);
  for (let i = 0; i < height; i += 1) {
    const r = i + first;
    const row = model.rows[i];
    const work: ExportCell[] =
      row === undefined
        ? [null, null, null, null, null, null, null, null]
        : [
            row.x,
            row.y,
            { formula: `A${r}^2`, value: row.xx },
            { formula: `A${r}*B${r}`, value: row.xy },
            { formula: `$K$3+$K$2*A${r}`, value: row.fitted },
            { formula: `B${r}-E${r}`, value: row.residual },
            { formula: `F${r}^2`, value: row.residualSquared },
            {
              formula: `(B${r}-AVERAGE($B$${first}:$B$${last}))^2`,
              value: row.totalSquared,
            },
          ];
    const measure = measures[i];
    rows.push([...work, null, measure?.[0] ?? null, measure?.[1] ?? null]);
  }
  return [
    {
      title: "Regresión",
      columns: [
        `X (${xName})`,
        `Y (${yName})`,
        "X²",
        "XY",
        "Ŷ = b0 + b1·X",
        "e = Y − Ŷ",
        "e²",
        "(Y − Ȳ)²",
        "",
        "Medida",
        "Valor",
      ],
      rows,
    },
  ];
}
