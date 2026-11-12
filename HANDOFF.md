# HANDOFF · StatLab

Estado del trabajo de diseño. Última actualización: 2026-11-12.

## Dónde estamos

Rediseño visual completo en la rama `design/disenojg` (sin `push`, PR ni despliegue): dirección **«cuaderno de laboratorio de estadística»**, decidida en `docs/05-diseno.md` («Decisión final (2026-11-12)»). La decisión anterior (editorial académico, verde bosque, Plus Jakarta Sans) quedó como histórico en el mismo documento.

Qué cambió: paleta fría de papel cuadriculado con acción **ciruela `#7e306b`**, **Atkinson Hyperlegible Next y Mono** con `next/font`, botón con cuerpo, foco con anillo doble, campos y casillas propios, `select` nativo dibujado, tablas con cifras en mono, tema de gráficas con papel milimétrico y firma de **palotes de conteo** (stepper, carga, vacíos).

Qué **no** cambió: motor de cálculo (`src/core`), casos de uso, modelos, stores, parsers y exportación (`src/infrastructure`), formato de números, textos de las pantallas (salvo los tres cambios declarados abajo).

Cambios de texto/estructura declarados: desaparece el eyebrow duplicado «Paso N · …» (lo dice el stepper), aparece el enlace «Saltar al contenido» y la tabla del mapa de calor gana título (`caption`).

## Cómo verificar

En el repo:

```bash
pnpm check     # lint + format:check + typecheck + test (392 tests: los 391 de antes + 1 del color de texto del mapa de calor)
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
- Con `next dev`, el bloque `nextjs-agent-rules` de `AGENTS.md` puede regenerarse; en este trabajo no cambió el archivo.

## Pendiente

- **Exportar a PNG en modo oscuro:** `exportElementAsPng` fija el fondo blanco (`#ffffff`) mientras la gráfica usa texto claro en oscuro, así que el título sale casi invisible. Es anterior al rediseño y está en `src/infrastructure/export` / `features/export/use-cases` (zona que este trabajo no tocó). Conviene que el fondo de la exportación siga el tema.
- El botón de cerrar de los diálogos y la hoja de ayuda conserva su etiqueta accesible en inglés («Close»). No se tradujo para no alterar textos; es un cambio de una palabra.
- Con decimal «Automático», `4.125` se lee como 4125 (comportamiento del parser; no se tocó).
- Sin verificar: lector de pantalla real, zoom 200 %, `forced-colors`, abrir el XLSX/PDF exportado en su aplicación de escritorio.
- Sin `wigi.json`: el repo no lo tiene y no se creó.
