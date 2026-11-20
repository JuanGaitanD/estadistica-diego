import type { Dataset, VariableKind } from "@/core/data";

import type { AnalysisPanel, ColumnConfig, Zone } from "../model/types";

/** Tipo de pregunta de la fase 1 de CRISP-DM. */
export type QuestionType = "describir" | "comparar" | "relacionar" | "predecir";

export interface Phase {
  readonly id: string;
  readonly title: string;
  /**
   * Zona donde se hace la fase; `null` deja a la persona donde está (en la
   * evaluación se revisa el resultado que ya tiene abierto).
   */
  readonly zone: Zone | null;
  readonly explanation: string;
}

/** Las seis fases de CRISP-DM tal como se recorren en StatLab (docs/09 M9). */
export const PHASES: readonly Phase[] = [
  {
    id: "problema",
    title: "Comprensión del problema",
    zone: "datos",
    explanation:
      "Antes de calcular nada, escribe en una frase qué quieres saber y elige el tipo de pregunta. Eso decide el método.",
  },
  {
    id: "datos",
    title: "Comprensión de los datos",
    zone: "explorar",
    explanation:
      "Carga tus datos y mira el resumen de cada variable: cuántos datos hay, si faltan valores y si hay casos raros.",
  },
  {
    id: "preparacion",
    title: "Preparación",
    zone: "datos",
    explanation:
      "Revisa el tipo de cada variable, deja fuera las que no sirven y ordena las categorías. StatLab anota cada cambio en la bitácora.",
  },
  {
    id: "modelado",
    title: "Modelado",
    zone: "analizar",
    explanation:
      "Usa el método que corresponde a tu pregunta y añade al informe lo que responde. Te llevamos a la herramienta.",
  },
  {
    id: "evaluacion",
    title: "Evaluación",
    zone: null,
    explanation:
      "Antes de creer el resultado, revisa que se cumple lo que el método supone. Marca lo que comprobaste.",
  },
  {
    id: "despliegue",
    title: "Despliegue",
    zone: "informe",
    explanation:
      "Reúne todo en el informe: tu pregunta, la bitácora, los resultados y la evaluación. Descárgalo en PDF o Excel.",
  },
];

/** Herramienta de StatLab que responde un tipo de pregunta. */
export interface GuidedTool {
  readonly label: string;
  readonly zone: Zone;
  readonly panel?: AnalysisPanel;
}

export const QUESTION_TYPES: readonly {
  readonly id: QuestionType;
  readonly label: string;
  readonly example: string;
  /** Qué método responde la pregunta, en llano. */
  readonly method: string;
  /** Dónde se hace; la primera es a la que lleva el Modelado. */
  readonly tools: readonly GuidedTool[];
  readonly checks: readonly string[];
}[] = [
  {
    id: "describir",
    label: "Describir",
    example: "¿Cómo son las notas del curso?",
    method: "la interpretación de cada variable, sus gráficas y la forma de la distribución.",
    tools: [{ label: "Qué dicen tus datos", zone: "explorar" }],
    checks: [
      "Revisé si faltan datos y cuántos.",
      "Miré los casos raros (atípicos) y sé de dónde salen.",
      "Usé la mediana si la variable está muy cargada hacia un lado.",
    ],
  },
  {
    id: "comparar",
    label: "Comparar grupos",
    example: "¿Las mujeres sacaron más que los hombres?",
    method:
      "una prueba de hipótesis. StatLab elige la que corresponde a tus datos y te dice si la diferencia es real y cuánto importa.",
    tools: [{ label: "Pruebas de hipótesis", zone: "analizar", panel: "probar" }],
    checks: [
      "Cada grupo tiene suficientes datos (idealmente 30 o más, o datos parecidos a una normal).",
      "Leí el valor p junto con el tamaño del efecto, no solo si es significativo.",
      "Revisé los avisos de supuestos (normalidad, frecuencias esperadas).",
    ],
  },
  {
    id: "relacionar",
    label: "Relacionar variables",
    example: "¿A más horas de sueño, mejor rendimiento?",
    method:
      "la correlación y la recta si son números; si son categorías, la tabla cruzada con chi-cuadrado en «Qué dicen tus datos».",
    tools: [
      { label: "Correlación y regresión", zone: "analizar", panel: "regresion" },
      { label: "Tablas cruzadas", zone: "explorar" },
    ],
    checks: [
      "Miré la gráfica de dispersión y la relación parece una recta (no una curva).",
      "Hay casos raros que podrían estar moviendo la correlación.",
      "Recordé que relación no es causa.",
    ],
  },
  {
    id: "predecir",
    label: "Predecir",
    example: "¿Cuánto sube la nota por cada hora de estudio?",
    method:
      "una regresión: simple con una variable, múltiple o polinómica con varias o con una curva, y logística si lo que predices es un sí o un no.",
    tools: [
      { label: "Regresión simple", zone: "analizar", panel: "regresion" },
      { label: "Regresión múltiple", zone: "analizar", panel: "multiple" },
      { label: "Regresión logística", zone: "analizar", panel: "logistica" },
    ],
    checks: [
      "El R² (o el ajustado) es suficiente para lo que quiero decidir.",
      "Los residuos se reparten sin forma alrededor de 0.",
      "No predigo fuera del rango de los datos.",
      "Hay al menos 10 filas por variable del modelo.",
    ],
  },
];

/** Semáforo de la evaluación según cuánto se comprobó. */
export function semaphore(done: number, total: number): "verde" | "amarillo" | "rojo" {
  if (total > 0 && done === total) return "verde";
  return done > 0 ? "amarillo" : "rojo";
}

const KIND_LABEL: Readonly<Record<VariableKind, string>> = {
  nominal: "categorías sin orden",
  ordinal: "categorías con orden",
  discreta: "números enteros",
  continua: "números con decimales",
};

/**
 * Bitácora de preparación: compara cómo quedó cada variable con lo que se
 * detectó al cargar los datos.
 */
export function preparationLog(dataset: Dataset, columns: readonly ColumnConfig[]): string[] {
  const log: string[] = [];
  for (const column of columns) {
    const original = dataset.columns.find((entry) => entry.variable.id === column.id);
    if (original === undefined) continue;
    const label = `«${column.name}»`;
    if (column.name !== original.variable.name) {
      log.push(`Se renombró «${original.variable.name}» como ${label}.`);
    }
    if (!column.include) {
      log.push(`${label} se dejó fuera del análisis.`);
      continue;
    }
    if (column.kind !== column.inferredKind) {
      log.push(`${label} pasó de ${KIND_LABEL[column.inferredKind]} a ${KIND_LABEL[column.kind]}.`);
    }
    if (column.kind === "ordinal" && column.categoryOrder.length > 0) {
      log.push(`Orden de ${label}: ${column.categoryOrder.join(" < ")}.`);
    }
    if (original.missingCount > 0) {
      log.push(
        `${label} tiene ${original.missingCount} ${original.missingCount === 1 ? "dato faltante" : "datos faltantes"}: cada cálculo usa solo las filas completas.`,
      );
    }
  }
  return log;
}
