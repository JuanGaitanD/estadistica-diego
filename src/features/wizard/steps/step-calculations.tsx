"use client";

/** Paso 3: "¿Qué cálculos y gráficas necesitas?" (RF-13 a RF-25). */
import { StepHeader } from "@/components/layout/step-header";
import { appliesTo, CHART_REGISTRY, type ChartKind } from "@/components/charts";
import { OptionCard } from "@/components/shared/option-card";
import { SectionCard } from "@/components/shared/section-card";
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
import { getApplicability, type CalculationKey } from "@/features/analysis";

import { isGroupedVariable } from "../model/build-request";
import type { CalculationSelection, ClassRuleChoice, ColumnConfig } from "../model/types";
import { isQuantitative, parsePercentiles } from "../model/validation";
import { useWizardStore } from "../store/wizard-store";

interface OptionState {
  readonly disabled: boolean;
  readonly reason: string;
}

const CHART_KINDS: readonly ChartKind[] = ["pie", "bar", "polygon", "ogive"];

const RULE_LABELS: Readonly<Record<ClassRuleChoice, string>> = {
  sturges: "Sturges (K = techo de 1 + log2 n)",
  raiz: "Raíz cuadrada (K = techo de √n)",
  rice: "Rice (K = techo de 2·n^(1/3))",
  scott: "Scott (según la desviación estándar)",
  "freedman-diaconis": "Freedman–Diaconis (según el RIC)",
  manual: "Yo elijo el número de intervalos",
};

/**
 * Estado de una opción según la matriz de aplicabilidad: se deshabilita solo
 * si no aplica a ninguna de las variables incluidas, y muestra el motivo.
 */
function optionStateFor(
  key: CalculationKey,
  columns: readonly ColumnConfig[],
  calculation: CalculationSelection,
): OptionState {
  if (columns.length === 0) {
    return { disabled: true, reason: "Primero marca al menos una variable en el paso anterior." };
  }
  let firstReason = "";
  for (const column of columns) {
    const applicability = getApplicability(column.kind, isGroupedVariable(column, calculation))[
      key
    ];
    if (applicability.ok) return { disabled: false, reason: applicability.reason };
    if (firstReason === "") firstReason = `${column.name}: ${applicability.reason}`;
  }
  return { disabled: true, reason: firstReason };
}

export function StepCalculations() {
  const columns = useWizardStore((state) => state.columns);
  const calculation = useWizardStore((state) => state.calculation);
  const patch = useWizardStore((state) => state.patchCalculation);
  const toggleChart = useWizardStore((state) => state.toggleChart);
  const selectUsual = useWizardStore((state) => state.selectUsual);

  const included = columns.filter((column) => column.include);
  const numericColumns = included.filter((column) => isQuantitative(column.kind));
  const crossable = included.filter((column) => column.kind !== "continua" || calculation.grouped);
  const percentilesError = calculation.percentiles
    ? parsePercentiles(calculation.percentilesText).error
    : null;

  const state = (key: CalculationKey): OptionState => optionStateFor(key, included, calculation);

  const option = (
    id: string,
    title: string,
    description: string,
    checked: boolean,
    onChange: (value: boolean) => void,
    applicability: OptionState,
  ) => (
    <OptionCard
      id={id}
      title={title}
      description={description}
      checked={checked && !applicability.disabled}
      onCheckedChange={onChange}
      disabled={applicability.disabled}
      {...(applicability.disabled ? { disabledReason: applicability.reason } : {})}
    />
  );

  return (
    <div className="gap-block flex flex-col">
      <StepHeader
        eyebrow="Paso 3 · Cálculos y gráficas"
        title="¿Qué cálculos y gráficas necesitas?"
        subtitle="Marca las medidas que quieres ver en tus resultados; puedes cambiarlas después."
      />

      <div className="border-rule bg-muted/40 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border p-4">
        <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
          Marca el paquete de cálculos de siempre: frecuencias, moda, mediana, promedio, cuartiles y
          variabilidad, con las gráficas que apliquen.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="h-10 shrink-0"
          onClick={() => selectUsual()}
        >
          Seleccionar lo habitual
        </Button>
      </div>

      <SectionCard title="Frecuencias" description="La tabla base de todo análisis descriptivo.">
        <div className="flex flex-col gap-3">
          {option(
            "calc-frecuencias",
            "Tabla de frecuencias",
            "Cuenta cuántas veces aparece cada valor o categoría.",
            calculation.frequencies,
            (value) => patch({ frequencies: value }),
            state("frecuencias"),
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="modo-relativo">Cómo mostrar la proporción</Label>
            <Select
              value={calculation.relativeMode}
              onValueChange={(value) =>
                patch({ relativeMode: value as CalculationSelection["relativeMode"] })
              }
            >
              <SelectTrigger id="modo-relativo" className="w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="porcentaje">Porcentual (%)</SelectItem>
                <SelectItem value="proporcion">Relativa (de 0 a 1)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {option(
            "calc-acumuladas",
            "Frecuencias acumuladas",
            'Responde a "¿cuántos datos hay hasta aquí?".',
            calculation.cumulative,
            (value) => patch({ cumulative: value }),
            state("frecuencia-acumulada"),
          )}

          {option(
            "calc-agrupar",
            "Agrupar en intervalos",
            "Resume muchos valores distintos en clases comparables entre sí.",
            calculation.grouped,
            (value) => patch({ grouped: value }),
            state("frecuencias-agrupadas"),
          )}

          {calculation.grouped ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="regla-k">Regla para el número de intervalos (K)</Label>
              <Select
                value={calculation.rule}
                onValueChange={(value) => patch({ rule: value as ClassRuleChoice })}
              >
                <SelectTrigger id="regla-k" className="w-full sm:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RULE_LABELS) as ClassRuleChoice[]).map((rule) => (
                    <SelectItem key={rule} value={rule}>
                      {RULE_LABELS[rule]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {calculation.rule === "manual" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="k-manual">Número de intervalos</Label>
                  <Input
                    id="k-manual"
                    type="number"
                    min={2}
                    max={30}
                    value={calculation.manualK}
                    onChange={(event) => patch({ manualK: Number(event.target.value) })}
                    className="w-full sm:w-32"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Tendencia central" description="Dónde se concentran los datos.">
        <div className="flex flex-col gap-3">
          {option(
            "calc-moda",
            "Moda",
            "El valor o la categoría que más se repite; el único promedio válido en datos cualitativos.",
            calculation.mode,
            (value) => patch({ mode: value }),
            state("moda"),
          )}
          {option(
            "calc-mediana",
            "Mediana",
            "El valor que parte los datos ordenados en dos mitades; resiste los valores extremos.",
            calculation.median,
            (value) => patch({ median: value }),
            state("mediana"),
          )}
          {option(
            "calc-media",
            "Promedio aritmético",
            "Reparte el total entre todos los datos. Úsalo cuando no hay valores extremos.",
            calculation.arithmetic,
            (value) => patch({ arithmetic: value }),
            state("media-aritmetica"),
          )}
          {option(
            "calc-ponderada",
            "Promedio ponderado",
            "Cuando cada dato pesa distinto: notas por créditos, precios por cantidad vendida.",
            calculation.weighted,
            (value) => patch({ weighted: value }),
            state("media-ponderada"),
          )}
          {calculation.weighted ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="columna-pesos">Columna que trae los pesos</Label>
              <Select
                value={calculation.weightsVariableId ?? ""}
                onValueChange={(value) => patch({ weightsVariableId: value })}
              >
                <SelectTrigger id="columna-pesos" className="w-full sm:w-80">
                  <SelectValue placeholder="Elige una columna numérica" />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {option(
            "calc-geometrica",
            "Promedio geométrico",
            "Para promediar tasas de crecimiento, índices y razones. Requiere valores mayores que cero.",
            calculation.geometric,
            (value) => patch({ geometric: value }),
            state("media-geometrica"),
          )}
          {option(
            "calc-armonica",
            "Promedio armónico",
            "Para promediar velocidades y razones con numerador constante. Ningún valor puede ser cero.",
            calculation.harmonic,
            (value) => patch({ harmonic: value }),
            state("media-armonica"),
          )}
        </div>
      </SectionCard>

      <SectionCard title="Posición" description="Dónde queda un dato respecto al grupo.">
        <div className="flex flex-col gap-3">
          {option(
            "calc-cuartiles",
            "Cuartiles (Q1, Q2, Q3)",
            "Cortan los datos ordenados en cuatro partes iguales.",
            calculation.quartiles,
            (value) => patch({ quartiles: value }),
            state("cuantiles"),
          )}
          {calculation.quartiles ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="metodo-cuartiles">Método de cuartiles</Label>
              <Select
                value={calculation.quartileMethod}
                onValueChange={(value) =>
                  patch({ quartileMethod: value as CalculationSelection["quartileMethod"] })
                }
              >
                <SelectTrigger id="metodo-cuartiles" className="w-full sm:w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inclusivo">Inclusivo (incluye la mediana)</SelectItem>
                  <SelectItem value="exclusivo">Exclusivo (excluye la mediana)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {option(
            "calc-deciles",
            "Deciles (D1 a D9)",
            "Cortan los datos ordenados en diez partes iguales.",
            calculation.deciles,
            (value) => patch({ deciles: value }),
            state("cuantiles"),
          )}
          {option(
            "calc-percentiles",
            "Percentiles elegidos por ti",
            "Escribe los percentiles que te interesan, por ejemplo 10 y 90.",
            calculation.percentiles,
            (value) => patch({ percentiles: value }),
            state("cuantiles"),
          )}
          {calculation.percentiles ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="lista-percentiles">Percentiles (separados por comas)</Label>
              <Input
                id="lista-percentiles"
                value={calculation.percentilesText}
                onChange={(event) => patch({ percentilesText: event.target.value })}
                className="w-full sm:w-80"
                {...(percentilesError !== null
                  ? { "aria-invalid": true, "aria-describedby": "error-percentiles" }
                  : {})}
              />
              {percentilesError !== null ? (
                <p id="error-percentiles" role="alert" className="text-destructive text-sm">
                  {percentilesError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Variabilidad" description="Qué tan dispersos están los datos.">
        <div className="flex flex-col gap-3">
          {option(
            "calc-rango",
            "Rango",
            "Diferencia entre el máximo y el mínimo.",
            calculation.range,
            (value) => patch({ range: value }),
            state("rango"),
          )}
          {option(
            "calc-varianza",
            "Varianza muestral",
            "Promedio de las desviaciones al cuadrado respecto a la media, dividido por n−1.",
            calculation.variance,
            (value) => patch({ variance: value }),
            state("varianza"),
          )}
          {option(
            "calc-desviacion",
            "Desviación estándar",
            "La dispersión típica, en las mismas unidades de los datos.",
            calculation.standardDeviation,
            (value) => patch({ standardDeviation: value }),
            state("varianza"),
          )}
          {option(
            "calc-cv",
            "Coeficiente de variación",
            "La desviación estándar como porcentaje de la media.",
            calculation.coefficientOfVariation,
            (value) => patch({ coefficientOfVariation: value }),
            state("varianza"),
          )}
          {option(
            "calc-ric",
            "Rango intercuartílico (RIC) y valores atípicos",
            "Mide la dispersión del 50 % central y señala los datos fuera de lo común.",
            calculation.iqr,
            (value) => patch({ iqr: value }),
            state("ric"),
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Tabla de contingencia"
        description="Cruza dos variables para explorar si están relacionadas."
      >
        <div className="flex flex-col gap-3">
          {option(
            "calc-contingencia",
            "Cruzar dos variables",
            "Cuenta los casos que combinan dos categorías.",
            calculation.contingency,
            (value) => patch({ contingency: value }),
            state("contingencia"),
          )}
          {calculation.contingency ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="contingencia-fila">Variable de las filas</Label>
                <Select
                  value={calculation.contingencyRowId ?? ""}
                  onValueChange={(value) => patch({ contingencyRowId: value })}
                >
                  <SelectTrigger id="contingencia-fila">
                    <SelectValue placeholder="Elige una variable" />
                  </SelectTrigger>
                  <SelectContent>
                    {crossable.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contingencia-columna">Variable de las columnas</Label>
                <Select
                  value={calculation.contingencyColumnId ?? ""}
                  onValueChange={(value) => patch({ contingencyColumnId: value })}
                >
                  <SelectTrigger id="contingencia-columna">
                    <SelectValue placeholder="Elige una variable" />
                  </SelectTrigger>
                  <SelectContent>
                    {crossable.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Gráficas"
        description="Elige una o varias por variable; las que no aplican quedan bloqueadas con su motivo."
      >
        <div className="flex flex-col gap-6">
          {included.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Marca al menos una variable en el paso anterior para elegir gráficas.
            </p>
          ) : null}
          {included.map((column) => {
            const grouped = isGroupedVariable(column, calculation);
            const selected = calculation.charts[column.id] ?? [];
            return (
              <div key={column.id} className="flex flex-col gap-3">
                <h3 className="text-foreground text-base font-semibold">{column.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CHART_KINDS.map((kind) => {
                    const verdict = appliesTo(kind, column.kind, grouped);
                    const entry = CHART_REGISTRY[kind];
                    return (
                      <OptionCard
                        key={kind}
                        id={`grafica-${column.id}-${kind}`}
                        title={entry.label}
                        description={entry.description}
                        checked={selected.includes(kind) && verdict.ok}
                        onCheckedChange={(value) => toggleChart(column.id, kind, value)}
                        disabled={!verdict.ok}
                        {...(!verdict.ok && verdict.reason !== undefined
                          ? { disabledReason: verdict.reason }
                          : {})}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
