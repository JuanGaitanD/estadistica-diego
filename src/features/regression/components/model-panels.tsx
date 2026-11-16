"use client";

import { useId, useState, type ReactNode } from "react";

import { ModelChart } from "@/components/charts";
import { Field, NumberField, readNumber } from "@/components/shared/form-fields";
import {
  InterpretationPanel,
  interpretationToText,
} from "@/components/shared/interpretation-panel";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable } from "@/components/tables/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { CellValue } from "@/core/data";
import {
  compareDegrees,
  confusionMatrix,
  formatCount,
  formatOdds,
  formatP,
  formatValue,
  interpretLogistic,
  interpretMultiple,
  LOGISTIC_REASONS,
  logisticRegression,
  logisticSteps,
  MULTIPLE_REASONS,
  multipleRegression,
  multipleSteps,
  polynomialCenter,
  polynomialRegression,
  polynomialTerms,
  predictLogistic,
  predictMultiple,
  type CalculationStep,
  type Interpretation,
} from "@/core/statistics";
import { captureChartAsDataUrl, ChartDownloadButton, CopyButton } from "@/features/export";
import { AddToReportButton } from "@/features/report";

import { binaryY, buildDesign, numericY, type ModelColumn } from "../use-cases/design";

const FIT_ID = "chart-modelo-ajuste";
const RESIDUAL_ID = "chart-modelo-residuos";

interface TextTable {
  readonly title: string;
  /** Qué contiene la tabla (se lee bajo el título). */
  readonly caption: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

function categoriesOf(values: readonly CellValue[]): string[] {
  return [...new Set(values.filter((v) => v !== null).map(String))];
}

function Message({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-muted-foreground sl-surface p-5">
      {children}
    </p>
  );
}

function TableCard({ table }: { table: TextTable }) {
  return (
    <SectionCard title={table.title}>
      <DataTable
        columns={table.columns.map((label, index) => ({
          key: String(index),
          label,
          ...(index > 0 ? { align: "right" as const } : {}),
          format: (row: readonly string[]) => row[index] ?? "",
        }))}
        rows={[...table.rows]}
        caption={table.caption}
        getRowKey={(row) => row[0] ?? ""}
      />
    </SectionCard>
  );
}

/** Lista de casillas para elegir las variables que predicen. */
function PredictorPicker({
  columns,
  chosen,
  onChange,
}: {
  columns: readonly ModelColumn[];
  chosen: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  const id = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">Variables que predicen</legend>
      {columns.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay otras variables en el análisis.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {columns.map((column) => (
            <label
              key={column.id}
              htmlFor={`${id}-${column.id}`}
              className="flex min-h-11 items-center gap-3"
            >
              <Checkbox
                id={`${id}-${column.id}`}
                checked={chosen.includes(column.id)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked === true
                      ? [...chosen, column.id]
                      : chosen.filter((entry) => entry !== column.id),
                  )
                }
              />
              <span>
                {column.name}
                {column.quantitative ? null : (
                  <span className="text-muted-foreground text-sm"> (categorías)</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function Result({
  name,
  interpretation,
  steps,
  tables,
  charts,
  chartIds,
}: {
  name: string;
  interpretation: Interpretation;
  steps: readonly CalculationStep[];
  tables: readonly TextTable[];
  charts: ReactNode;
  chartIds: readonly { id: string; title: string }[];
}) {
  return (
    <>
      <InterpretationPanel
        title="Qué dice el modelo"
        name={name}
        interpretation={interpretation}
        steps={steps}
        actions={
          <>
            <CopyButton
              what="la interpretación"
              getText={() => interpretationToText(interpretation)}
            />
            <AddToReportButton
              what="el modelo"
              build={async () => {
                const images: { title: string; dataUrl: string }[] = [];
                for (const chart of chartIds) {
                  try {
                    images.push({
                      title: chart.title,
                      dataUrl: await captureChartAsDataUrl(chart.id),
                    });
                  } catch {
                    // La gráfica no está en pantalla: el informe sigue sin ella.
                  }
                }
                return {
                  title: name,
                  interpretation,
                  steps,
                  tables: tables.map((table) => ({
                    title: table.title,
                    columns: [...table.columns],
                    rows: table.rows.map((row) => [...row]),
                  })),
                  images,
                };
              }}
            />
          </>
        }
      />
      {tables.map((table) => (
        <TableCard key={table.title} table={table} />
      ))}
      {charts}
    </>
  );
}

function curvePoints(min: number, max: number, at: (x: number) => number) {
  return Array.from({ length: 61 }, (_, i) => {
    const x = min + ((max - min) * i) / 60;
    return { x, y: at(x) };
  });
}

/**
 * «¿Puedo predecir con varias variables a la vez? ¿Y si es una curva?»
 * (M7): regresión múltiple con indicadoras o polinómica con elección de grado.
 */
export function MultipleRegressionPanel({ columns }: { columns: readonly ModelColumn[] }) {
  const numeric = columns.filter((c) => c.quantitative);
  const [mode, setMode] = useState<"varias" | "curva">("varias");
  const [yId, setYId] = useState(numeric[0]?.id ?? "");
  const [xId, setXId] = useState(numeric[1]?.id ?? "");
  const [degreeText, setDegreeText] = useState("2");
  const others = columns.filter((c) => c.id !== yId);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const picked = (chosen ?? others.filter((c) => c.quantitative).map((c) => c.id)).filter((id) =>
    others.some((c) => c.id === id),
  );
  const target = numeric.find((c) => c.id === yId);
  const xColumn = numeric.find((c) => c.id === xId && c.id !== yId);
  const degree = Number(degreeText);

  let body: ReactNode = null;
  if (target === undefined) {
    body = <Message>Hace falta una variable numérica para predecir.</Message>;
  } else if (mode === "varias" && picked.length === 0) {
    body = <Message>Marca al menos una variable que prediga.</Message>;
  } else if (mode === "curva" && xColumn === undefined) {
    body = <Message>Elige una X numérica distinta de lo que quieres predecir.</Message>;
  } else {
    const used = mode === "varias" ? others.filter((c) => picked.includes(c.id)) : [xColumn!];
    const design = buildDesign(target, used, numericY);
    const x = design.predictors[0]?.values ?? [];
    const result =
      mode === "varias"
        ? multipleRegression(design.predictors, design.y)
        : polynomialRegression(x, design.y, degree, xColumn!.name);
    if (!result.ok) {
      body = <Message>{MULTIPLE_REASONS[result.reason]}</Message>;
    } else {
      const model = result.model;
      const degrees = mode === "curva" ? compareDegrees(x, design.y, 4) : undefined;
      const interpretation = interpretMultiple(
        model,
        target.name,
        mode === "curva" ? { polynomialDegree: degree, ...(degrees ? { degrees } : {}) } : {},
      );
      const dropped =
        design.dropped > 0
          ? [
              `Se dejaron fuera ${formatCount(design.dropped)} filas a las que les faltaba algún dato.`,
            ]
          : [];
      const name =
        mode === "curva"
          ? `Curva de grado ${degree}: ${target.name} según ${xColumn!.name}`
          : `${target.name} según ${used.map((c) => c.name).join(", ")}`;
      const coefficients: TextTable = {
        title: "Coeficientes",
        caption:
          "Cada término con su error estándar, su valor p y su intervalo de confianza del 95 %",
        columns: ["Término", "Coeficiente", "Error estándar", "Valor p", "IC 95 %"],
        rows: model.coefficients.map((c) => [
          c.name,
          formatValue(c.estimate, 4),
          formatValue(c.se, 4),
          formatP(c.p),
          `${formatValue(c.lower, 3)} a ${formatValue(c.upper, 3)}`,
        ]),
      };
      const fitPoints =
        mode === "curva"
          ? x.map((v, i) => ({ x: v, y: design.y[i]! }))
          : model.fitted.map((v, i) => ({ x: v, y: model.y[i]! }));
      const min = Math.min(...(mode === "curva" ? x : model.fitted));
      const max = Math.max(...(mode === "curva" ? x : model.fitted));
      const line =
        mode === "curva"
          ? curvePoints(min, max, (v) =>
              predictMultiple(model, polynomialTerms(v, degree, polynomialCenter(x))),
            )
          : [
              { x: min, y: min },
              { x: max, y: max },
            ];
      body = (
        <Result
          name={name}
          interpretation={{ ...interpretation, caveats: [...dropped, ...interpretation.caveats] }}
          steps={multipleSteps(model, target.name)}
          tables={[coefficients]}
          chartIds={[
            { id: FIT_ID, title: mode === "curva" ? "Curva ajustada" : "Real contra predicho" },
            { id: RESIDUAL_ID, title: "Residuos" },
          ]}
          charts={
            <>
              <ModelChart
                id={FIT_ID}
                title={mode === "curva" ? "Los datos y la curva" : "Real contra predicho"}
                description={
                  mode === "curva"
                    ? "Cada punto es un dato; la línea es la curva del modelo."
                    : "Si el modelo acertara siempre, todos los puntos caerían sobre la diagonal."
                }
                points={fitPoints}
                line={line}
                xLabel={mode === "curva" ? xColumn!.name : `${target.name} predicho`}
                yLabel={target.name}
                summary={interpretation.headline}
                actions={<ChartDownloadButton elementId={FIT_ID} filename="modelo_ajuste.png" />}
              />
              <ModelChart
                id={RESIDUAL_ID}
                title="Residuos"
                description="Si el modelo es adecuado, los puntos se reparten sin forma alrededor de 0."
                points={model.fitted.map((v, i) => ({ x: v, y: model.residuals[i]! }))}
                zeroLine
                xLabel={`${target.name} predicho`}
                yLabel="residuo (real − predicho)"
                summary={`Residuos del modelo de ${target.name}`}
                actions={
                  <ChartDownloadButton elementId={RESIDUAL_ID} filename="modelo_residuos.png" />
                }
              />
            </>
          }
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="sl-surface flex flex-col gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Qué quieres predecir (Y)"
            value={yId}
            onChange={setYId}
            options={numeric.map((c) => ({ id: c.id, label: c.name }))}
          />
          <Field
            label="Cómo"
            value={mode}
            onChange={(v) => setMode(v as "varias" | "curva")}
            options={[
              { id: "varias", label: "Con varias variables a la vez" },
              { id: "curva", label: "Con una curva (una sola X)" },
            ]}
          />
        </div>
        {mode === "varias" ? (
          <PredictorPicker columns={others} chosen={picked} onChange={setChosen} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Lo que conoces (X)"
              value={xId}
              onChange={setXId}
              options={numeric
                .filter((c) => c.id !== yId)
                .map((c) => ({ id: c.id, label: c.name }))}
            />
            <Field
              label="Grado de la curva"
              value={degreeText}
              onChange={setDegreeText}
              options={[
                { id: "1", label: "1 (recta)" },
                { id: "2", label: "2 (parábola)" },
                { id: "3", label: "3" },
                { id: "4", label: "4" },
              ]}
            />
          </div>
        )}
      </div>
      {body}
    </div>
  );
}

/** «¿Puedo predecir un sí o un no?» (M8): regresión logística. */
export function LogisticPanel({ columns }: { columns: readonly ModelColumn[] }) {
  const binaryCandidates = columns.filter((c) => categoriesOf(c.values).length >= 2);
  const preferred =
    binaryCandidates.find((c) => !c.quantitative && categoriesOf(c.values).length === 2) ??
    binaryCandidates.find((c) => !c.quantitative) ??
    binaryCandidates[0];
  const [yId, setYId] = useState(preferred?.id ?? "");
  const [yes, setYes] = useState("");
  const [thresholdText, setThresholdText] = useState("50");
  const [chosen, setChosen] = useState<string[] | null>(null);
  const target = binaryCandidates.find((c) => c.id === yId);
  const categories = target ? categoriesOf(target.values) : [];
  const yesLabel = categories.includes(yes)
    ? yes
    : (categories.find((c) => /^(s[ií]|yes|true|1)$/i.test(c.trim())) ?? categories[0] ?? "");
  const others = columns.filter((c) => c.id !== yId);
  const picked = (chosen ?? others.filter((c) => c.quantitative).map((c) => c.id)).filter((id) =>
    others.some((c) => c.id === id),
  );
  const thresholdValue = readNumber(thresholdText);

  let body: ReactNode = null;
  if (target === undefined) {
    body = (
      <Message>Hace falta una variable con al menos dos respuestas (por ejemplo, sí y no).</Message>
    );
  } else if (picked.length === 0) {
    body = <Message>Marca al menos una variable que prediga.</Message>;
  } else if (thresholdValue === null || thresholdValue <= 0 || thresholdValue >= 100) {
    body = <Message>El umbral tiene que ser un porcentaje entre 0 y 100.</Message>;
  } else {
    const used = others.filter((c) => picked.includes(c.id));
    const design = buildDesign(target, used, binaryY(yesLabel));
    const result = logisticRegression(design.predictors, design.y);
    if (!result.ok) {
      body = <Message>{LOGISTIC_REASONS[result.reason]}</Message>;
    } else {
      const model = result.model;
      const confusion = confusionMatrix(model, thresholdValue / 100);
      const base = interpretLogistic(model, yesLabel, confusion);
      const caveats = [
        ...(categories.length > 2
          ? [
              `${target.name} tiene ${categories.length} categorías: se compara «${yesLabel}» contra todas las demás juntas.`,
            ]
          : []),
        ...(design.dropped > 0
          ? [
              `Se dejaron fuera ${formatCount(design.dropped)} filas a las que les faltaba algún dato.`,
            ]
          : []),
        ...base.caveats,
      ];
      const interpretation = { ...base, caveats };
      const odds: TextTable = {
        title: "Razones de momios",
        caption:
          "Por cuánto multiplica cada variable los momios de «sí»; la intersección no se lee así",
        columns: ["Término", "b", "e^b (momios)", "Valor p", "IC 95 % de e^b"],
        rows: model.coefficients.map((c, j) => [
          c.name,
          formatValue(c.estimate, 4),
          j === 0 ? "—" : formatOdds(c.oddsRatio),
          formatP(c.p),
          j === 0 ? "—" : `${formatOdds(c.lower)} a ${formatOdds(c.upper)}`,
        ]),
      };
      const matrix: TextTable = {
        title: "Matriz de confusión",
        caption: "Casos reales (filas) contra lo que predice el modelo (columnas)",
        columns: ["", `Predicho «${yesLabel}»`, "Predicho otro"],
        rows: [
          [
            `Real «${yesLabel}»`,
            formatCount(confusion.truePositive),
            formatCount(confusion.falseNegative),
          ],
          ["Real otro", formatCount(confusion.falsePositive), formatCount(confusion.trueNegative)],
        ],
      };
      const single = design.predictors.length === 1 && used[0]?.quantitative === true;
      const x = design.predictors[0]?.values ?? [];
      body = (
        <Result
          name={`Probabilidad de «${yesLabel}» según ${used.map((c) => c.name).join(", ")}`}
          interpretation={interpretation}
          steps={logisticSteps(model, confusion)}
          tables={[odds, matrix]}
          chartIds={single ? [{ id: FIT_ID, title: "Curva logística" }] : []}
          charts={
            single ? (
              <ModelChart
                id={FIT_ID}
                title="La curva en S"
                description={`Cada punto es un caso (arriba «${yesLabel}», abajo otro); la curva es la probabilidad que estima el modelo.`}
                points={x.map((v, i) => ({ x: v, y: design.y[i]! }))}
                line={curvePoints(Math.min(...x), Math.max(...x), (v) =>
                  predictLogistic(model, [v]),
                )}
                xLabel={used[0]!.name}
                yLabel={`probabilidad de «${yesLabel}»`}
                summary={interpretation.headline}
                actions={<ChartDownloadButton elementId={FIT_ID} filename="logistica.png" />}
              />
            ) : null
          }
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="sl-surface flex flex-col gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Qué quieres predecir"
            value={yId}
            onChange={setYId}
            options={binaryCandidates.map((c) => ({ id: c.id, label: c.name }))}
          />
          <Field
            label="Respuesta que cuenta como «sí»"
            value={yesLabel}
            onChange={setYes}
            options={categories.map((label) => ({ id: label, label }))}
          />
          <NumberField
            label="Umbral para decir «sí» (%)"
            value={thresholdText}
            onChange={setThresholdText}
          />
        </div>
        <PredictorPicker columns={others} chosen={picked} onChange={setChosen} />
      </div>
      {body}
    </div>
  );
}
