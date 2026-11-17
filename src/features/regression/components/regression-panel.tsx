"use client";

import { FileSpreadsheet } from "lucide-react";
import { useId, useMemo, useState, type FormEvent } from "react";

import { BarChart, ResidualChart, ScatterRegressionChart } from "@/components/charts";
import {
  InterpretationPanel,
  interpretationToText,
} from "@/components/shared/interpretation-panel";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
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
import {
  formatValue,
  interpretPrediction,
  predict,
  residualHistogram,
  type Interpretation,
} from "@/core/statistics";
import { captureChartAsDataUrl, ChartDownloadButton, CopyButton } from "@/features/export";
import { AddToReportButton } from "@/features/report";
import { downloadBlob, exportDatasetToXlsx, tableToTsv } from "@/infrastructure/export";

import { correlationMatrix } from "../use-cases/correlation-matrix";
import { regressionWorkbook } from "../use-cases/regression-workbook";
import {
  coefficientTable,
  fitTable,
  regressionReportItem,
  RESIDUAL_CHART_ID,
  RESIDUAL_HISTOGRAM_ID,
  RESIDUAL_HISTOGRAM_VARIABLE,
  SCATTER_CHART_ID,
} from "../use-cases/regression-report";
import { runRegression, type NumericColumn } from "../use-cases/run-regression";

export interface RegressionPanelProps {
  /** Columnas numéricas incluidas en el análisis. */
  columns: readonly NumericColumn[];
}

function VariableSelect({
  id,
  label,
  hint,
  value,
  columns,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  columns: readonly NumericColumn[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-describedby={`${id}-ayuda`}>
          <SelectValue placeholder="Elige una variable" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((column) => (
            <SelectItem key={column.id} value={column.id}>
              {column.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={`${id}-ayuda`} className="text-muted-foreground text-sm">
        {hint}
      </p>
    </div>
  );
}

function textTable(table: { columns: string[]; rows: string[][] }) {
  const columns = table.columns.map((label, index) => ({
    key: String(index),
    label,
    ...(index > 0 ? { align: "right" as const } : {}),
    format: (row: string[]) => row[index] ?? "",
  }));
  return { columns, rows: table.rows };
}

/**
 * «¿Puedo predecir un número a partir de otro?» (M6, RF-50 y RF-51): elige
 * X e Y, lee qué significa la recta, mira los puntos con sus errores, predice
 * un valor y, si quiere, sigue los 5 pasos de la clase con sus números.
 */
export function RegressionPanel({ columns }: RegressionPanelProps) {
  const ids = { x: useId(), y: useId(), predict: useId(), error: useId() };
  const [xId, setXId] = useState(columns[0]?.id ?? "");
  const [yId, setYId] = useState(columns[1]?.id ?? columns[0]?.id ?? "");
  const [xText, setXText] = useState("");
  const [prediction, setPrediction] = useState<Interpretation | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const x = columns.find((column) => column.id === xId);
  const y = columns.find((column) => column.id === yId);
  const analysis = useMemo(
    () => (x !== undefined && y !== undefined && x.id !== y.id ? runRegression(x, y) : null),
    [x, y],
  );
  const model = analysis?.model ?? null;

  if (columns.length < 2) {
    return (
      <SectionCard title="Hacen falta dos columnas de números">
        <p className="text-muted-foreground">
          Para ajustar una recta se necesitan al menos dos variables numéricas (discretas o
          continuas). Revisa los tipos en la zona Datos.
        </p>
      </SectionCard>
    );
  }

  const choose = (setter: (id: string) => void) => (id: string) => {
    setter(id);
    setPrediction(null);
    setPredictionError(null);
  };

  const submitPrediction = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (model === null || analysis === null) return;
    const value = parseLocaleNumber(xText, undefined, ",").value;
    if (value === null) {
      setPredictionError("Escribe un número, por ejemplo 3,5.");
      setPrediction(null);
      return;
    }
    setPredictionError(null);
    setPrediction(interpretPrediction(predict(model, value), analysis.xName, analysis.yName));
  };

  const coefficients = model ? textTable(coefficientTable(model)) : null;
  const fit = model ? textTable(fitTable(model)) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="sl-surface grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <VariableSelect
          id={ids.x}
          label="Lo que conoces (X)"
          hint="La variable con la que quieres predecir."
          value={xId}
          columns={columns}
          onChange={choose(setXId)}
        />
        <VariableSelect
          id={ids.y}
          label="Lo que quieres predecir (Y)"
          hint="La variable que debería cambiar con X."
          value={yId}
          columns={columns}
          onChange={choose(setYId)}
        />
      </div>

      {xId === yId ? (
        <p role="status" className="text-muted-foreground">
          Elige dos variables distintas para X y para Y.
        </p>
      ) : null}

      {analysis !== null && model === null ? (
        <p role="status" className="sl-surface p-5">
          {analysis.reason}
        </p>
      ) : null}

      {analysis !== null && model !== null && analysis.interpretation !== null ? (
        <>
          <InterpretationPanel
            title="Qué significa la recta"
            name={`${analysis.yName} según ${analysis.xName}`}
            interpretation={analysis.interpretation}
            steps={analysis.steps}
            actions={
              <>
                <CopyButton
                  what="la interpretación"
                  getText={() =>
                    analysis.interpretation === null
                      ? ""
                      : interpretationToText(analysis.interpretation)
                  }
                />
                <AddToReportButton
                  what="la regresión"
                  build={() => regressionReportItem(analysis, captureChartAsDataUrl)}
                />
              </>
            }
          />
          {analysis.dropped > 0 ? (
            <p className="text-muted-foreground -mt-4 text-sm">
              Se dejaron fuera {analysis.dropped} fila(s) a las que les faltaba X o Y.
            </p>
          ) : null}

          <ScatterRegressionChart
            id={SCATTER_CHART_ID}
            model={model}
            xName={analysis.xName}
            yName={analysis.yName}
            title={`${analysis.yName} según ${analysis.xName}`}
            actions={
              <ChartDownloadButton
                elementId={SCATTER_CHART_ID}
                filename="regresion_dispersion.png"
              />
            }
          />

          <SectionCard
            title="Predecir"
            description={`Escribe un valor de ${analysis.xName} y la recta estima ${analysis.yName}.`}
          >
            <form onSubmit={submitPrediction} className="flex flex-wrap items-end gap-3" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.predict}>{analysis.xName}</Label>
                <Input
                  id={ids.predict}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Por ejemplo, 3,5"
                  className="w-44"
                  value={xText}
                  onChange={(event) => setXText(event.target.value)}
                  aria-invalid={predictionError !== null}
                  {...(predictionError !== null ? { "aria-describedby": ids.error } : {})}
                />
              </div>
              <Button type="submit" variant="outline">
                Predecir
              </Button>
            </form>
            {predictionError !== null ? (
              <p
                id={ids.error}
                role="alert"
                className="text-destructive mt-2 text-sm font-semibold"
              >
                {predictionError}
              </p>
            ) : null}
            {prediction !== null ? (
              <InterpretationPanel
                className="mt-5"
                title="Predicción"
                name={`${analysis.yName} para ${analysis.xName} = ${xText}`}
                interpretation={prediction}
              />
            ) : null}
          </SectionCard>

          {analysis.correlationInterpretation !== null ? (
            <InterpretationPanel
              title="¿Se mueven juntas?"
              name={`correlación de ${analysis.xName} y ${analysis.yName}`}
              interpretation={analysis.correlationInterpretation}
            />
          ) : null}
          {analysis.spearman !== null && analysis.pearson !== null ? (
            <p className="text-muted-foreground -mt-4 text-sm">
              Spearman (por rangos): r = {formatValue(analysis.spearman.r, 2)}. Si se aleja mucho de
              Pearson, la relación puede ser curva o haber valores extremos.
            </p>
          ) : null}

          {coefficients !== null && fit !== null ? (
            <div className="flex flex-col gap-6">
              <SectionCard
                className="min-w-0"
                title="Coeficientes"
                description="Cada coeficiente con su error estándar, su prueba t y su intervalo de confianza del 95 %."
                actions={
                  <CopyButton
                    what="los coeficientes"
                    getText={() =>
                      tableToTsv(coefficientTable(model).columns, coefficientTable(model).rows)
                    }
                  />
                }
              >
                <DataTable
                  columns={coefficients.columns}
                  rows={coefficients.rows}
                  caption="Coeficientes de la recta"
                  getRowKey={(row) => row[0] ?? ""}
                />
              </SectionCard>
              <SectionCard className="min-w-0" title="Ajuste">
                <DataTable
                  columns={fit.columns}
                  rows={fit.rows}
                  caption="Bondad del ajuste"
                  getRowKey={(row) => row[0] ?? ""}
                />
              </SectionCard>
            </div>
          ) : null}

          {columns.length >= 3 ? (
            <SectionCard
              className="min-w-0"
              title="Matriz de correlación"
              description="El r de Pearson de cada pareja de variables numéricas: cerca de 1 o de −1, se mueven juntas; cerca de 0, no."
              actions={
                <CopyButton
                  what="la matriz de correlación"
                  getText={() => {
                    const matrix = correlationMatrix(columns);
                    return tableToTsv(matrix.columns, matrix.rows);
                  }}
                />
              }
            >
              {(() => {
                const matrix = textTable(correlationMatrix(columns));
                return (
                  <DataTable
                    columns={matrix.columns}
                    rows={matrix.rows}
                    caption="Matriz de correlación de Pearson"
                    getRowKey={(row) => row[0] ?? ""}
                  />
                );
              })()}
            </SectionCard>
          ) : null}

          <ResidualChart
            id={RESIDUAL_CHART_ID}
            model={model}
            xName={analysis.xName}
            yName={analysis.yName}
            title="Residuos contra lo predicho"
            description="Si la recta es adecuada, los puntos quedan repartidos sin forma alrededor de la línea del 0. Una curva o un embudo dicen que la recta no basta."
            actions={
              <ChartDownloadButton
                elementId={RESIDUAL_CHART_ID}
                filename="regresion_residuos.png"
              />
            }
          />

          {(() => {
            const histogram = residualHistogram(
              model.rows.map((row) => row.residual),
              model.rows.map((row) => row.y),
            );
            return histogram === null ? null : (
              <BarChart
                data={{ ...histogram.table, variableId: RESIDUAL_HISTOGRAM_VARIABLE }}
                title="Histograma de los residuos"
                description={histogram.reading}
                colorMode="single"
                actions={
                  <ChartDownloadButton
                    elementId={RESIDUAL_HISTOGRAM_ID}
                    filename="regresion_histograma_residuos.png"
                  />
                }
              />
            );
          })()}

          <div className="border-rule flex flex-wrap items-center gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={async () =>
                downloadBlob(
                  await exportDatasetToXlsx(
                    regressionWorkbook(model, analysis.xName, analysis.yName),
                  ),
                  `statlab_regresion_${analysis.yName}_${analysis.xName}.xlsx`,
                )
              }
            >
              <FileSpreadsheet aria-hidden="true" />
              Descargar Excel con fórmulas
            </Button>
            <p className="text-muted-foreground text-sm">
              La tabla de trabajo y los coeficientes van como fórmulas de Excel: cambia un dato y
              todo se recalcula.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
