"use client";

import { useId, useState, type ReactNode } from "react";

import { DistributionChart } from "@/components/charts";
import {
  InterpretationPanel,
  interpretationToText,
} from "@/components/shared/interpretation-panel";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable } from "@/components/tables/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { CellValue } from "@/core/data";
import {
  chiSquareIndependence,
  densityPoints,
  formatP,
  formatValue,
  oneProportionZ,
  oneSampleT,
  oneWayAnova,
  pairedT,
  twoProportionZ,
  twoSampleT,
  type AnovaTest,
  type HypothesisTest,
} from "@/core/statistics";
import { captureChartAsDataUrl, ChartDownloadButton, CopyButton } from "@/features/export";
import { AddToReportButton } from "@/features/report";

import { Empty, Field, type AnalysisColumn } from "./estimation-panel";
import { NumberField, readNumber } from "./number-field";

type Goal = "media" | "proporcion" | "grupos" | "pareada" | "relacion" | "dos-proporciones";

/** Selector «¿Qué quieres saber?» (RF-42): la pregunta en llano y por qué esa prueba. */
const GOALS: readonly { id: Goal; label: string; reason: string }[] = [
  {
    id: "grupos",
    label: "¿Los grupos tienen promedios distintos?",
    reason:
      "Con dos grupos se usa la t de Welch, que no supone que varíen lo mismo; con tres o más, el ANOVA, y Tukey dice qué parejas difieren.",
  },
  {
    id: "pareada",
    label: "¿Antes y después cambió?",
    reason:
      "Son los mismos casos medidos dos veces: la t pareada compara a cada uno consigo mismo y no se confunde con lo que varía entre personas.",
  },
  {
    id: "relacion",
    label: "¿Dos categorías están relacionadas?",
    reason:
      "Con dos variables de categorías, el chi-cuadrado compara la tabla cruzada con la que habría si no tuvieran nada que ver.",
  },
  {
    id: "dos-proporciones",
    label: "¿Dos grupos tienen porcentajes distintos?",
    reason: "Para un sí/no en dos grupos, la z de dos proporciones compara los porcentajes.",
  },
  {
    id: "media",
    label: "¿El promedio es distinto de un valor?",
    reason:
      "Para comparar el promedio de una variable con una meta o un dato conocido se usa la t de una muestra.",
  },
  {
    id: "proporcion",
    label: "¿Un porcentaje es distinto de un valor?",
    reason: "Para comparar un porcentaje con uno de referencia se usa la z de una proporción.",
  },
];

const CHART_ID = "chart-prueba-valor-p";

function categoriesOf(values: readonly CellValue[]): string[] {
  return [...new Set(values.filter((v) => v !== null).map(String))];
}

const isNumber = (v: CellValue | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

function groupValues(numeric: AnalysisColumn, group: AnalysisColumn, label: string): number[] {
  return numeric.values.flatMap((v, i) =>
    isNumber(v) && group.values[i] !== null && String(group.values[i]) === label ? [v] : [],
  );
}

function tukeyTable(result: AnovaTest) {
  return {
    title: "Comparaciones de a pares (Tukey)",
    columns: ["Pareja", "Diferencia", "Valor p", "¿Diferencia clara?"],
    rows: result.tukey.map((pair) => [
      `«${pair.b}» − «${pair.a}»`,
      formatValue(pair.difference, 3),
      formatP(pair.pValue),
      pair.significant ? "Sí" : "No",
    ]),
  };
}

function textColumns(columns: readonly string[]) {
  return columns.map((label, index) => ({
    key: String(index),
    label,
    ...(index > 0 ? { align: "right" as const } : {}),
    format: (row: readonly string[]) => row[index] ?? "",
  }));
}

function TestResult({ result, title }: { result: HypothesisTest; title: string }) {
  const anova = "tukey" in result ? (result as AnovaTest) : null;
  const stat = result.statistic;
  const tables = anova
    ? [
        { title: "Tabla ANOVA", ...anova.table },
        ...(anova.tukey.length > 1 ? [tukeyTable(anova)] : []),
      ]
    : [];
  const shaded =
    result.tails === "dos"
      ? (x: number) => Math.abs(x) >= Math.abs(stat)
      : (x: number) => x >= stat;
  return (
    <>
      <InterpretationPanel
        title={`Qué dice la prueba: ${result.test}`}
        name={result.test}
        interpretation={result.interpretation}
        steps={result.steps}
        actions={
          <>
            <CopyButton
              what="la conclusión"
              getText={() => interpretationToText(result.interpretation)}
            />
            <AddToReportButton
              what="la prueba"
              build={async () => {
                let images: { title: string; dataUrl: string }[] = [];
                try {
                  images = [{ title: "Valor p", dataUrl: await captureChartAsDataUrl(CHART_ID) }];
                } catch {
                  images = [];
                }
                return {
                  title: `${result.test} · ${title}`,
                  interpretation: result.interpretation,
                  steps: result.steps,
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
      <DistributionChart
        id={CHART_ID}
        title={`Valor p = ${formatP(result.pValue)}: la parte sombreada`}
        description={`Si no hubiera diferencia real, el estadístico ${result.statisticLabel} caería en la zona sombreada (tan lejos como ${formatValue(stat, 2)} o más) ${result.pValue < 0.001 ? "menos del 0,1 %" : `un ${formatValue(result.pValue * 100, 1)} %`} de las veces.`}
        points={densityPoints(result.reference)}
        discrete={false}
        inRegion={shaded}
        summary={result.interpretation.headline}
        actions={<ChartDownloadButton elementId={CHART_ID} filename="valor_p.png" />}
      />
      {anova !== null && anova.tukey.length > 1 ? (
        <SectionCard
          title="¿Qué grupos difieren? (Tukey)"
          description="Compara cada pareja de grupos y ajusta el valor p por hacer varias comparaciones a la vez."
        >
          <DataTable
            columns={textColumns(tukeyTable(anova).columns)}
            rows={tukeyTable(anova).rows}
            caption="Comparaciones de a pares con Tukey HSD"
            getRowKey={(row) => row[0] ?? ""}
          />
        </SectionCard>
      ) : null}
    </>
  );
}

/**
 * «¿Es real la diferencia?» (M5, RF-42 y RF-49): la persona elige la pregunta
 * y StatLab usa la prueba que corresponde, con su razón, la conclusión en
 * llano, el valor p sombreado y el tamaño del efecto.
 */
export function HypothesisPanel({ columns }: { columns: readonly AnalysisColumn[] }) {
  const numeric = columns.filter((column) => column.quantitative);
  const categorical = columns.filter((column) => !column.quantitative);
  const studentId = useId();
  const [goal, setGoal] = useState<Goal>("grupos");
  const [numericId, setNumericId] = useState(numeric[0]?.id ?? "");
  const [secondId, setSecondId] = useState(numeric[1]?.id ?? "");
  const [groupId, setGroupId] = useState(categorical[0]?.id ?? "");
  const [otherId, setOtherId] = useState(categorical[1]?.id ?? categorical[0]?.id ?? "");
  const [category, setCategory] = useState("");
  const [groupA, setGroupA] = useState("");
  const [groupB, setGroupB] = useState("");
  const [student, setStudent] = useState(false);
  const [mu0Text, setMu0Text] = useState("");
  const [p0Text, setP0Text] = useState("50");

  const numericColumn = numeric.find((c) => c.id === numericId);
  const secondColumn = numeric.find((c) => c.id === secondId);
  const groupColumn = categorical.find((c) => c.id === groupId);
  const otherColumn = categorical.find((c) => c.id === otherId);
  const groups = groupColumn ? categoriesOf(groupColumn.values) : [];
  const groupOptions = groups.map((label) => ({ id: label, label }));
  const chosenA = groups.includes(groupA) ? groupA : (groups[0] ?? "");
  const chosenB = groups.includes(groupB) ? groupB : (groups[1] ?? "");
  // En «dos-proporciones» la categoría que cuenta como «sí» es de la otra variable.
  const outcomeColumn = goal === "dos-proporciones" ? otherColumn : groupColumn;
  const outcomes = outcomeColumn ? categoriesOf(outcomeColumn.values) : [];
  const chosenCategory = outcomes.includes(category) ? category : (outcomes[0] ?? "");
  const options = (list: readonly AnalysisColumn[]) =>
    list.map((c) => ({ id: c.id, label: c.name }));

  let result: HypothesisTest | null = null;
  let message: ReactNode = null;
  let title = "";
  const needs = (text: string) => {
    message = <Empty>{text}</Empty>;
  };

  if (goal === "media") {
    const mu0 = readNumber(mu0Text);
    if (numericColumn === undefined) needs("Hace falta una variable numérica.");
    else if (mu0 === null) needs("Escribe el valor con el que quieres comparar el promedio.");
    else {
      title = numericColumn.name;
      result = oneSampleT(numericColumn.values.filter(isNumber), mu0, numericColumn.name);
      if (result === null) needs("Hacen falta al menos 2 datos que no sean todos iguales.");
    }
  } else if (goal === "proporcion") {
    const p0 = readNumber(p0Text);
    if (groupColumn === undefined) needs("Hace falta una variable de categorías.");
    else if (p0 === null || p0 <= 0 || p0 >= 100) needs("Escribe un porcentaje entre 0 y 100.");
    else {
      const present = groupColumn.values.filter((v) => v !== null).map(String);
      title = `«${chosenCategory}» en ${groupColumn.name}`;
      result = oneProportionZ(
        present.filter((v) => v === chosenCategory).length,
        present.length,
        p0 / 100,
        `«${chosenCategory}»`,
      );
      if (result === null) needs("No hay datos en esta variable.");
    }
  } else if (goal === "grupos") {
    if (numericColumn === undefined || groupColumn === undefined || groups.length < 2) {
      needs("Hace falta una variable numérica y otra de categorías con al menos dos grupos.");
    } else {
      title = `${numericColumn.name} por ${groupColumn.name}`;
      const named = groups.map((label) => ({
        label,
        values: groupValues(numericColumn, groupColumn, label),
      }));
      result =
        named.length === 2
          ? twoSampleT(named[0]!, named[1]!, numericColumn.name, { equalVariances: student })
          : oneWayAnova(named, numericColumn.name);
      if (result === null) needs("Cada grupo necesita al menos 2 datos y algo de variación.");
    }
  } else if (goal === "pareada") {
    if (numericColumn === undefined || secondColumn === undefined) {
      needs("Hacen falta dos variables numéricas: la medición de antes y la de después.");
    } else if (numericColumn.id === secondColumn.id) {
      needs("Elige dos variables distintas para antes y después.");
    } else {
      const pairs = numericColumn.values.flatMap((v, i) => {
        const w = secondColumn.values[i];
        return isNumber(v) && isNumber(w) ? [[v, w] as const] : [];
      });
      title = `${numericColumn.name} → ${secondColumn.name}`;
      result = pairedT(
        pairs.map((p) => p[0]),
        pairs.map((p) => p[1]),
        numericColumn.name,
        secondColumn.name,
      );
      if (result === null) needs("Hacen falta al menos 2 pares completos con alguna diferencia.");
    }
  } else if (goal === "relacion") {
    if (
      groupColumn === undefined ||
      otherColumn === undefined ||
      groupColumn.id === otherColumn.id
    ) {
      needs("Hacen falta dos variables de categorías distintas.");
    } else {
      const rows = categoriesOf(groupColumn.values);
      const cols = categoriesOf(otherColumn.values);
      const observed = rows.map(() => cols.map(() => 0));
      groupColumn.values.forEach((v, i) => {
        const w = otherColumn.values[i];
        if (v === null || w === null || w === undefined) return;
        observed[rows.indexOf(String(v))]![cols.indexOf(String(w))]! += 1;
      });
      title = `${groupColumn.name} y ${otherColumn.name}`;
      result = chiSquareIndependence(observed, groupColumn.name, otherColumn.name);
      if (result === null) needs("Cada variable necesita al menos dos categorías con datos.");
    }
  } else {
    if (groupColumn === undefined || otherColumn === undefined || groups.length < 2) {
      needs("Hace falta una variable con el resultado (sí/no) y otra que separe dos grupos.");
    } else if (chosenA === chosenB) {
      needs("Elige dos grupos distintos.");
    } else {
      const count = (label: string) => {
        const inGroup = otherColumn.values.filter(
          (v, i) => v !== null && String(groupColumn.values[i]) === label,
        );
        return {
          label,
          n: inGroup.length,
          successes: inGroup.filter((v) => String(v) === chosenCategory).length,
        };
      };
      title = `«${chosenCategory}» por ${groupColumn.name}`;
      result = twoProportionZ(count(chosenA), count(chosenB), `«${chosenCategory}»`);
      if (result === null) needs("Los dos grupos necesitan datos y algo de variación.");
    }
  }

  const current = GOALS.find((entry) => entry.id === goal)!;
  const twoGroups = goal === "grupos" && groups.length === 2;

  return (
    <div className="flex flex-col gap-8">
      <div className="sl-surface flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <Field
            label="Qué quieres saber"
            value={goal}
            onChange={(v) => setGoal(v as Goal)}
            options={GOALS}
          />
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-semibold">Por qué esta prueba: </span>
            {current.reason}
          </p>
        </div>

        {goal === "media" || goal === "grupos" || goal === "pareada" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={goal === "pareada" ? "Antes" : "Variable numérica"}
              value={numericId}
              onChange={setNumericId}
              options={options(numeric)}
            />
            {goal === "pareada" ? (
              <Field
                label="Después"
                value={secondId}
                onChange={setSecondId}
                options={options(numeric)}
              />
            ) : null}
            {goal === "grupos" ? (
              <Field
                label="Variable que separa los grupos"
                value={groupId}
                onChange={setGroupId}
                options={options(categorical)}
              />
            ) : null}
            {goal === "media" ? (
              <NumberField
                label="Valor con el que comparar"
                value={mu0Text}
                onChange={setMu0Text}
                placeholder="Por ejemplo, 3,0"
              />
            ) : null}
          </div>
        ) : null}

        {goal === "proporcion" || goal === "relacion" || goal === "dos-proporciones" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={
                goal === "dos-proporciones"
                  ? "Variable que separa los grupos"
                  : goal === "relacion"
                    ? "Primera variable"
                    : "Variable de categorías"
              }
              value={groupId}
              onChange={setGroupId}
              options={options(categorical)}
            />
            {goal === "relacion" || goal === "dos-proporciones" ? (
              <Field
                label={goal === "relacion" ? "Segunda variable" : "Variable del resultado"}
                value={otherId}
                onChange={setOtherId}
                options={options(categorical)}
              />
            ) : null}
            {goal === "proporcion" || goal === "dos-proporciones" ? (
              <Field
                label="Categoría que cuenta como «sí»"
                value={chosenCategory}
                onChange={setCategory}
                options={outcomes.map((label) => ({ id: label, label }))}
              />
            ) : null}
            {goal === "proporcion" ? (
              <NumberField
                label="Porcentaje de referencia (%)"
                value={p0Text}
                onChange={setP0Text}
                placeholder="Por ejemplo, 50"
              />
            ) : null}
          </div>
        ) : null}

        {goal === "dos-proporciones" && groups.length >= 2 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Grupo 1" value={chosenA} onChange={setGroupA} options={groupOptions} />
            <Field label="Grupo 2" value={chosenB} onChange={setGroupB} options={groupOptions} />
          </div>
        ) : null}

        {twoGroups ? (
          <div className="flex items-start gap-3">
            <Checkbox
              id={studentId}
              checked={student}
              onCheckedChange={(checked) => setStudent(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor={studentId} className="leading-snug font-normal">
              Suponer que los dos grupos varían lo mismo (t de Student, la de muchos cursos)
            </Label>
          </div>
        ) : null}
      </div>

      {result !== null ? <TestResult result={result} title={title} /> : message}
    </div>
  );
}
