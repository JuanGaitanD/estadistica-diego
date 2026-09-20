import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildDataset, type CellValue } from "@/core/data";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { AnalysisRequest, AnalyzedVariable, VariableAnalysisRequest } from "../model/types";
import { runAnalysis } from "../use-cases/run-analysis";
import { AnalysisSummary } from "./analysis-summary";
import { MetricExplanation, explanationText } from "./metric-explanation";
import { VariableResults } from "./variable-results";

const ROWS: readonly (readonly CellValue[])[] = [
  ["M", 1, 1.5],
  ["F", 2, 1.62],
  ["M", 2, 1.71],
  ["F", 3, 1.55],
  ["M", 1, 1.8],
  ["F", 2, 1.66],
  ["M", 4, 1.59],
  ["F", null, 1.74],
];

function variableRequest(
  variableId: string,
  overrides: Partial<VariableAnalysisRequest> = {},
): VariableAnalysisRequest {
  return {
    variableId,
    grouping: { enabled: false, rule: "sturges", closure: "cerrado-abierto" },
    frequency: { relativeMode: "porcentaje", showCumulative: true, showClassMark: true },
    central: {
      arithmetic: true,
      weighted: false,
      geometric: false,
      harmonic: false,
      median: true,
      mode: true,
    },
    position: {
      quartiles: true,
      quartileMethod: "inclusivo",
      includeQ2: true,
      deciles: false,
      percentiles: [90],
    },
    variability: {
      range: true,
      sampleVariance: true,
      populationVariance: false,
      standardDeviation: true,
      coefficientOfVariation: true,
      iqr: true,
      outliers: true,
    },
    ...overrides,
  };
}

function analyze(variables: VariableAnalysisRequest[], extra: Partial<AnalysisRequest> = {}) {
  const dataset = buildDataset(ROWS, { source: "texto", headers: ["Sexo", "Hijos", "Estatura"] });
  return runAnalysis(
    dataset,
    {
      datasetId: dataset.id,
      missingPolicy: "excluir-por-variable",
      variables,
      contingencies: [],
      charts: [],
      ...extra,
    },
    { requestId: "req-1", computedAt: "2026-01-01T00:00:00.000Z" },
  );
}

function renderVariable(variable: AnalyzedVariable) {
  return render(
    <TooltipProvider>
      <VariableResults variable={variable} />
    </TooltipProvider>,
  );
}

describe("VariableResults", () => {
  it("muestra el resumen, las frecuencias, la posición y la variabilidad de una cuantitativa", () => {
    const result = analyze([variableRequest("hijos")]);
    const { container } = renderVariable(result.variables[0] as AnalyzedVariable);

    expect(screen.getByRole("heading", { name: "Hijos" })).toBeInTheDocument();
    expect(screen.getByText("Cuantitativa discreta")).toBeInTheDocument();
    expect(container.querySelector("#section-hijos-resumen")).not.toBeNull();
    expect(container.querySelector("#section-hijos-frecuencias")).not.toBeNull();
    expect(container.querySelector("#section-hijos-posicion")).not.toBeNull();
    expect(container.querySelector("#section-hijos-variabilidad")).not.toBeNull();

    // n, mínimo, máximo y promedios en tarjetas.
    expect(screen.getByText("Datos válidos (n)")).toBeInTheDocument();
    expect(screen.getByText("Mínimo")).toBeInTheDocument();
    expect(screen.getByText("Media aritmética")).toBeInTheDocument();
    expect(screen.getByText("Moda única")).toBeInTheDocument();

    // La tabla de posición indica el método usado.
    expect(screen.getByText(/método inclusivo/)).toBeInTheDocument();
    // El RIC aparece tanto en posición como en variabilidad.
    expect(screen.getAllByRole("cell", { name: /Rango intercuartílico/ })).toHaveLength(2);
  });

  it("muestra el motivo de cada métrica que no está disponible", () => {
    const result = analyze([variableRequest("sexo")]);
    renderVariable(result.variables[0] as AnalyzedVariable);

    expect(screen.getAllByText("No disponible").length).toBeGreaterThan(0);
    expect(screen.getByText("Media aritmética")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Solo se puede calcular con variables cuantitativas/).length,
    ).toBeGreaterThan(0);
    // La moda amodal se explica en vez de mostrar un número.
    expect(screen.getByText(/Amodal: ningún valor destaca/)).toBeInTheDocument();
  });

  it("no pinta columnas redundantes: relativa o porcentual, nunca ambas", () => {
    const result = analyze([
      variableRequest("hijos", {
        frequency: { relativeMode: "proporcion", showCumulative: false, showClassMark: false },
      }),
    ]);
    renderVariable(result.variables[0] as AnalyzedVariable);

    expect(
      screen.getByRole("columnheader", { name: /Frecuencia relativa \(hi\)/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Frecuencia porcentual/ })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /Acumulada/ })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /Marca de clase/ })).toBeNull();
  });

  it("muestra la marca de clase, K y l cuando la variable está agrupada", () => {
    const result = analyze([
      variableRequest("estatura", {
        grouping: { enabled: true, rule: "sturges", closure: "cerrado-abierto" },
      }),
    ]);
    renderVariable(result.variables[0] as AnalyzedVariable);

    expect(screen.getByText("Agrupada en intervalos")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Marca de clase/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Clase \[a, b\)/ })).toBeInTheDocument();
    expect(screen.getByText(/Número de intervalos K =/)).toBeInTheDocument();
    expect(screen.getByText(/Longitud de intervalo l =/)).toBeInTheDocument();
  });

  it("cierra la tabla de frecuencias con una fila de totales", () => {
    const result = analyze([variableRequest("hijos")]);
    renderVariable(result.variables[0] as AnalyzedVariable);
    expect(screen.getAllByText("Total").length).toBeGreaterThan(0);
  });
});

describe("AnalysisSummary", () => {
  it("resume el análisis y lista los avisos en lenguaje llano", () => {
    const result = analyze([variableRequest("sexo"), variableRequest("hijos")]);
    render(<AnalysisSummary result={result} />);

    expect(screen.getByRole("heading", { name: "Aquí están tus resultados" })).toBeInTheDocument();
    expect(screen.getByText("8 fila(s) de datos")).toBeInTheDocument();
    expect(screen.getByText("2 variable(s) analizada(s)")).toBeInTheDocument();
    // Los cálculos que no aplican a una cualitativa no se listan uno a uno:
    // se resumen en una línea y el detalle va agrupado por variable.
    expect(screen.getByText("Cálculos que no aplicaban")).toBeInTheDocument();
    expect(screen.getByText(/Se omitieron \d+ cálculos que no aplican/)).toBeInTheDocument();
    expect(screen.getAllByText("Sexo").length).toBeGreaterThan(1);
  });

  it("agrupa por variable los avisos de cálculos no aplicables", () => {
    const result = analyze([variableRequest("sexo"), variableRequest("hijos")]);
    render(<AnalysisSummary result={result} />);

    const omitted = result.warnings.filter((warning) => warning.informative === true);
    expect(omitted.length).toBeGreaterThan(0);
    // Ningún aviso informativo aparece repitiendo el nombre de la variable.
    expect(screen.queryByText(/no se calculó en "Sexo"/)).toBeNull();
  });

  it("avisa cuando no hay variables analizadas", () => {
    const result = analyze([]);
    render(<AnalysisSummary result={result} title="Resultados de prueba" />);
    expect(screen.getByText("Resultados de prueba")).toBeInTheDocument();
    expect(screen.getByText("No hay variables analizadas")).toBeInTheDocument();
    expect(screen.getByText("Todo en orden con tus datos")).toBeInTheDocument();
  });
});

describe("MetricExplanation", () => {
  it("presenta qué significa, para qué sirve y la fórmula", () => {
    const explanation = {
      what: "El promedio de los datos",
      why: "Resume el centro",
      formula: "x̄ = Σxi / n",
    };
    const { rerender } = render(<MetricExplanation explanation={explanation} />);
    expect(screen.getByText("El promedio de los datos")).toBeInTheDocument();
    expect(screen.getByText("Fórmula")).toBeInTheDocument();

    rerender(<MetricExplanation explanation={explanation} showFormula={false} />);
    expect(screen.queryByText("Fórmula")).toBeNull();
    expect(explanationText(explanation)).toBe("El promedio de los datos. Resume el centro.");
  });
});
