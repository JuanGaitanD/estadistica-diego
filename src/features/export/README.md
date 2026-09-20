# features/export

Caso de uso y UI de la exportación de resultados (CSV, XLSX, PNG de gráficas
y reporte PDF con secciones seleccionables). Depende de
`src/infrastructure/export` y de `src/components/ui`.

## Contrato `AvailableSection`

Cualquier otro módulo (por ejemplo `src/features/analysis`) que quiera que
sus resultados se puedan incluir en el reporte PDF debe producir una lista de
objetos `AvailableSection` (definido en `use-cases/build-report-spec.ts`).
Este módulo **no necesita saber nada de jsPDF, html-to-image ni del resto de
`features/export`**: solo debe describir su contenido con datos planos.

```ts
export interface AvailableSection {
  readonly id: string; // debe coincidir con un valor de ExportSelection["sections"]
  readonly title: string; // título visible en el PDF y en el diálogo de exportación
  readonly kind: "table" | "metrics" | "chart" | "text";
  getContent():
    | {
        kind: "table";
        columns: readonly string[];
        rows: readonly (readonly (string | number)[])[];
        note?: string;
      }
    | { kind: "metrics"; items: readonly { label: string; value: string; explanation?: string }[] }
    | { kind: "chart"; elementId: string; caption?: string }
    | { kind: "text"; paragraphs: readonly string[] };
}
```

Reglas del contrato:

- `id` debe ser uno de los valores de `sections` de `ExportSelection`:
  `"resumen" | "frecuencias" | "tendencia-central" | "posicion" | "variabilidad" | "contingencia" | "graficas"`.
  Puede haber varias `AvailableSection` con el mismo `id` (por ejemplo, una
  tabla de frecuencias por cada variable categórica); todas se incluyen si el
  usuario selecciona esa sección.
- Las secciones con `kind: "chart"` se incluyen únicamente si el usuario
  seleccionó `"graficas"` en `ExportSelection.sections`. Su `id` normalmente
  también será `"graficas"`.
- `getContent()` se llama de forma perezosa, solo para las secciones
  finalmente incluidas — puede ser costoso de calcular sin problema.
- Para `kind: "chart"`, `elementId` debe ser el `id` del elemento del DOM que
  contiene la gráfica renderizada (el mismo que usarías con
  `document.getElementById`); `build-report-spec.ts` se encarga de
  capturarlo como imagen con `captureElementAsPng` de `infrastructure/export`.
- El campo `explanation` de `metrics` se omite automáticamente del PDF si
  `ExportSelection.includeExplanations` es `false`; el módulo que implementa
  el contrato no necesita filtrarlo él mismo.
- El **orden final** de las secciones en el PDF sigue el orden de
  `ExportSelection.sections` elegido por la persona usuaria en el diálogo,
  no el orden en que se registran las `AvailableSection`. Entre secciones que
  comparten `id`, se conserva su orden relativo original.

## API pública (`index.ts`)

- `ExportSelection`, `exportSelectionSchema`, `ReportSectionId`, `REPORT_SECTION_IDS`
- `AvailableSection`, `buildReportSpec`
- `captureChartAsDataUrl`
- `ExportToolbar`, `ExportDialog`, `ChartDownloadButton`
