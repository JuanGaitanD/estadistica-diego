"use client";

import { Copy, FileSpreadsheet, Plus, RotateCcw, Trash2, TrendingUp } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { StepHeader } from "@/components/layout/step-header";
import { Field, NumberField, readNumber } from "@/components/shared/form-fields";
import {
  InterpretationPanel,
  interpretationToText,
} from "@/components/shared/interpretation-panel";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bestScenario,
  cashFlowSteps,
  cashFlowTable,
  COST_KINDS,
  describeCashFlow,
  formatMoney,
  LOAN_KINDS,
  percent,
  projectCashFlow,
  projectDemand,
  validateCashFlowInput,
  VERDICT_LABELS,
  type CashFlowInput,
  type CashFlowLine,
  type CashFlowResult,
  type CostKind,
  type LoanKind,
} from "@/core/finance";
import { formatValue } from "@/core/statistics/interpretation/text";
import { ChartDownloadButton, CopyButton } from "@/features/export";
import { buildWorkbookXlsx, downloadBlob, tableToTsv } from "@/infrastructure/export";
import { cn } from "@/lib/utils";

import {
  EMPTY_ASSET,
  EMPTY_COST,
  EMPTY_LOAN,
  EXAMPLES,
  growDemand,
  parseHistory,
  toCashFlowInput,
  type AssetForm,
  type CostForm,
  type LoanForm,
  type Scenario,
  type ScenarioForm,
} from "../model/scenario";
import { MAX_SCENARIOS, useScenariosStore } from "../store/scenarios-store";
import { buildProjectWorkbook, type ProjectWorkbookArgs } from "../use-cases/project-workbook";

const CHART_ID = "chart-flujo-de-caja";

type Evaluation =
  { readonly error: string } | { readonly input: CashFlowInput; readonly result: CashFlowResult };

function evaluate(form: ScenarioForm): Evaluation {
  const input = toCashFlowInput(form);
  if (typeof input === "string") return { error: input };
  const error = validateCashFlowInput(input);
  return error !== null ? { error } : { input, result: projectCashFlow(input) };
}

/** «150000000» → «150.000.000»; deja el texto como está si no es un número. */
function withThousands(text: string): string {
  const value = readNumber(text);
  return value === null
    ? text
    : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);
}

const yearsOrNot = (value: number | null): string =>
  value !== null ? `${formatValue(value, 1)} años` : "No se recupera";

/** «Año 2 (2028)» si hay año calendario; si no, «Año 2». */
function yearLabel(form: ScenarioForm, year: number): string {
  const start = Number(form.startYear);
  return Number.isInteger(start) && form.startYear.trim() !== ""
    ? `Año ${year} (${start + year})`
    : `Año ${year}`;
}

/** Zona «Rentable»: flujos de caja proyectados por escenario, con VPN, TIR y payback (RF-57). */
export function ProfitabilityPanel() {
  const scenarios = useScenariosStore((state) => state.scenarios);
  const activeId = useScenariosStore((state) => state.activeId);
  const active = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0];
  const evaluations = useMemo(
    () => scenarios.map((scenario) => evaluate(scenario.form)),
    [scenarios],
  );
  if (active === undefined) return null;
  const activeEvaluation = evaluations[scenarios.indexOf(active)];

  return (
    <div className="flex flex-col gap-10">
      <StepHeader
        title="¿Es mi proyecto rentable?"
        subtitle="Escribe la demanda, el precio, los costos, las inversiones y cómo se financian. StatLab arma el flujo de caja año por año, calcula el VPN, la TIR y el periodo de recuperación, y te dice si se recomienda. Crea varios escenarios para compararlos."
      />

      <ScenarioBar scenarios={scenarios} active={active} />

      {scenarios.length > 1 ? (
        <ComparisonTable scenarios={scenarios} evaluations={evaluations} />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {/* Antes del formulario en el DOM: en móvil el veredicto se ve primero. */}
        <aside aria-label="Resumen del escenario" className="lg:sticky lg:top-24 lg:order-last">
          {activeEvaluation !== undefined ? (
            <ScenarioSummary form={active.form} name={active.name} evaluation={activeEvaluation} />
          ) : null}
        </aside>
        {/* `key`: los avisos y el crecimiento escrito son de cada escenario. */}
        <ProjectForm key={active.id} form={active.form} />
      </div>

      {activeEvaluation !== undefined && "result" in activeEvaluation ? (
        <Results form={active.form} name={active.name} {...activeEvaluation} />
      ) : null}
    </div>
  );
}

/** Resumen siempre a la vista mientras se editan los supuestos. */
function ScenarioSummary({
  form,
  name,
  evaluation,
}: {
  form: ScenarioForm;
  name: string;
  evaluation: Evaluation;
}) {
  if ("error" in evaluation)
    return (
      <div className="border-rule bg-card flex flex-col gap-2 rounded-[var(--radius)] border p-5">
        <h2 className="font-semibold">Faltan datos</h2>
        <p role="alert" className="text-destructive text-sm font-semibold">
          {evaluation.error}
        </p>
      </div>
    );
  const { input, result } = evaluation;
  const items: readonly [string, string][] = [
    [`VPN al ${percent(input.discountRate)}`, formatMoney(result.npv)],
    ["TIR", result.irr !== null ? percent(result.irr) : "No se puede calcular"],
    ["Payback simple", yearsOrNot(result.payback)],
    ["Payback descontado", yearsOrNot(result.discountedPayback)],
  ];
  return (
    <div className="border-rule bg-card flex flex-col gap-4 rounded-[var(--radius)] border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="sl-label">Decisión sugerida</h2>
        <p
          className={cn(
            "text-2xl font-bold",
            result.verdict === "no-rentable" ? "text-destructive" : "text-primary",
          )}
        >
          {VERDICT_LABELS[result.verdict]}
        </p>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="sl-number text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <ExcelDownload name={name} form={form} input={input} result={result} />
      <a
        href="#resultados"
        className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
      >
        Ver el análisis completo
      </a>
    </div>
  );
}

function ScenarioBar({ scenarios, active }: { scenarios: readonly Scenario[]; active: Scenario }) {
  const select = useScenariosStore((state) => state.select);
  const duplicate = useScenariosStore((state) => state.duplicate);
  const remove = useScenariosStore((state) => state.remove);
  const rename = useScenariosStore((state) => state.rename);
  const loadExample = useScenariosStore((state) => state.loadExample);
  const nameId = useId();
  const examplesId = useId();

  return (
    <section aria-label="Escenarios" className="flex flex-col gap-4">
      <div role="tablist" aria-label="Escenarios del proyecto" className="flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <Button
            key={scenario.id}
            type="button"
            role="tab"
            aria-selected={scenario.id === active.id}
            variant={scenario.id === active.id ? "default" : "outline"}
            onClick={() => select(scenario.id)}
          >
            {scenario.name.trim() || "Sin nombre"}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={duplicate}
          disabled={scenarios.length >= MAX_SCENARIOS}
        >
          <Copy aria-hidden="true" />
          Duplicar como nuevo escenario
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[16rem] flex-col gap-1.5">
          <Label htmlFor={nameId}>Nombre del escenario</Label>
          <Input
            id={nameId}
            value={active.name}
            onChange={(event) => rename(active.id, event.target.value)}
          />
        </div>
        <div
          role="group"
          aria-labelledby={examplesId}
          className="flex flex-wrap items-center gap-1"
        >
          <span id={examplesId} className="text-muted-foreground text-sm">
            Cargar un ejemplo:
          </span>
          {EXAMPLES.map((example) => (
            <Button
              key={example.id}
              type="button"
              variant="ghost"
              onClick={() => loadExample(example.id)}
            >
              <RotateCcw aria-hidden="true" />
              {example.label}
            </Button>
          ))}
        </div>
        {scenarios.length > 1 ? (
          <Button type="button" variant="ghost" onClick={() => remove(active.id)}>
            <Trash2 aria-hidden="true" />
            Eliminar este escenario
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function ComparisonTable({
  scenarios,
  evaluations,
}: {
  scenarios: readonly Scenario[];
  evaluations: readonly Evaluation[];
}) {
  const results = evaluations.map((evaluation) =>
    "result" in evaluation ? evaluation.result : null,
  );
  const best = bestScenario(results);

  return (
    <SectionCard
      title="Comparación de escenarios"
      description={
        best !== null
          ? `El escenario con mayor VPN positivo es «${scenarios[best]?.name ?? ""}».`
          : "Ningún escenario tiene VPN positivo a su tasa de oportunidad."
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Indicadores de cada escenario</caption>
          <thead>
            <tr>
              {["Escenario", "VPN", "TIR", "Payback simple", "Payback descontado", "Decisión"].map(
                (column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      "border-rule border-b px-3 py-2 font-semibold",
                      index === 0 ? "text-left" : "text-right",
                    )}
                  >
                    {column}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((scenario, index) => {
              const result = results[index];
              return (
                <tr
                  key={scenario.id}
                  className={index === best ? "bg-accent/60 font-semibold" : ""}
                >
                  <th scope="row" className="px-3 py-1.5 text-left font-medium">
                    {scenario.name.trim() || "Sin nombre"}
                  </th>
                  {result === null || result === undefined ? (
                    <td colSpan={5} className="text-muted-foreground px-3 py-1.5 text-right">
                      Faltan datos
                    </td>
                  ) : (
                    <>
                      <td className="sl-number px-3 py-1.5 text-right">
                        {formatMoney(result.npv)}
                      </td>
                      <td className="sl-number px-3 py-1.5 text-right">
                        {result.irr !== null ? percent(result.irr) : "—"}
                      </td>
                      <td className="sl-number px-3 py-1.5 text-right">
                        {yearsOrNot(result.payback)}
                      </td>
                      <td className="sl-number px-3 py-1.5 text-right">
                        {yearsOrNot(result.discountedPayback)}
                      </td>
                      <td className="px-3 py-1.5 text-right">{VERDICT_LABELS[result.verdict]}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function ProjectForm({ form }: { form: ScenarioForm }) {
  const patch = useScenariosStore((state) => state.patch);
  const [projection, setProjection] = useState<string | null>(null);
  const [growth, setGrowth] = useState("3");
  const field = (key: keyof ScenarioForm) => ({
    value: form[key] as string,
    onChange: (text: string) => patch({ [key]: text }),
  });
  const moneyField = (key: keyof ScenarioForm) => ({
    ...field(key),
    onBlur: () => patch({ [key]: withThousands(form[key] as string) }),
  });

  const project = (): void => {
    const history = parseHistory(form.history);
    const lastYear = Number(form.historyLastYear);
    const start = Number(form.startYear);
    const gap = start + 1 - lastYear;
    const years = form.demand.length;
    if (history === null || history.length < 2) {
      setProjection("Escribe al menos dos ventas históricas, separadas por punto y coma.");
      return;
    }
    if (!Number.isInteger(gap) || gap < 1) {
      setProjection("El último año con datos debe ser anterior al año 1 del proyecto.");
      return;
    }
    const demand = projectDemand(history, years, gap);
    if (demand === null) return;
    patch({ demand: demand.map(String) });
    const missing = gap - 2; // Lo esperado: el último dato es el año 0 o el anterior.
    setProjection(
      `Listo: se proyectaron ${years} años con la recta de mínimos cuadrados sobre ${history.length} datos históricos.${
        missing > 0
          ? ` Ojo: entre el último dato (${lastYear}) y el año 1 (${start + 1}) hay ${missing + 1} años sin datos; la recta se extiende más lejos y la proyección es menos confiable.`
          : ""
      }`,
    );
  };

  const grow = (): void => {
    const first = readNumber(form.demand[0] ?? "");
    const rate = readNumber(growth);
    if (first === null || rate === null) {
      setProjection("Escribe las unidades del año 1 y el crecimiento anual.");
      return;
    }
    patch({ demand: growDemand(first, rate / 100, form.demand.length).map(String) });
    setProjection(
      `Listo: desde ${formatValue(first, 0)} unidades en el año 1, creciendo ${formatValue(rate, 2)} % al año.`,
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Horizonte y tasas"
        description="Los porcentajes se escriben como 35 para 35 %. Montos en pesos."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="Horizonte (años)" {...field("years")} />
          <NumberField label="Año 0 (año calendario)" {...field("startYear")} />
          <NumberField label="Tasa de oportunidad, TMAR (%)" {...field("discountRate")} />
          <NumberField label="Impuesto de renta (%)" {...field("taxRate")} />
          <NumberField label="Impuesto de ganancia ocasional (%)" {...field("gainTaxRate")} />
        </div>
      </SectionCard>

      <SectionCard
        title="Demanda (Q)"
        description="Unidades (productos o servicios) que se venderán cada año. Escríbelas, hazlas crecer a una tasa fija desde el año 1 o proyéctalas desde las ventas de años anteriores con la recta de mínimos cuadrados."
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <TextField
              label="Ventas de años anteriores (separadas por punto y coma)"
              value={form.history}
              onChange={(text) => patch({ history: text })}
            />
            <NumberField label="Último año con datos" {...field("historyLastYear")} />
            <Button type="button" variant="outline" onClick={project}>
              <TrendingUp aria-hidden="true" />
              Proyectar
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-[18rem_auto] sm:items-end sm:justify-start">
            <NumberField
              label="Crecimiento anual de la demanda (%)"
              value={growth}
              onChange={setGrowth}
            />
            <Button type="button" variant="outline" onClick={grow}>
              <TrendingUp aria-hidden="true" />
              Llenar desde el año 1
            </Button>
          </div>
          <p role="status" className="text-muted-foreground text-sm empty:hidden">
            {projection}
          </p>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {form.demand.map((value, index) => (
              <NumberField
                key={index}
                label={`Unidades, ${yearLabel(form, index + 1).toLowerCase()}`}
                value={value}
                onChange={(text) =>
                  patch({ demand: form.demand.map((entry, i) => (i === index ? text : entry)) })
                }
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Precio, costos y gastos"
        description="Ingresos = Q × precio. Cada rubro es fijo por año, por unidad vendida (se multiplica por Q) o un % de los ingresos, como una comisión. Los montos son del año 1; con crecimiento 0 se trabaja a precios constantes."
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="Precio de venta por unidad ($)" {...moneyField("price")} />
            <NumberField label="Crecimiento anual del precio (%)" {...field("priceGrowth")} />
            <NumberField label="Crecimiento anual de los costos (%)" {...field("costGrowth")} />
          </div>
          <RowList
            items={form.costs}
            noun="rubro"
            empty={EMPTY_COST}
            layout="lg:grid-cols-[2fr_1fr_1fr_auto]"
            compact
            onChange={(costs) => patch({ costs })}
            render={(cost, update, index) => (
              <>
                <TextField
                  label={`Rubro ${index + 1}`}
                  value={cost.name}
                  onChange={(name) => update({ name })}
                />
                <Field
                  label="Tipo"
                  value={cost.kind}
                  onChange={(kind) => update({ kind: kind as CostKind })}
                  options={COST_KINDS}
                />
                <NumberField
                  label={cost.kind === "porcentaje" ? "% de los ingresos" : "Monto del año 1 ($)"}
                  value={cost.amount}
                  onChange={(amount) => update({ amount })}
                  onBlur={() =>
                    cost.kind !== "porcentaje" && update({ amount: withThousands(cost.amount) })
                  }
                />
              </>
            )}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Inversiones"
        description="Cada activo sale en el año en que se compra (0 = antes de operar) y se deprecia en línea recta. El valor comercial es en cuánto se vende al final. El capital de trabajo sale en el año 0 y se recupera al final."
      >
        <div className="flex flex-col gap-5">
          <div className="max-w-xs">
            <NumberField label="Capital de trabajo ($)" {...moneyField("workingCapital")} />
          </div>
          <RowList
            items={form.assets}
            noun="activo"
            empty={EMPTY_ASSET}
            onChange={(assets) => patch({ assets })}
            render={(asset, update, index) => (
              <>
                <TextField
                  label={`Nombre del activo ${index + 1}`}
                  value={asset.name}
                  onChange={(name) => update({ name })}
                />
                <NumberField
                  label="Valor ($)"
                  value={asset.value}
                  onChange={(value) => update({ value })}
                  onBlur={() => update({ value: withThousands(asset.value) })}
                />
                <NumberField
                  label="Año de compra"
                  value={asset.year}
                  onChange={(year) => update({ year })}
                />
                <NumberField
                  label="Vida útil (años)"
                  value={asset.life}
                  onChange={(life) => update({ life })}
                />
                <NumberField
                  label="Valor comercial al final ($)"
                  value={asset.salvage}
                  onChange={(salvage) => update({ salvage })}
                  onBlur={() => update({ salvage: withThousands(asset.salvage) })}
                />
              </>
            )}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Financiación"
        description="Préstamos y aportes con su tasa efectiva anual (E.A.). Al flujo de caja pasan solo sus intereses, antes de impuestos. Cuota fija: cuotas iguales. Intereses cada año: el capital se paga al final. Todo al final: el interés se suma al saldo y se paga todo en la última cuota. Sin préstamos, el flujo es libre (sin deuda)."
      >
        <RowList
          items={form.loans}
          noun="préstamo"
          empty={EMPTY_LOAN}
          layout="lg:grid-cols-[2fr_2fr_repeat(3,1fr)_auto]"
          onChange={(loans) => patch({ loans })}
          render={(loan, update, index) => (
            <>
              <TextField
                label={`Nombre del préstamo ${index + 1}`}
                value={loan.name}
                onChange={(name) => update({ name })}
              />
              <Field
                label="Forma de pago"
                value={loan.kind}
                onChange={(kind) => update({ kind: kind as LoanKind })}
                options={LOAN_KINDS}
              />
              <NumberField
                label="Monto ($)"
                value={loan.amount}
                onChange={(amount) => update({ amount })}
                onBlur={() => update({ amount: withThousands(loan.amount) })}
              />
              <NumberField
                label="Tasa E.A. (%)"
                value={loan.rate}
                onChange={(rate) => update({ rate })}
              />
              <NumberField
                label="Plazo (años)"
                value={loan.term}
                onChange={(term) => update({ term })}
              />
            </>
          )}
        />
      </SectionCard>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

/** Lista editable de filas (rubros, activos o préstamos) con agregar y quitar. */
function RowList<T extends AssetForm | CostForm | LoanForm>({
  items,
  noun,
  empty,
  layout = "lg:grid-cols-[2fr_repeat(4,1fr)_auto]",
  compact = false,
  onChange,
  render,
}: {
  items: readonly T[];
  noun: string;
  empty: T;
  /** Columnas en pantallas grandes (clase de Tailwind). */
  layout?: string;
  /** En pantallas grandes, filas sin tarjeta y con las etiquetas visibles solo en la primera. */
  compact?: boolean;
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "border-rule grid gap-4 rounded-[var(--radius)] border p-4 sm:grid-cols-2 lg:items-end",
            compact && "lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-2",
            compact && index > 0 && "lg:[&_label]:sr-only",
            layout,
          )}
        >
          {render(
            item,
            (patch) =>
              onChange(items.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))),
            index,
          )}
          <Button
            type="button"
            variant="ghost"
            className="h-11 min-w-11"
            aria-label={`Quitar ${noun} ${index + 1}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => onChange([...items, empty])}
      >
        <Plus aria-hidden="true" />
        Agregar {noun}
      </Button>
    </div>
  );
}

function Results({
  form,
  name,
  input,
  result,
}: {
  form: ScenarioForm;
  name: string;
  input: CashFlowInput;
  result: CashFlowResult;
}) {
  const interpretation = describeCashFlow(input, result);
  const columns = result.rows.map((row) => yearLabel(form, row.year));
  const table = cashFlowTable(input, result);

  return (
    <div id="resultados" className="flex scroll-mt-6 flex-col gap-8">
      <InterpretationPanel
        title="¿Se recomienda el proyecto?"
        name={name}
        interpretation={interpretation}
        steps={cashFlowSteps(input, result)}
        actions={
          <CopyButton
            what="la interpretación"
            getText={() => interpretationToText(interpretation)}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          name={`VPN (${percent(input.discountRate)})`}
          value={formatMoney(result.npv)}
          meaning="Lo que el proyecto deja en pesos de hoy, después de recuperar la inversión y de pagar tu tasa de oportunidad."
          purpose="Positivo: se espera ganar más que en la alternativa; se recomienda. Negativo: se espera ganar menos, no es pérdida."
          formula="VPN = Σ Flujoₜ ÷ (1 + TMAR)ᵗ"
        />
        {result.irr !== null ? (
          <MetricCard
            name="TIR"
            value={percent(result.irr)}
            meaning="La rentabilidad que genera la inversión: la tasa con la que el VPN da cero."
            purpose="Negativa: pérdida. Cero: punto de equilibrio. Positiva: rentable; se recomienda si supera la TMAR."
          />
        ) : (
          <MetricCard
            name="TIR"
            available={false}
            reason="El VPN no llega a cero con ninguna tasa razonable."
          />
        )}
        {result.payback !== null ? (
          <MetricCard
            name="Payback simple"
            value={formatValue(result.payback, 1)}
            unit="años"
            meaning="Cuánto tarda en volver la inversión sumando los flujos sin descontar."
          />
        ) : (
          <MetricCard
            name="Payback simple"
            available={false}
            reason={`No se recupera en ${input.years} años.`}
          />
        )}
        {result.discountedPayback !== null ? (
          <MetricCard
            name="Payback descontado"
            value={formatValue(result.discountedPayback, 1)}
            unit="años"
            meaning="Cuánto tarda en volver la inversión sumando los flujos en pesos de hoy."
            purpose="Siempre es mayor que el simple. Si pasa de dos tercios del horizonte, revisa los supuestos."
          />
        ) : (
          <MetricCard
            name="Payback descontado"
            available={false}
            reason={`En pesos de hoy no se recupera en ${input.years} años.`}
          />
        )}
        {result.ebitdaMargin !== null ? (
          <MetricCard
            name="Margen EBITDA"
            value={percent(result.ebitdaMargin)}
            meaning={`De cada peso que entra, cuánto queda después de costos y gastos, antes de depreciación, intereses e impuestos. EBITDA promedio: ${formatMoney(result.averageEbitda)} al año.`}
          />
        ) : (
          <MetricCard name="Margen EBITDA" available={false} reason="No hay ingresos." />
        )}
        {result.benefitCost !== null ? (
          <MetricCard
            name="Beneficio/costo"
            value={formatValue(result.benefitCost, 2)}
            meaning="Valor presente de lo que entra dividido por el de lo que sale."
            purpose="Mayor que 1 equivale a VPN positivo."
          />
        ) : (
          <MetricCard name="Beneficio/costo" available={false} reason="No hay flujos negativos." />
        )}
      </div>

      <CashFlowChart
        id={CHART_ID}
        rows={result.rows}
        labels={columns}
        actions={<ChartDownloadButton elementId={CHART_ID} filename="flujo_de_caja.png" />}
      />

      <SectionCard
        title="Flujo de caja proyectado"
        description="Año por año, de los ingresos al flujo de caja y su valor en pesos de hoy."
        actions={
          <CopyButton
            what="el flujo de caja"
            getText={() =>
              tableToTsv(
                ["Concepto", ...columns],
                table.map((line) => [
                  line.label,
                  ...line.values.map((value) => Math.round(value * 100) / 100),
                ]),
              )
            }
          />
        }
      >
        <MoneyTable caption="Flujo de caja proyectado por año" columns={columns} rows={table} />
      </SectionCard>

      {result.loanSchedules.length > 0 ? (
        <SectionCard
          title="Tablas de amortización"
          description="Interés = tasa × saldo anterior. Al flujo de caja pasa la suma de los intereses de cada año."
        >
          <div className="flex flex-col gap-6">
            {result.loanSchedules.map((schedule, index) => {
              const loan = input.loans[index];
              if (loan === undefined) return null;
              return (
                <div key={index} className="flex flex-col gap-2">
                  <h3 className="font-semibold">
                    {loan.name} · {formatMoney(loan.amount)} al {percent(loan.rate)} E.A.,{" "}
                    {loan.term} años
                  </h3>
                  <MoneyTable
                    caption={`Tabla de amortización de ${loan.name}`}
                    columns={schedule.map((row) => `Año ${row.year}`)}
                    rows={[
                      { label: "Cuota", values: schedule.map((row) => row.payment) },
                      { label: "Interés", values: schedule.map((row) => row.interest) },
                      { label: "Amortización", values: schedule.map((row) => row.amortization) },
                      { label: "Saldo", values: schedule.map((row) => row.balance), strong: true },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

/** «Café Cordillera (clase)» → `cafe_cordillera_clase`. */
const slug = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "proyecto";

/** Libro de Excel con Resumen, Supuestos, Flujo, Data histórica, Fuentes y Control de calidad. */
function ExcelDownload(args: ProjectWorkbookArgs) {
  const [busy, setBusy] = useState(false);
  const download = async (): Promise<void> => {
    setBusy(true);
    try {
      const blob = await buildWorkbookXlsx(buildProjectWorkbook(args));
      downloadBlob(blob, `flujo_caja_${slug(args.name)}.xlsx`);
      toast.success("Descargaste el libro de Excel del proyecto.");
    } catch {
      toast.error("No se pudo crear el libro de Excel.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={() => void download()} disabled={busy}>
        <FileSpreadsheet aria-hidden="true" />
        {busy ? "Creando el libro…" : "Descargar Excel"}
      </Button>
      <p className="text-muted-foreground text-xs">
        Resumen, supuestos editables, flujo con fórmulas, data histórica, fuentes y control de
        calidad.
      </p>
    </div>
  );
}

function MoneyTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly CashFlowLine[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="border-rule border-b px-3 py-2 text-left font-semibold">
              Concepto
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-rule border-b px-3 py-2 text-right font-semibold whitespace-nowrap"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={
                row.strong ? "bg-muted border-rule border-t font-bold" : "bg-card font-normal"
              }
            >
              <th
                scope="row"
                className={cn(
                  "sticky left-0 min-w-[11rem] bg-inherit px-3 py-1.5 text-left sm:whitespace-nowrap",
                  row.strong ? "font-bold" : "font-normal",
                )}
              >
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={index}
                  className={cn(
                    "sl-number px-3 py-1.5 text-right whitespace-nowrap",
                    value < -0.5 && "text-destructive",
                  )}
                >
                  {Math.abs(value) < 0.5 ? (
                    <span className="text-muted-foreground" aria-label="cero">
                      —
                    </span>
                  ) : row.units ? (
                    formatValue(value, 0)
                  ) : (
                    formatMoney(value)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
