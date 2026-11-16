import {
  computeContingencyTable,
  interpretContingency,
  runVariableAnalysis,
  type CalculationStep,
  type Interpretation,
} from "@/core/statistics";
import { importPastedText } from "@/infrastructure/import/text-importer";
import { SAMPLE_DATA_NAME, SAMPLE_DATA_TEXT } from "@/features/wizard/model/sample-dataset";

/** Lo que la portada muestra de los datos de ejemplo, calculado por el motor real. */
export interface SampleInsights {
  readonly sourceName: string;
  readonly rowCount: number;
  /** Primeras líneas del texto tal como se pega. */
  readonly pastedPreview: readonly string[];
  readonly variable: string;
  readonly interpretation: Interpretation;
  readonly steps: readonly CalculationStep[];
  readonly crossTitle: string;
  readonly crossInterpretation: Interpretation;
}

/**
 * Corre el motor sobre los datos de ejemplo que trae StatLab. Se ejecuta en el
 * build (la portada es estática): las frases que se ven son las que la app
 * produce, no un texto escrito a mano.
 */
export function sampleInsights(): SampleInsights {
  const dataset = importPastedText(SAMPLE_DATA_TEXT, { hasHeader: true });
  const column = (name: string) => {
    const found = dataset.columns.find((entry) => entry.variable.name === name);
    if (found === undefined) throw new Error(`Falta la columna ${name} en los datos de ejemplo`);
    return found;
  };

  const nota = column("Nota");
  const analysis = runVariableAnalysis({
    variableId: nota.variable.id,
    kind: nota.variable.kind,
    values: nota.values,
  });

  const genero = column("Genero");
  const ciudad = column("Ciudad");
  const cross = computeContingencyTable({
    rowVariableId: genero.variable.id,
    columnVariableId: ciudad.variable.id,
    rowValues: genero.values,
    columnValues: ciudad.values,
  });

  return {
    sourceName: SAMPLE_DATA_NAME,
    rowCount: dataset.rowCount,
    pastedPreview: SAMPLE_DATA_TEXT.split("\n").slice(0, 6),
    variable: nota.variable.name,
    interpretation: analysis.interpretation,
    steps: analysis.steps,
    crossTitle: `${genero.variable.name} y ${ciudad.variable.name}`,
    crossInterpretation: interpretContingency(cross, genero.variable.name, ciudad.variable.name),
  };
}
