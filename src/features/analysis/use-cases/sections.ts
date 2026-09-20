/**
 * Identificadores estables de las secciones de la pantalla de resultados.
 *
 * El módulo de exportación (RF-32) elige qué incluir en el PDF a partir de estos
 * `id`, que son exactamente los que renderizan los componentes de este feature.
 *
 * Nota de diseño: la tendencia central (promedios, mediana y moda) se muestra
 * dentro del bloque "Resumen", tal como pide docs/05-diseno.md §5e, así que no
 * emite una sección propia; `ExportSelection.sections` puede mapear
 * "tendencia-central" al id de resumen de la variable.
 */
import type { AnalysisResult, ResultSection } from "../model/types";

/** Bloques que puede tener una variable en la pantalla de resultados. */
export type VariableSectionKind = "resumen" | "frecuencias" | "posicion" | "variabilidad";

/** Id estable de un bloque de una variable, p. ej. `section-edad-frecuencias`. */
export function variableSectionId(variableId: string, kind: VariableSectionKind): string {
  return `section-${variableId}-${kind}`;
}

/** Id estable de un cruce, p. ej. `section-contingencia-sexo-respuesta`. */
export function contingencySectionId(rowVariableId: string, columnVariableId: string): string {
  return `section-contingencia-${rowVariableId}-${columnVariableId}`;
}

/** Id de la cabecera de resultados. */
export const SUMMARY_SECTION_ID = "section-resumen-general";

const TITLES: Readonly<Record<VariableSectionKind, string>> = {
  resumen: "Resumen",
  frecuencias: "Tabla de frecuencias",
  posicion: "Medidas de posición",
  variabilidad: "Medidas de variabilidad",
};

/**
 * Describe las secciones disponibles de un resultado (id y título), en el mismo
 * orden en que se renderizan.
 *
 * @param result - Resultado ya calculado.
 */
export function RESULT_SECTIONS(result: AnalysisResult): ResultSection[] {
  const sections: ResultSection[] = [
    { id: SUMMARY_SECTION_ID, title: "Resumen del análisis", kind: "resumen" },
  ];

  for (const variable of result.variables) {
    const push = (kind: VariableSectionKind, sectionKind: ResultSection["kind"]): void => {
      sections.push({
        id: variableSectionId(variable.variableId, kind),
        title: `${variable.variableName} · ${TITLES[kind]}`,
        kind: sectionKind,
        variableId: variable.variableId,
      });
    };

    push("resumen", "resumen");
    if (
      variable.analysis.frequency !== undefined ||
      variable.analysis.groupedFrequency !== undefined
    ) {
      push("frecuencias", "frecuencias");
    }
    if (variable.analysis.position !== undefined) push("posicion", "posicion");
    if (variable.analysis.variability !== undefined) push("variabilidad", "variabilidad");
  }

  for (const cross of result.contingencies) {
    if (cross.table === null) continue;
    sections.push({
      id: contingencySectionId(cross.request.rowVariableId, cross.request.columnVariableId),
      title: `Cruce: ${cross.rowVariableName} y ${cross.columnVariableName}`,
      kind: "contingencia",
    });
  }

  return sections;
}

/** Alias descriptivo de `RESULT_SECTIONS`. */
export const getResultSections = RESULT_SECTIONS;
