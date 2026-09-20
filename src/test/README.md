# test

Configuración compartida de Vitest y utilidades de prueba.

- `setup.ts` — se carga en **todos** los tests (`setupFiles` de `vitest.config.ts`):
  extiende `expect` con `@testing-library/jest-dom` y define de una sola vez los
  polyfills que jsdom no trae y sí necesitan los componentes: `ResizeObserver`
  (lo pide el `ResponsiveContainer` de Recharts) y `window.matchMedia` (lo
  consultan varios componentes de Radix/shadcn). **No dupliques estos mocks en
  los tests**: ya están puestos.
- `render-with-providers.tsx` — `renderWithProviders(ui)` renderiza con los
  proveedores globales de la aplicación (hoy, `TooltipProvider`).
