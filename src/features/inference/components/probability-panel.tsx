"use client";

import { useId, useState } from "react";

import { DistributionChart } from "@/components/charts";
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
import {
  densityPoints,
  describeProbability,
  DISTRIBUTION_LABEL,
  formatValue,
  inRegion,
  isDiscrete,
  neumaierSum,
  validateSpec,
  welford,
  type DistributionSpec,
  type ProbabilityQuery,
} from "@/core/statistics";
import { captureChartAsDataUrl, ChartDownloadButton, CopyButton } from "@/features/export";
import type { NumericColumn } from "@/features/regression";
import { AddToReportButton } from "@/features/report";

import { NumberField, readNumber } from "@/components/shared/form-fields";

import { CentralLimitPanel } from "./central-limit-panel";

type Kind = DistributionSpec["kind"];

/** Parámetros de cada distribución: etiqueta y valor inicial. */
const PARAMS: Readonly<Record<Kind, readonly { key: string; label: string; initial: string }[]>> = {
  normal: [
    { key: "mean", label: "Media (μ)", initial: "0" },
    { key: "sd", label: "Desviación estándar (σ)", initial: "1" },
  ],
  t: [{ key: "df", label: "Grados de libertad", initial: "10" }],
  chi2: [{ key: "df", label: "Grados de libertad", initial: "4" }],
  f: [
    { key: "d1", label: "Grados de libertad del numerador", initial: "3" },
    { key: "d2", label: "Grados de libertad del denominador", initial: "20" },
  ],
  binomial: [
    { key: "n", label: "Número de intentos (n)", initial: "10" },
    { key: "p", label: "Probabilidad de éxito (p)", initial: "0,5" },
  ],
  poisson: [{ key: "lambda", label: "Promedio de casos (λ)", initial: "3" }],
};

const HINT: Readonly<Record<Kind, string>> = {
  normal: "Datos que se agrupan en forma de campana alrededor del promedio.",
  t: "Como la normal, con colas más pesadas; se usa con muestras pequeñas.",
  chi2: "Sumas de cuadrados; aparece en pruebas de tablas cruzadas.",
  f: "Cociente de dos varianzas; aparece en ANOVA y regresión.",
  binomial: "Cuántos éxitos hay en n intentos (por ejemplo, cuántos aprueban de 10).",
  poisson: "Cuántos casos ocurren en un intervalo (por ejemplo, llamadas por hora).",
};

const CHART_ID = "chart-probabilidad";

function buildSpec(kind: Kind, values: Record<string, number | null>): DistributionSpec | null {
  const v = (key: string) => values[key] ?? null;
  const need = (...keys: string[]) => keys.every((key) => v(key) !== null);
  switch (kind) {
    case "normal":
      return need("mean", "sd") ? { kind, mean: v("mean")!, sd: v("sd")! } : null;
    case "t":
    case "chi2":
      return need("df") ? { kind, df: v("df")! } : null;
    case "f":
      return need("d1", "d2") ? { kind, d1: v("d1")!, d2: v("d2")! } : null;
    case "binomial":
      return need("n", "p") ? { kind, n: v("n")!, p: v("p")! } : null;
    case "poisson":
      return need("lambda") ? { kind, lambda: v("lambda")! } : null;
  }
}

/**
 * «¿Qué tan probable es…?» (M3, RF-47): elige la distribución, sus parámetros
 * y la pregunta; StatLab dice la probabilidad en llano y la sombrea.
 */
export function ProbabilityPanel({ columns }: { columns: readonly NumericColumn[] }) {
  const ids = { kind: useId(), type: useId(), from: useId() };
  const [kind, setKind] = useState<Kind>("normal");
  const [params, setParams] = useState<Record<string, string>>(() =>
    Object.fromEntries(PARAMS.normal.map((param) => [param.key, param.initial])),
  );
  const [type, setType] = useState<ProbabilityQuery["type"]>("menor");
  const [aText, setAText] = useState("1");
  const [bText, setBText] = useState("2");

  const chooseKind = (next: Kind) => {
    setKind(next);
    setParams(Object.fromEntries(PARAMS[next].map((param) => [param.key, param.initial])));
  };

  const fromVariable = (id: string) => {
    const column = columns.find((entry) => entry.id === id);
    if (column === undefined) return;
    const numbers = column.values.filter((v): v is number => typeof v === "number");
    const stats = welford(numbers);
    if (numbers.length < 2 || stats === null) return;
    const mean = neumaierSum(numbers) / numbers.length;
    const sd = Math.sqrt(stats.m2 / (numbers.length - 1));
    setKind("normal");
    setParams({ mean: formatValue(mean, 3), sd: formatValue(sd, 3) });
    setAText(formatValue(mean, 2));
  };

  const parsed = Object.fromEntries(
    PARAMS[kind].map((param) => [param.key, readNumber(params[param.key] ?? "")]),
  );
  const spec = buildSpec(kind, parsed);
  const specError = spec === null ? "Completa los parámetros con números." : validateSpec(spec);
  const a = readNumber(aText);
  const b = readNumber(bText);
  const query: ProbabilityQuery | null =
    a === null ? null : type === "entre" ? (b === null ? null : { type, a, b }) : { type, a };

  // Cálculos baratos (200 puntos): se rehacen en cada render, sin memorizar.
  const valid = spec !== null && specError === null ? spec : null;
  const result = valid !== null && query !== null ? describeProbability(valid, query) : null;
  const points = valid !== null ? densityPoints(valid) : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="sl-surface flex flex-col gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={ids.kind}>Distribución</Label>
            <Select value={kind} onValueChange={(value) => chooseKind(value as Kind)}>
              <SelectTrigger id={ids.kind} aria-describedby={`${ids.kind}-ayuda`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DISTRIBUTION_LABEL) as Kind[]).map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {DISTRIBUTION_LABEL[entry]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id={`${ids.kind}-ayuda`} className="text-muted-foreground text-sm">
              {HINT[kind]}
            </p>
          </div>
          {columns.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={ids.from}>Usar la media y la desviación de una variable</Label>
              <Select value="" onValueChange={fromVariable}>
                <SelectTrigger id={ids.from}>
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
              <p className="text-muted-foreground text-sm">Pasa a una normal con esos valores.</p>
            </div>
          ) : null}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {PARAMS[kind].map((param) => (
            <NumberField
              key={`${kind}-${param.key}`}
              label={param.label}
              value={params[param.key] ?? ""}
              onChange={(text) => setParams((current) => ({ ...current, [param.key]: text }))}
            />
          ))}
        </div>
        {specError !== null ? (
          <p role="alert" className="text-destructive text-sm font-semibold">
            {specError}
          </p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={ids.type}>Qué probabilidad</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as ProbabilityQuery["type"])}
            >
              <SelectTrigger id={ids.type}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="menor">X menor o igual que</SelectItem>
                <SelectItem value="mayor">X mayor o igual que</SelectItem>
                <SelectItem value="entre">X entre dos valores</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberField
            label={type === "entre" ? "Desde" : "Valor"}
            value={aText}
            onChange={setAText}
            error={a === null ? "Escribe un número." : null}
          />
          {type === "entre" ? (
            <NumberField
              label="Hasta"
              value={bText}
              onChange={setBText}
              error={b === null ? "Escribe un número." : null}
            />
          ) : null}
        </div>
      </div>

      {result !== null && spec !== null && query !== null ? (
        <>
          <InterpretationPanel
            title="Qué tan probable es"
            name={DISTRIBUTION_LABEL[spec.kind]}
            interpretation={result.interpretation}
            steps={result.steps}
            actions={
              <>
                <CopyButton
                  what="la probabilidad"
                  getText={() => interpretationToText(result.interpretation)}
                />
                <AddToReportButton
                  what="la probabilidad"
                  build={async () => {
                    let images: { title: string; dataUrl: string }[] = [];
                    try {
                      images = [
                        { title: "Distribución", dataUrl: await captureChartAsDataUrl(CHART_ID) },
                      ];
                    } catch {
                      images = [];
                    }
                    return {
                      title: `Probabilidad · ${DISTRIBUTION_LABEL[spec.kind]}`,
                      interpretation: result.interpretation,
                      steps: result.steps,
                      tables: [],
                      images,
                    };
                  }}
                />
              </>
            }
          />
          <DistributionChart
            id={CHART_ID}
            title={`${DISTRIBUTION_LABEL[spec.kind]}: la parte sombreada es la probabilidad`}
            points={points}
            discrete={isDiscrete(spec)}
            inRegion={(x) => inRegion(spec, query, x)}
            summary={result.interpretation.headline}
            actions={<ChartDownloadButton elementId={CHART_ID} filename="probabilidad.png" />}
          />
        </>
      ) : (
        <SectionCard title="Falta un dato">
          <p className="text-muted-foreground">
            Completa los parámetros y el valor para ver la probabilidad.
          </p>
        </SectionCard>
      )}

      <CentralLimitPanel columns={columns} />
    </div>
  );
}
