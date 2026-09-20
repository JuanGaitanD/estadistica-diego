# ADR-001 — Stack tecnológico

- **Estado:** aceptado
- **Fecha:** 2026-09-19
- **Contexto:** StatLab es una calculadora estadística web sin backend, desplegada como sitio estático en Vercel bajo `estadistica.juandgaitan.com`, para un usuario experto en estadística y poco hábil con tecnología.

## Decisión

| Área       | Elección                                                            | Motivo                                                                                                       |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Framework  | **Next.js (App Router) + React 19**                                 | Export estático maduro, buen DX, despliegue trivial en Vercel, ecosistema de shadcn/ui                       |
| Lenguaje   | **TypeScript `strict`**                                             | Un dominio estadístico sin tipos estrictos es una fuente de errores silenciosos                              |
| UI         | **shadcn/ui + Tailwind CSS**                                        | Componentes accesibles que se copian al repo (sin dependencia opaca), tokens de color propios para la paleta |
| Gráficas   | **Recharts**                                                        | API declarativa en React, SVG exportable a imagen, suficiente para pie, barras, línea/polígono y ojiva       |
| Excel      | **SheetJS (`xlsx`)**                                                | Lectura y escritura de xlsx en el navegador, sin servidor                                                    |
| CSV        | **PapaParse**                                                       | Autodetección de delimitador, manejo de comillas y de archivos grandes por streaming                         |
| PDF        | **jsPDF + html-to-image**                                           | Genera el PDF en cliente; las gráficas se incrustan como PNG rasterizado del SVG                             |
| Estado     | **Zustand**                                                         | Store mínimo, sin boilerplate, con `persist` a localStorage; fácil de testear fuera de React                 |
| Validación | **zod**                                                             | Valida la entrada del usuario y el estado rehidratado; mensajes en español                                   |
| Tests      | **Vitest** (+ Testing Library)                                      | Rápido, compatible con TS y ESM, ideal para un dominio puro                                                  |
| Calidad    | ESLint (con `import/no-restricted-paths`), Prettier, `tsc --noEmit` | Hace cumplir la regla de dependencia y el estilo                                                             |

## Alternativas consideradas

- **Vite + React Router en lugar de Next.js**: más ligero, pero Next+Vercel es el camino de menor fricción para el dominio ya previsto y deja abierta la fase 2 (una route handler para proxy de Gemini sin migrar de framework).
- **Chart.js o visx en lugar de Recharts**: Chart.js dibuja en canvas (peor accesibilidad y exportación a SVG); visx exige demasiado código de bajo nivel para el alcance.
- **`exceljs` en lugar de SheetJS**: más pesado en el navegador y con peor soporte de lectura de formatos antiguos.
- **Redux Toolkit / Jotai**: Redux añade ceremonia innecesaria; Jotai encaja pero Zustand hace el store trivialmente testeable fuera de React, que es lo que más nos importa.
- **Escribir el dominio en WebAssembly/Rust**: precisión y velocidad excelentes, coste de mantenimiento injustificado para el volumen de datos objetivo.

## Consecuencias

- El cálculo pesado corre en el hilo principal; si algún dataset lo exige, se moverá a un Web Worker sin cambiar el dominio (es puro).
- `xlsx`, `jspdf` y `html-to-image` se cargan con import dinámico para no lastrar el bundle inicial (RNF-13).
- `output: 'export'` restringe el uso de funciones de servidor de Next; se asume conscientemente (ver ADR-002).
- Los componentes de shadcn/ui viven en el repo: actualizarlos es responsabilidad nuestra.
