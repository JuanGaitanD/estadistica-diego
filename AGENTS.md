<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Perfil del proyecto

Generado desde `wigi.json`; si no coinciden, manda `wigi.json`.

| Campo                    | Valor                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Proyecto                 | StatLab: plataforma de estadística en el navegador, de lo básico a la regresión, para personas sin formación en estadística                  |
| Tipo y stack             | Web estática, Next.js 16 (React 19), TypeScript, Node 22, pnpm                                                                               |
| Idioma                   | Español (commits, PR, documentación e interfaz)                                                                                              |
| Verificar antes de un PR | `pnpm check` (lint, formato, tipos y tests) y `pnpm build`                                                                                   |
| Arquitectura             | Hexagonal ligera: `core` → `infrastructure` → `features` → `components` → `app`; la regla la hace cumplir ESLint (`docs/02-arquitectura.md`) |
| Lógica de negocio        | `src/core` (puro, sin React ni librerías)                                                                                                    |
| Principio rector         | La interpretación va primero; el paso a paso queda plegado (`docs/03-adr/ADR-004-interpretacion-primero.md`)                                 |
| Plan vigente             | `docs/09-plan-plataforma.md`; estado en `HANDOFF.md`                                                                                         |
