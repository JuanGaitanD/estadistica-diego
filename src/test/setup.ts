import "@testing-library/jest-dom/vitest";

/**
 * Polyfills de jsdom compartidos por toda la suite.
 *
 * `ResizeObserver` lo necesita el `ResponsiveContainer` de Recharts y
 * `matchMedia` lo consultan varios componentes de Radix/shadcn. jsdom no
 * implementa ninguno de los dos. Antes cada test de gráficas repetía su propio
 * mock; aquí se define una sola vez.
 */
class ResizeObserverMock implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverMock;

if (typeof window !== "undefined" && window.matchMedia === undefined) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
