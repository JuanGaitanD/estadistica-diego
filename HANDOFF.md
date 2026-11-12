# HANDOFF · StatLab

Estado del trabajo de diseño. Última actualización: 2026-11-12 (ronda 2: CI en verde, navegadores objetivo y favicon).

## Pendiente: StatLab hay que terminarlo y mejorarlo

Juan pidió solo **anotar** esto; nada de la lista está arreglado.

**Hallazgos P3 de la revisión del rediseño**

- La cuadrícula vertical de las gráficas cruza las cifras sobre las barras, también en el PNG exportado.
- En modo oscuro el botón de tema sale relleno de ciruela y compite con «Exportar PDF…».
- Cada tabla es una parada de Tab aunque no tenga desplazamiento (15 a 27 por pantalla de resultados).
- `docs/05-diseno.md` describe una cuadrícula de gráficas (8 y 40 px) distinta de la implementada (líneas continuas con opacidad alterna).

**De origen (ya estaban antes del rediseño)**

- El PNG exportado en modo oscuro tiene el fondo blanco (`exportElementAsPng` fija `#ffffff`) y el título casi no se lee. Vive en `src/infrastructure/export`.
- El PDF pesa unos 40 MB (gráficas rasteradas).
- El botón de cerrar de los diálogos y de la hoja de ayuda dice «Close» en inglés.
- Con decimal «Automático», `4.125` se lee como 4125 (comportamiento del parser; la app avisa).
- Las tarjetas de métrica tienen más del 60 % vacío.
- Violación de CSP `script-src eval`: la provoca la sonda `allowsEval` de zod al cargar la página (también en 4.6.5) y, además, la generación del PDF. La CSP de `vercel.json` no se tocó; zod ofrece `jitless` para no sondear.
- El esqueleto de carga parpadea aunque se pida movimiento reducido.
- En `notas.xlsx`, elegir «Otra hoja» no cambia la vista previa.
- No hay `wigi.json`: el repo no lo tiene y no se creó.

## Navegadores objetivo

Declarados en `browserslist` de `package.json`: **Safari y iOS Safari 16.4+, Chrome y Edge 111+, Firefox 128+, Samsung Internet 22+**.

No se llegó a Safari 14 / Chrome y Firefox 90 que pidió Juan como punto de partida: el suelo lo impone **Tailwind CSS 4** (usa `@property`, `color-mix()` y `@layer`), y bajarlo exigiría migrar a Tailwind 3. Next.js 16 ya apunta por defecto a Chrome/Edge 111, Firefox 111 y Safari 16.4; Firefox sube a 128 por Tailwind. Por debajo de ese suelo la página se carga pero sin estilos garantizados.

### Respaldos añadidos (ronda 2)

- `color-mix()` y `oklch()` propios sustituidos por tokens sRGB equivalentes en `globals.css` (`--cuadricula-25/50/55`, `--seleccion`, `--peligro-hover`, sombra flotante) y en `button.tsx`. Tailwind ya protege con `@supports` sus propias mezclas de opacidad.
- `select`: la lista dibujada va dentro de `@supports (appearance: base-select)`; sin él, el control cerrado sigue dibujado y la lista es la nativa (Firefox y móviles). Su `:hover` va en `@media (hover: hover)`.
- `hover:` de Tailwind 4 ya se compila dentro de `@media (hover: hover)` (comprobado en el CSS generado): sin estados pegados en táctil.
- `forced-colors`: foco en `Highlight`, borde en botones, casillas, interruptores y select, marcado con `Highlight`, paso actual con contorno.
- `ResizeObserver` con guarda en las tablas con desplazamiento; `IntersectionObserver` del índice ya la tenía.
- Sin `dvh`/`svh`, `@container` con consultas, `structuredClone`, `.at()`, `inert`, `navigator.clipboard` ni `backdrop-filter` en el código propio. `has-[...]` solo en detalles (relleno de botón, foco de la fila de opción, columnas de la alerta): dentro del suelo declarado está soportado.
- Fuentes: `font-display: swap`, ejes de fuente variable solo en el peso.

### Lo que no se probó de verdad

Safari de macOS e iOS, Samsung Internet, Firefox de escritorio real y navegadores viejos: Playwright solo trae Chromium 158, Firefox 159 y WebKit 27.2. `forced-colors` se emuló con el medio de Playwright, que no recolorea la página (solo activa las reglas `@media`): hay que mirarlo en Windows con un tema de alto contraste. Tampoco el táctil real ni abrir el XLSX/PDF en su aplicación.

## Estado del CI

`.github/workflows/ci.yml` fallaba en `pnpm audit --prod --audit-level high` (19 avisos). Se subieron `next` y `eslint-config-next` 16.3.5 → 16.4.1, `zod` → 4.6.7, y se fijaron con `overrides` de `pnpm-workspace.yaml` `dompurify` ^3.4.17 (vía `jspdf`) y `source-map-js` ^1.2.2 (vía `next`); `sharp` 0.35.5 llega con `next`. Resultado local: `No known vulnerabilities found`. Lint, tipos, 395 tests y build pasan; el formato pasa con `prettier --check --end-of-line auto` (en Linux, con LF, es el comando del CI). **No se ha visto el run real en GitHub** (no se hizo push). Cálculos y exportaciones idénticos tras la actualización: motor byte a byte, CSV, XLSX y PNG byte a byte, PDF con el mismo texto y páginas (cambian la hora impresa y las marcas de creación).

## Favicon

Palotes de conteo sobre placa ciruela: `src/app/icon1.svg` (SVG), `icon2.png` (32 px) y `apple-icon.png` (180 px, opaco), más `theme-color` en el `viewport` de `layout.tsx`. El logo de la cabecera (`brand-logo.tsx`) dibuja lo mismo. No hay manifest ni `favicon.ico`.

## Dónde estamos

Rediseño visual completo en la rama `design/disenojg`, integrada en `main` por avance rápido y publicada el 2026-11-12: dirección **«cuaderno de laboratorio de estadística»**, decidida en `docs/05-diseno.md` («Decisión final (2026-11-12)»). La decisión anterior (editorial académico, verde bosque, Plus Jakarta Sans) quedó como histórico en el mismo documento.

Qué cambió: paleta fría de papel cuadriculado con acción **ciruela `#7e306b`**, **Atkinson Hyperlegible Next y Mono** con `next/font`, botón con cuerpo, foco con anillo doble, campos y casillas propios, `select` nativo dibujado, tablas con cifras en mono, tema de gráficas con papel milimétrico y firma de **palotes de conteo** (stepper, carga, vacíos).

Qué **no** cambió: motor de cálculo (`src/core`), casos de uso, modelos, stores, parsers y exportación (`src/infrastructure`), formato de números, textos de las pantallas (salvo los tres cambios declarados abajo).

Cambios de texto/estructura declarados: desaparece el eyebrow duplicado «Paso N · …» (lo dice el stepper), aparece el enlace «Saltar al contenido» y la tabla del mapa de calor gana título (`caption`).

## Cómo verificar

En el repo:

```bash
pnpm check     # lint + format:check + typecheck + test (395 tests: los 391 de antes + 1 del color de texto del mapa de calor + 3 del select)
pnpm build     # export estático a out/
pnpm dev --port 3101
```

- **Windows:** con `core.autocrlf=true` el checkout deja los archivos en CRLF y `pnpm format:check` marca archivos que no se tocaron (también en `main`). Para comprobar el formato sin ese ruido: `npx prettier --check --end-of-line auto .`.
- **Cálculos idénticos** (la comprobación que importa en un rediseño): los scripts viven fuera del repo, en la carpeta de artefactos del encargo (`comparar-calculos.mjs`, `volcado-directo.mjs`, línea base en `antes/`). Con el servidor en marcha: `comparar-calculos.mjs --url … --salida despues/resultados.json` y `--diff antes/resultados.json despues/resultados.json` (solo deben salir las diferencias declaradas arriba); `volcado-directo.mjs --salida despues/motor.json` y `git diff --no-index antes/motor.json despues/motor.json` (debe salir vacío). Resultado a 2026-11-12: motor idéntico byte a byte; interfaz con solo las diferencias declaradas.
- **Visual:** capturas a 390, 768 y 1440 px en claro y oscuro con el auditor de la skill `diseñoJG` (`auditoria-visual.js`), recorrido con Tab, y pasada en Chromium, Firefox y WebKit.

## Notas de implementación

- `components/ui/select.tsx` conserva la API compuesta de Radix (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`) pero pinta un `<select>` nativo; la lista abierta se dibuja solo con `appearance: base-select` (Chromium 135+, y WebKit 27 en la prueba). Firefox y móviles usan la lista nativa.
- El foco es una sola regla global en `globals.css` (fuera de las capas). No añadas `focus-visible:ring-*` en componentes.
- Las tablas equivalentes de las gráficas van dentro de `div.sr-only` con `table-fixed w-px`: sin eso una `<table>` ignora el ancho de 1 px y provoca desborde horizontal en móvil.
- `Button` admite `loading` (conserva cuerpo y ancho, `aria-busy`, ignora el clic). No se usa en «Descargar PNG» porque esa fila entra en la imagen exportada.
- Con `next dev`, el bloque `nextjs-agent-rules` de `AGENTS.md` se regenera con cada `next dev`; Next 16.4.1 cambió su título a `##` y ese cambio se commiteó (`chore(next)`).

## Revisión independiente de la ronda 2 (2026-11-12)

Veredicto: apto para publicar, sin bloqueantes. Audit en verde (Next 16.4.1 era el mínimo: los avisos críticos llegan hasta 16.4.0); lint, formato en LF, tipos, 395 tests y build pasan; cálculos con cero diferencias y motor idéntico byte a byte; CSV, XLSX y PNG idénticos byte a byte y PDF con el mismo texto salvo la hora; sin peticiones externas con la CSP de `vercel.json`; 30 casos por navegador sin desborde ni errores, y la comparación píxel a píxel con `main` solo cambia el logo y el contorno del paso actual en `forced-colors`. P3 abiertos: la sonda `Function("")` de zod provoca la violación de CSP `eval` al cargar (ya ocurría; se quitaría con `z.config({ jitless: true })`); quedan en `public/` iconos de la plantilla de Next sin uso; `/favicon.ico` da 404 si se pide a mano (los navegadores usan los enlaces del HTML).

## Revisión independiente de la ronda 1 (2026-11-12)

Veredicto: apto con una corrección, ya aplicada en `fix(ui): dejar vacío el select cuando el valor guardado ya no es una opción` (el `select` mostraba la primera opción cuando el valor guardado dejaba de estar disponible, por ejemplo al pasar a cualitativa la columna de pesos; el cálculo no cambiaba, solo lo que se veía). Cálculos: motor idéntico byte a byte; por la interfaz solo las tres diferencias de texto declaradas, también con un conjunto de datos propio del revisor (negativos, repetidos, categórica, vacíos y cruce) comparado contra `main`. Lint, typecheck, test y build pasan; el formato pasa en LF (como lo ve el CI). CSV y XLSX exportados idénticos a los de `main`. Con las cabeceras de `vercel.json`, ninguna petición externa. Sin desborde en Chromium, Firefox y WebKit a 390 y 1440 px. Movimiento reducido, `forced-colors` y zoom al 200 % comprobados emulados.

Los hallazgos P3 abiertos están en «Pendiente: StatLab hay que terminarlo y mejorarlo», arriba.
