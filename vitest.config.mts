import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: true,
    // Nota: `environmentMatchGlobs` (separar entorno jsdom/node por patrón de archivo)
    // ya no existe en la API de configuración de Vitest 5. Se usa jsdom para todo el
    // proyecto: es compatible tanto con tests de componentes (.test.tsx) como con
    // tests puros de src/core (.test.ts), a costa de una inicialización algo más
    // pesada para estos últimos.
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // Se mide la lógica propia: núcleo, casos de uso de feature y adaptadores.
      // Quedan fuera `src/components/ui` (generado por shadcn), `src/app` (solo
      // composición de layout), los barriles y los propios tests y ayudantes.
      include: ["src/core/**", "src/features/**", "src/infrastructure/**"],
      exclude: ["**/index.ts", "**/*.test.{ts,tsx}", "**/types.ts", "src/infrastructure/ai/**"],
      // Umbrales por encima de lo medido hoy pero sin margen de sobra, para que
      // una regresión de cobertura se note sin volver el CI frágil.
      thresholds: { lines: 88, functions: 82, branches: 78, statements: 88 },
    },
  },
});
