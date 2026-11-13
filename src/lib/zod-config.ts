import { z } from "zod";

/**
 * Zod sin compilación JIT. Por defecto sondea con `new Function("")` si puede generar código
 * para acelerar los esquemas de objeto, y con la CSP de `vercel.json` (sin `unsafe-eval`) el
 * navegador registra una violación en cada carga aunque el error se capture. Los esquemas de
 * StatLab validan opciones y estados pequeños: sin JIT la validación es la misma y no se nota.
 *
 * Hay que importar este módulo **antes** de crear cualquier esquema (el sondeo ocurre al crear
 * el primer `z.object`): por eso va como primera importación de cada archivo que define esquemas.
 */
z.config({ jitless: true });
