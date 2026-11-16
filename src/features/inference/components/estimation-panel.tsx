"use client";

import { useId, useState, type ReactNode } from "react";

import { QqChart } from "@/components/charts";
import {
  InterpretationPanel,
  interpretationToText,
} from "@/components/shared/interpretation-panel";
import { SectionCard } from "@/components/shared/section-card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CellValue } from "@/core/data";
import {
  describeShape,
  formatCount,
  formatValue,
  meanDifferenceInterval,
  meanInterval,
  normalQqPoints,
  proportionInterval,
  sampleSizeForMean,
  sampleSizeForProportion,
  sortAscending,
  type ConfidenceInterval,
} from "@/core/statistics";
import { ChartDownloadButton, CopyButton } from "@/features/export";
import { AddToReportButton } from "@/features/report";

import { NumberField, readNumber } from "./number-field";

/** Columna incluida en el análisis, con su tipo. */
export interface AnalysisColumn {
  readonly id: string;
  readonly name: string;
  readonly quantitative: boolean;
  readonly values: readonly CellValue[];
}

type Goal = "media" | "proporcion" | "diferencia" | "tamano";

const GOALS: readonly { id: Goal; label: string }[] = [
  { id: "media", label: "El promedio de una variable" },
  { id: "proporcion", label: "El porcentaje de una categoría" },
  { id: "diferencia", label: "La diferencia de promedios entre dos grupos" },
  { id: "tamano", label: "Cuántos datos necesito" },
];

const QQ_ID = "chart-normalidad-qq";

function numbersOf(values: readonly CellValue[]): number[] {
  return values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

function categoriesOf(values: readonly CellValue[]): string[] {
  return [...new Set(values.filter((v) => v !== null).map(String))];
}

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
        <SelectTrigger id={id}>
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

function IntervalResult({ title, ci }: { title: string; ci: ConfidenceInterval }) {
  return (
    <InterpretationPanel
      title="Qué puedes decir de la población"
      name={title}
      interpretation={ci.interpretation}
      steps={ci.steps}
      actions={
        <>
          <CopyButton
            what="la interpretación"
            getText={() => interpretationToText(ci.interpretation)}
          />
          <AddToReportButton
            what="el intervalo"
            build={() => ({
              title,
              interpretation: ci.interpretation,
              steps: ci.steps,
              tables: [],
              images: [],
            })}
          />
        </>
      }
    />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground sl-surface p-5">{children}</p>;
}

/**
 * «¿Qué puedo decir de toda la población?» (M4, RF-48): intervalos de
 * confianza para un promedio, un porcentaje y la diferencia entre dos
 * grupos, la comprobación de normalidad con Q-Q y el tamaño de muestra.
 */
export function EstimationPanel({ columns }: { columns: readonly AnalysisColumn[] }) {
  const numeric = columns.filter((column) => column.quantitative);
  const categorical = columns.filter((column) => !column.quantitative);
  const [goal, setGoal] = useState<Goal>("media");
  const [level, setLevel] = useState("0.95");
  const [numericId, setNumericId] = useState(numeric[0]?.id ?? "");
  const [categoryVarId, setCategoryVarId] = useState(categorical[0]?.id ?? "");
  const [category, setCategory] = useState("");
  const [groupA, setGroupA] = useState("");
  const [groupB, setGroupB] = useState("");
  const [marginText, setMarginText] = useState("");
  const [sdText, setSdText] = useState("");
  const [pMarginText, setPMarginText] = useState("5");

  const confidence = Number(level);
  const numericColumn = numeric.find((column) => column.id === numericId);
  const categoryColumn = categorical.find((column) => column.id === categoryVarId);
  const categories = categoryColumn ? categoriesOf(categoryColumn.values) : [];
  const chosenCategory = categories.includes(category) ? category : (categories[0] ?? "");
  const groupOptions = categories.map((label) => ({ id: label, label }));
  const chosenA = categories.includes(groupA) ? groupA : (categories[0] ?? "");
  const chosenB = categories.includes(groupB) ? groupB : (categories[1] ?? "");

  let body: ReactNode = null;
  if (goal === "media") {
    if (numericColumn === undefined) {
      body = <Empty>Hace falta una variable numérica.</Empty>;
    } else {
      const values = numbersOf(numericColumn.values);
      const ci = meanInterval(values, numericColumn.name, confidence);
      const sorted = sortAscending(values);
      const shape = describeShape(sorted);
      body =
        ci === null ? (
          <Empty>Hacen falta al menos 2 datos numéricos.</Empty>
        ) : (
          <>
            <IntervalResult title={`Promedio de ${numericColumn.name}`} ci={ci} />
            <QqChart
              id={QQ_ID}
              title={`¿${numericColumn.name} se parece a una normal?`}
              description={
                shape ??
                "Con menos de 8 datos la forma no se puede juzgar bien; mira si los puntos siguen la recta."
              }
              points={normalQqPoints(sorted)}
              mean={ci.estimate}
              sd={Math.sqrt(
                values.reduce((sum, v) => sum + (v - ci.estimate) ** 2, 0) / (values.length - 1),
              )}
              variableName={numericColumn.name}
              actions={<ChartDownloadButton elementId={QQ_ID} filename="normalidad_qq.png" />}
            />
          </>
        );
    }
  } else if (goal === "proporcion") {
    if (categoryColumn === undefined) {
      body = <Empty>Hace falta una variable de categorías.</Empty>;
    } else {
      const present = categoryColumn.values.filter((v) => v !== null).map(String);
      const hits = present.filter((v) => v === chosenCategory).length;
      const ci = proportionInterval(hits, present.length, `«${chosenCategory}»`, confidence);
      body =
        ci === null ? (
          <Empty>No hay datos en esta variable.</Empty>
        ) : (
          <IntervalResult
            title={`Porcentaje de «${chosenCategory}» en ${categoryColumn.name}`}
            ci={ci}
          />
        );
    }
  } else if (goal === "diferencia") {
    if (numericColumn === undefined || categoryColumn === undefined || categories.length < 2) {
      body = (
        <Empty>
          Hace falta una variable numérica y otra de categorías con al menos dos grupos.
        </Empty>
      );
    } else if (chosenA === chosenB) {
      body = <Empty>Elige dos grupos distintos.</Empty>;
    } else {
      const pick = (group: string) =>
        numericColumn.values.flatMap((v, i) =>
          typeof v === "number" && String(categoryColumn.values[i]) === group ? [v] : [],
        );
      const ci = meanDifferenceInterval(
        pick(chosenA),
        pick(chosenB),
        chosenA,
        chosenB,
        numericColumn.name,
        confidence,
      );
      body =
        ci === null ? (
          <Empty>Cada grupo necesita al menos 2 datos.</Empty>
        ) : (
          <IntervalResult
            title={`Diferencia de ${numericColumn.name}: «${chosenA}» − «${chosenB}»`}
            ci={ci}
          />
        );
    }
  } else {
    const margin = readNumber(marginText);
    const sd = readNumber(sdText);
    const pMargin = readNumber(pMarginText);
    const nMean = margin !== null && sd !== null ? sampleSizeForMean(sd, margin, confidence) : null;
    const nProp = pMargin !== null ? sampleSizeForProportion(pMargin / 100, 0.5, confidence) : null;
    body = (
      <div className="flex flex-col gap-6">
        <SectionCard
          title="Para estimar un promedio"
          description="n = (z · σ / E)². Si no sabes la desviación, usa la de un estudio parecido o la de tus datos."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              label="Desviación estándar esperada (σ)"
              value={sdText}
              onChange={setSdText}
              placeholder="Por ejemplo, 0,73"
            />
            <NumberField
              label="Margen de error aceptable (E)"
              value={marginText}
              onChange={setMarginText}
              placeholder="Por ejemplo, 0,1"
            />
          </div>
          {nMean !== null ? (
            <p className="mt-4 text-lg font-semibold" role="status">
              Necesitas al menos {formatCount(nMean)} datos para que el promedio quede a ±{" "}
              {formatValue(margin ?? 0, 2)} con {formatValue(confidence * 100, 0)} % de confianza.
            </p>
          ) : null}
        </SectionCard>
        <SectionCard
          title="Para estimar un porcentaje"
          description="n = z² · p(1 − p) / E², con p = 50 % (el caso más exigente) si no tienes idea previa."
        >
          <NumberField
            label="Margen de error en puntos porcentuales"
            value={pMarginText}
            onChange={setPMarginText}
            placeholder="Por ejemplo, 5"
            className="flex max-w-xs flex-col gap-1.5"
          />
          {nProp !== null ? (
            <p className="mt-4 text-lg font-semibold" role="status">
              Necesitas al menos {formatCount(nProp)} respuestas para un margen de ±{" "}
              {formatValue(pMargin ?? 0, 1)} puntos.
            </p>
          ) : null}
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="sl-surface flex flex-col gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Qué quieres estimar"
            value={goal}
            onChange={(v) => setGoal(v as Goal)}
            options={GOALS}
          />
          <Field
            label="Confianza"
            value={level}
            onChange={setLevel}
            options={[
              { id: "0.9", label: "90 %" },
              { id: "0.95", label: "95 % (la habitual)" },
              { id: "0.99", label: "99 %" },
            ]}
          />
        </div>
        {goal === "media" || goal === "diferencia" ? (
          <Field
            label="Variable numérica"
            value={numericId}
            onChange={setNumericId}
            options={numeric.map((column) => ({ id: column.id, label: column.name }))}
          />
        ) : null}
        {goal === "proporcion" || goal === "diferencia" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={
                goal === "diferencia" ? "Variable que separa los grupos" : "Variable de categorías"
              }
              value={categoryVarId}
              onChange={setCategoryVarId}
              options={categorical.map((column) => ({ id: column.id, label: column.name }))}
            />
            {goal === "proporcion" ? (
              <Field
                label="Categoría"
                value={chosenCategory}
                onChange={setCategory}
                options={groupOptions}
              />
            ) : null}
          </div>
        ) : null}
        {goal === "diferencia" && categories.length >= 2 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Grupo 1" value={chosenA} onChange={setGroupA} options={groupOptions} />
            <Field label="Grupo 2" value={chosenB} onChange={setGroupB} options={groupOptions} />
          </div>
        ) : null}
      </div>
      {body}
    </div>
  );
}
