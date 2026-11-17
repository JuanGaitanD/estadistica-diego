"use client";

import { useId, useState, type ReactNode } from "react";

import { DistributionChart } from "@/components/charts";
import { Field, NumberField, readNumber } from "@/components/shared/form-fields";
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
  fewExpectedInTwoGroups,
  fisherExact,
  fisherRecommended,
  formatP,
  formatValue,
  kruskalWallis,
  mannWhitney,
  normalityDoubtful,
  oneProportionZ,
  oneSampleT,
  oneWayAnova,
  pairedT,
  twoProportionZ,
  twoSampleT,
  wilcoxonOneSample,
  wilcoxonSignedRank,
  type Alternative,
  type AnovaTest,
  type HypothesisTest,
} from "@/core/statistics";
import { captureChartAsDataUrl, ChartDownloadButton, CopyButton } from "@/features/export";
import { AddToReportButton } from "@/features/report";

import { Empty, type AnalysisColumn } from "./estimation-panel";

type Goal = "media" | "proporcion" | "grupos" | "pareada" | "relacion" | "dos-proporciones";

/** Qué prueba usar: la que corresponde a los datos, o forzar una de las dos. */
type Method = "auto" | "clasica" | "alternativa";

/** Selector «¿Qué quieres saber?» (RF-42): la pregunta en llano y por qué esa prueba. */
const GOALS: readonly { id: Goal; label: string; reason: string }[] = [
  {
    id: "grupos",
    label: "¿Los grupos tienen promedios distintos?",
    reason:
      "Con dos grupos se usa la t de Welch, que no supone que varíen lo mismo; con tres o más, el ANOVA, y Tukey dice qué parejas difieren. Si los datos no se parecen a una normal, Mann-Whitney o Kruskal-Wallis.",
  },
  {
    id: "pareada",
    label: "¿Antes y después cambió?",
    reason:
      "Son los mismos casos medidos dos veces: la t pareada compara a cada uno consigo mismo y no se confunde con lo que varía entre personas. Si las diferencias no se parecen a una normal, Wilcoxon de rangos con signo.",
  },
  {
    id: "relacion",
    label: "¿Dos categorías están relacionadas?",
    reason:
      "Con dos variables de categorías, el chi-cuadrado compara la tabla cruzada con la que habría si no tuvieran nada que ver. En una tabla 2×2 con pocos casos, la exacta de Fisher.",
  },
  {
    id: "dos-proporciones",
    label: "¿Dos grupos tienen porcentajes distintos?",
    reason:
      "Para un sí/no en dos grupos, la z de dos proporciones compara los porcentajes. Con pocos casos, la exacta de Fisher.",
  },
  {
    id: "media",
    label: "¿El promedio es distinto de un valor?",
    reason:
      "Para comparar el promedio de una variable con una meta o un dato conocido se usa la t de una muestra. Si los datos no se parecen a una normal, Wilcoxon de una muestra (compara la mediana).",
  },
  {
    id: "proporcion",
    label: "¿Un porcentaje es distinto de un valor?",
    reason: "Para comparar un porcentaje con uno de referencia se usa la z de una proporción.",
  },
];

/** Nombre de la prueba clásica y de la alternativa en cada pregunta. */
const METHOD_NAMES: Partial<Record<Goal, readonly [string, string]>> = {
  media: ["t de una muestra", "Wilcoxon de una muestra"],
  pareada: ["t pareada", "Wilcoxon de rangos con signo"],
  "dos-proporciones": ["z de dos proporciones", "exacta de Fisher"],
  relacion: ["chi-cuadrado", "exacta de Fisher"],
};

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
    columns: ["Pareja", "Diferencia", "Valor p", "¿Es clara?"],
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

function shadedRegion(result: HypothesisTest): (x: number) => boolean {
  const stat = result.statistic;
  if (result.tails === "dos") return (x) => Math.abs(x) >= Math.abs(stat);
  if (result.tails === "izquierda") return (x) => x <= stat;
  return (x) => x >= stat;
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
  const reach =
    result.tails === "dos"
      ? `tan lejos de 0 como ${formatValue(Math.abs(stat), 2)} o más`
      : result.tails === "izquierda"
        ? `en ${formatValue(stat, 2)} o menos`
        : `en ${formatValue(stat, 2)} o más`;
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
                if (result.reference !== null) {
                  try {
                    images = [{ title: "Valor p", dataUrl: await captureChartAsDataUrl(CHART_ID) }];
                  } catch {
                    images = [];
                  }
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
      {result.reference !== null ? (
        <DistributionChart
          id={CHART_ID}
          title={`Valor p = ${formatP(result.pValue)}: la parte sombreada`}
          description={`Si no hubiera diferencia real, el estadístico ${result.statisticLabel} caería ${reach} ${result.pValue < 0.001 ? "menos del 0,1 %" : `un ${formatValue(result.pValue * 100, 1)} %`} de las veces.`}
          points={densityPoints(result.reference)}
          discrete={false}
          inRegion={shadedRegion(result)}
          summary={result.interpretation.headline}
          actions={<ChartDownloadButton elementId={CHART_ID} filename="valor_p.png" />}
        />
      ) : null}
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

/** Opciones de H₁ en llano para cada pregunta. */
function alternativeOptions(
  goal: Goal,
  first: string,
  second: string,
): { id: Alternative; label: string }[] {
  if (goal === "pareada") {
    return [
      { id: "distinto", label: "Que cambió (sube o baja)" },
      { id: "mayor", label: "Que sube" },
      { id: "menor", label: "Que baja" },
    ];
  }
  if (goal === "media" || goal === "proporcion") {
    const what = goal === "media" ? "El promedio" : "El porcentaje";
    return [
      { id: "distinto", label: `${what} es distinto del valor` },
      { id: "mayor", label: `${what} es mayor que el valor` },
      { id: "menor", label: `${what} es menor que el valor` },
    ];
  }
  return [
    { id: "distinto", label: "Que son distintos" },
    { id: "mayor", label: `Que «${first}» es mayor que «${second}»` },
    { id: "menor", label: `Que «${first}» es menor que «${second}»` },
  ];
}

/**
 * «¿Es real la diferencia?» (M5, RF-42 y RF-49): la persona elige la pregunta
 * y StatLab usa la prueba que corresponde, con su razón, la conclusión en
 * llano, el valor p sombreado y el tamaño del efecto. Si los datos no cumplen
 * los supuestos, usa la prueba de rangos o la exacta y dice por qué.
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
  const [alternative, setAlternative] = useState<Alternative>("distinto");
  const [method, setMethod] = useState<Method>("auto");

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
  const twoGroups = goal === "grupos" && groups.length === 2;
  const oneTailAllowed =
    goal === "media" ||
    goal === "proporcion" ||
    goal === "pareada" ||
    goal === "dos-proporciones" ||
    twoGroups;
  // Sin selector de cola (ANOVA, chi-cuadrado), la prueba es de dos colas.
  const alt: Alternative = oneTailAllowed ? alternative : "distinto";
  // Por qué se cambió a la prueba alternativa sin que la persona lo pidiera.
  const auto: { note: string | null } = { note: null };
  let methodNames = METHOD_NAMES[goal] ?? null;
  const needs = (text: string) => {
    message = <Empty>{text}</Empty>;
  };
  /** ¿Usar la alternativa? Forzada por la persona o porque falla el supuesto. */
  const pickAlternative = (assumptionFails: boolean, why: string): boolean => {
    if (method === "alternativa") return true;
    if (method === "clasica") return false;
    if (assumptionFails) auto.note = why;
    return assumptionFails;
  };
  const skewNote = (test: string) =>
    `Con pocos datos y una forma muy cargada hacia un lado no se cumple el supuesto de normalidad: se usa ${test}, que no lo necesita.`;
  const fisherNote =
    "Hay celdas que esperan menos de 5 casos: la aproximación no es confiable y se usa la exacta de Fisher.";

  if (goal === "media") {
    const mu0 = readNumber(mu0Text);
    if (numericColumn === undefined) needs("Hace falta una variable numérica.");
    else if (mu0 === null) needs("Escribe el valor con el que quieres comparar el promedio.");
    else {
      title = numericColumn.name;
      const values = numericColumn.values.filter(isNumber);
      const rank = pickAlternative(
        normalityDoubtful([{ label: numericColumn.name, values }]),
        skewNote("Wilcoxon de una muestra"),
      );
      result = (rank ? wilcoxonOneSample : oneSampleT)(values, mu0, numericColumn.name, {
        alternative: alt,
      });
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
        { alternative: alt },
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
      const two = named.length === 2;
      methodNames = two ? ["t", "Mann-Whitney"] : ["ANOVA", "Kruskal-Wallis"];
      const rank = pickAlternative(
        normalityDoubtful(named),
        skewNote(two ? "Mann-Whitney" : "Kruskal-Wallis"),
      );
      if (two) {
        result = rank
          ? mannWhitney(named[0]!, named[1]!, numericColumn.name, { alternative: alt })
          : twoSampleT(named[0]!, named[1]!, numericColumn.name, {
              equalVariances: student,
              alternative: alt,
            });
      } else {
        result = rank
          ? kruskalWallis(named, numericColumn.name)
          : oneWayAnova(named, numericColumn.name);
      }
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
      const before = pairs.map((p) => p[0]);
      const after = pairs.map((p) => p[1]);
      title = `${numericColumn.name} → ${secondColumn.name}`;
      const rank = pickAlternative(
        normalityDoubtful([{ label: "Las diferencias", values: pairs.map((p) => p[1] - p[0]) }]),
        skewNote("Wilcoxon de rangos con signo"),
      );
      result = (rank ? wilcoxonSignedRank : pairedT)(
        before,
        after,
        numericColumn.name,
        secondColumn.name,
        { alternative: alt },
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
      const twoByTwo = rows.length === 2 && cols.length === 2;
      if (!twoByTwo) methodNames = null;
      const exact = twoByTwo && pickAlternative(fisherRecommended(observed), fisherNote);
      result = exact
        ? fisherExact(observed, {
            rows: [rows[0]!, rows[1]!],
            columns: [cols[0]!, cols[1]!],
            rowName: groupColumn.name,
            columnName: otherColumn.name,
          })
        : chiSquareIndependence(observed, groupColumn.name, otherColumn.name);
      if (result === null) needs("Cada variable necesita al menos dos categorías con datos.");
    }
  } else {
    if (groupColumn === undefined || otherColumn === undefined || groups.length < 2) {
      needs("Hace falta una variable con el resultado (sí/no) y otra que separe dos grupos.");
    } else if (groupColumn.id === otherColumn.id) {
      needs(
        "Elige dos variables distintas: una separa los grupos y la otra es el resultado (sí/no).",
      );
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
      const a = count(chosenA);
      const b = count(chosenB);
      title = `«${chosenCategory}» por ${groupColumn.name}`;
      const exact = a.n > 0 && b.n > 0 && pickAlternative(fewExpectedInTwoGroups(a, b), fisherNote);
      result = exact
        ? fisherExact(
            [
              [a.successes, a.n - a.successes],
              [b.successes, b.n - b.successes],
            ],
            {
              rows: [chosenA, chosenB],
              columns: [chosenCategory, `no «${chosenCategory}»`],
              rowName: groupColumn.name,
              columnName: otherColumn.name,
            },
            { alternative: alt },
          )
        : twoProportionZ(a, b, `«${chosenCategory}»`, { alternative: alt });
      if (result === null) needs("Los dos grupos necesitan datos y algo de variación.");
    }
  }

  const current = GOALS.find((entry) => entry.id === goal)!;
  const usesStudent = twoGroups && (result?.test.startsWith("t ") ?? false);
  const sideLabels = goal === "grupos" ? [groups[0] ?? "", groups[1] ?? ""] : [chosenA, chosenB];

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

        {oneTailAllowed || methodNames !== null ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {oneTailAllowed ? (
              <div className="flex min-w-0 flex-col gap-1.5">
                <Field
                  label="Qué quieres probar"
                  value={alternative}
                  onChange={(v) => setAlternative(v as Alternative)}
                  options={alternativeOptions(goal, sideLabels[0]!, sideLabels[1]!)}
                />
                <p className="text-muted-foreground text-sm">
                  Elige un solo sentido (una cola) solo si lo decidiste antes de ver los datos.
                </p>
              </div>
            ) : null}
            {methodNames !== null ? (
              <Field
                label="Prueba"
                value={method}
                onChange={(v) => setMethod(v as Method)}
                options={[
                  { id: "auto", label: "La que corresponde a los datos (recomendada)" },
                  { id: "clasica", label: `Siempre ${methodNames[0]}` },
                  { id: "alternativa", label: `Siempre ${methodNames[1]}` },
                ]}
              />
            ) : null}
          </div>
        ) : null}

        {usesStudent ? (
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

        {auto.note !== null && result !== null ? (
          <p className="text-sm" role="note">
            <span className="font-semibold">Se cambió de prueba: </span>
            {auto.note}
          </p>
        ) : null}
      </div>

      {result !== null ? <TestResult result={result} title={title} /> : message}
    </div>
  );
}
