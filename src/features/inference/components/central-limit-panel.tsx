"use client";

import { Shuffle } from "lucide-react";
import { useMemo, useState } from "react";

import { BarChart } from "@/components/charts";
import { Field } from "@/components/shared/form-fields";
import {
  InterpretationPanel,
  interpretationToText,
} from "@/components/shared/interpretation-panel";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import {
  computeGroupedFrequencyTable,
  detectDecimals,
  simulateSampleMeans,
  type FrequencyTableResult,
} from "@/core/statistics";
import { captureChartAsDataUrl, ChartDownloadButton, CopyButton } from "@/features/export";
import type { NumericColumn } from "@/features/regression";
import { AddToReportButton } from "@/features/report";

const SIZES = ["2", "5", "10", "30", "100"] as const;
/** BarChart arma su id como `chart-${variableId}-bar`. */
const DATA_VARIABLE = "tlc-datos";
const MEANS_VARIABLE = "tlc-promedios";
const DATA_ID = `chart-${DATA_VARIABLE}-bar`;
const MEANS_ID = `chart-${MEANS_VARIABLE}-bar`;

/**
 * Histograma (Sturges). Los promedios arrastran muchos decimales: se redondean
 * a dos más que los datos para que las clases se lean sin aplastarlos.
 */
function histogram(
  values: readonly number[],
  decimals: number,
  variableId: string,
): FrequencyTableResult {
  const factor = 10 ** Math.min(10, decimals);
  return {
    ...computeGroupedFrequencyTable({
      variableId,
      values: values.map((v) => Math.round(v * factor) / factor),
      grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
    }),
    variableId,
  };
}

/**
 * «¿Por qué los promedios forman una campana?»: simula el teorema del límite
 * central con los datos de una variable tomados como población.
 */
export function CentralLimitPanel({ columns }: { columns: readonly NumericColumn[] }) {
  const [columnId, setColumnId] = useState(columns[0]?.id ?? "");
  const [sizeText, setSizeText] = useState<string>("5");
  const [seed, setSeed] = useState(1);
  const column = columns.find((entry) => entry.id === columnId) ?? columns[0];
  const values = useMemo(
    () =>
      column?.values.filter((v): v is number => typeof v === "number" && Number.isFinite(v)) ?? [],
    [column],
  );
  const decimals = detectDecimals(values);
  const sim = useMemo(
    () =>
      column === undefined
        ? null
        : simulateSampleMeans(values, Number(sizeText), column.name, { seed }),
    [column, values, sizeText, seed],
  );

  return (
    <SectionCard
      title="¿Por qué los promedios forman una campana?"
      description="El teorema del límite central, simulado con tus datos: se sacan muchas muestras al azar y se mira cómo se reparten sus promedios."
    >
      {column === undefined ? (
        <p className="text-muted-foreground">Hace falta una variable numérica.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid items-end gap-5 sm:grid-cols-3">
            <Field
              label="Variable"
              value={column.id}
              onChange={setColumnId}
              options={columns.map((entry) => ({ id: entry.id, label: entry.name }))}
            />
            <Field
              label="Datos en cada muestra (n)"
              value={sizeText}
              onChange={setSizeText}
              options={SIZES.map((size) => ({ id: size, label: size }))}
            />
            <Button type="button" variant="outline" onClick={() => setSeed((s) => s + 1)}>
              <Shuffle aria-hidden="true" />
              Simular otra vez
            </Button>
          </div>
          {sim === null ? (
            <p className="text-muted-foreground">
              Hacen falta al menos 2 datos que no sean todos iguales.
            </p>
          ) : (
            <>
              <InterpretationPanel
                title="Qué muestra la simulación"
                name={column.name}
                interpretation={sim.interpretation}
                steps={sim.steps}
                actions={
                  <>
                    <CopyButton
                      what="la lectura"
                      getText={() => interpretationToText(sim.interpretation)}
                    />
                    <AddToReportButton
                      what="la simulación"
                      build={async () => {
                        const images: { title: string; dataUrl: string }[] = [];
                        for (const [id, title] of [
                          [DATA_ID, `Datos de ${column.name}`],
                          [MEANS_ID, `Promedios de muestras de ${sizeText}`],
                        ] as const) {
                          try {
                            images.push({ title, dataUrl: await captureChartAsDataUrl(id) });
                          } catch {
                            // Sin la gráfica en pantalla, la lectura entra igual.
                          }
                        }
                        return {
                          title: `Teorema del límite central · ${column.name}`,
                          interpretation: sim.interpretation,
                          steps: sim.steps,
                          tables: [],
                          images,
                        };
                      }}
                    />
                  </>
                }
              />
              <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                <BarChart
                  data={histogram(values, decimals, DATA_VARIABLE)}
                  title={`Los datos de ${column.name}`}
                  description="La población de la que se sacan las muestras."
                  colorMode="single"
                  actions={<ChartDownloadButton elementId={DATA_ID} filename="tlc_datos.png" />}
                />
                <BarChart
                  data={histogram(sim.means, decimals + 2, MEANS_VARIABLE)}
                  title={`Los promedios de 1.000 muestras de ${sizeText}`}
                  description="Cada barra cuenta cuántas muestras dieron un promedio en esa clase."
                  colorMode="single"
                  actions={
                    <ChartDownloadButton elementId={MEANS_ID} filename="tlc_promedios.png" />
                  }
                />
              </div>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
