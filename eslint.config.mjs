import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

/**
 * Fronteras entre capas (arquitectura por capas de StatLab).
 *
 * Dirección de dependencias permitida:
 *   app -> features -> (core, infrastructure, components)
 *   infrastructure -> core
 *   components -> core (y components/ui de shadcn)
 *   core -> nada interno (solo TypeScript puro y librerías de cálculo)
 *
 * Decisión: se usa `no-restricted-imports` nativo de ESLint por zona (overrides con `files`)
 * en lugar de `eslint-plugin-boundaries`. Este último aún depende de la resolución de
 * `eslint-plugin-import` y su soporte de ESLint 9 flat config es parcial; la regla nativa
 * no añade dependencias y basta porque todo import interno usa el alias `@/`.
 * Limitación conocida: los imports relativos que crucen capas (`../../features/x`) no se
 * detectan; por convención todo import entre carpetas de `src/` debe usar `@/`.
 */
const restrict = (patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),

  // src/core: lógica pura. Prohibido importar de otras capas, React o Next.
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: restrict([
      {
        group: ["@/infrastructure/*", "@/features/*", "@/components/*", "@/app/*"],
        message: "src/core no puede depender de infrastructure, features, components ni app.",
      },
      {
        group: ["react", "react/*", "react-dom", "react-dom/*", "next", "next/*"],
        message: "src/core debe ser TypeScript puro: sin React ni Next.",
      },
    ]),
  },

  // src/infrastructure: adaptadores. Solo core y librerías externas.
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: restrict([
      {
        group: ["@/features/*", "@/components/*", "@/app/*"],
        message: "src/infrastructure solo puede importar de src/core y librerías externas.",
      },
    ]),
  },

  // src/features: casos de uso y UI de feature. No puede importar de app.
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: restrict([
      {
        group: ["@/app/*"],
        message: "src/features no puede importar de src/app.",
      },
    ]),
  },

  // src/components (excepto ui/ de shadcn): presentacional. Sin features, infra ni app.
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: restrict([
      {
        group: ["@/features/*", "@/infrastructure/*", "@/app/*"],
        message: "src/components solo puede importar de src/core, src/lib y src/components.",
      },
    ]),
  },

  // src/app: rutas. Solo features y components (más lib).
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: restrict([
      {
        group: ["@/core/*", "@/infrastructure/*"],
        message: "src/app solo puede importar de src/features y src/components.",
      },
    ]),
  },

  // src/components/ui es código generado por shadcn: exento de reglas de fronteras.
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
