# features/wizard

Flujo guiado paso a paso: cargar datos, confirmar tipos de variable, elegir
cálculos y gráficas, y ver los resultados. Orquesta `core`, `infrastructure`,
`components` y los demás módulos de `features` (analysis y export).

- `model/` — estado plano y funciones puras: `types.ts` (estado y valores por
  defecto), `validation.ts` (`canProceed` con zod y mensajes en español),
  `build-request.ts` (selección → `AnalysisRequest`), `usual-selection.ts`
  (paquete "Cálculos de siempre", RF-13) y `sample-dataset.ts`.
- `store/wizard-store.ts` — Zustand. **Sin** middleware `persist`: el dataset se
  guarda una sola vez al importarlo con `infrastructure/storage` y solo se
  recupera con el botón explícito "Recuperar último análisis" (RNF-14).
- `steps/` — un componente por paso, con el microcopy de docs/05-diseno.md §7.
- `use-cases/report-sections.ts` — traduce el `AnalysisResult` en las
  `AvailableSection` que consume `features/export` para el PDF.
- `wizard.tsx` — composición dentro de `AppShell`, stepper y barra de
  navegación fija.
