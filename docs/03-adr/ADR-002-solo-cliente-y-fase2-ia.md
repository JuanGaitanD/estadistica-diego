# ADR-002 — Arquitectura solo cliente y previsión del reporte con IA (fase 2)

- **Estado:** aceptado
- **Fecha:** 2026-09-19

## Contexto

El profesor subirá datos reales de sus cursos (potencialmente con información personal de estudiantes). No hay presupuesto ni necesidad de infraestructura. En fase 2 se quiere un reporte narrado generado con Gemini, que sí exige una llamada de red.

## Decisión

### 1. Fase 1: 100 % cliente, sin backend

- Todo el procesamiento (parseo, cálculo, exportación) ocurre en el navegador.
- Sin base de datos, sin telemetría, sin analítica de terceros.
- `next.config.ts` con `output: 'export'`, `images.unoptimized: true`, `trailingSlash: true`. Vercel publica el directorio `out/`.
- La persistencia es `localStorage` y es opcional, visible y borrable por el usuario.
- La UI declara explícitamente: _"Tus datos no salen de este navegador"_.

### 2. El reporte con IA queda como puerto, no como implementación

Se define en `src/infrastructure/ai/ai-report-provider.ts` la interfaz `AiReportProvider` (`isAvailable()`, `generate(request, signal)`) y los tipos `AiReportRequest` / `AiReportResult`, junto con una implementación nula `unavailableAiReportProvider` que responde `isAvailable() === false`. Nada más.

Consecuencias del puerto:

- `features/results` puede renderizar la tarjeta "Reporte con IA — próximamente" consultando `isAvailable()`, sin ninguna dependencia de Gemini.
- La entrada del puerto es el `AnalysisResult` ya calculado, **no** los datos crudos: en fase 2 se podrá enviar solo estadísticos agregados y no las filas del profesor, lo que reduce drásticamente el problema de privacidad.
- Ningún paquete SDK de Gemini entra en `package.json` en fase 1.

### 3. Cómo se resolverá la fase 2 (registrado aquí, no implementado)

La clave de API **no puede vivir en el cliente** de un sitio estático. Opciones previstas, en orden de preferencia:

1. **Route handler de Next en Vercel** (`app/api/reporte/route.ts`) que actúa de proxy con la clave en variable de entorno del servidor. Implica abandonar `output: 'export'` y pasar a despliegue estándar de Vercel: un cambio de una línea de configuración, sin tocar el dominio ni la UI.
2. **Función serverless separada** (Vercel Function o Cloudflare Worker) en otro origen, manteniendo el sitio estático y añadiendo CORS.
3. **Clave aportada por el usuario**, guardada solo en memoria de sesión. Es la única opción que conserva el sitio íntegramente estático, pero traslada fricción a un usuario poco técnico; se descarta como opción principal.

La decisión entre 1 y 2 se tomará en un ADR posterior. El diseño actual hace que ninguna de las tres obligue a cambiar `core` ni `features`.

### 4. Frontera de privacidad

- En fase 2, antes de cualquier envío, la UI debe pedir consentimiento explícito y mostrar exactamente qué se enviará (resumen estadístico, nunca los datos individuales salvo que el usuario lo autorice).
- El puerto lleva `AbortSignal` para que el usuario pueda cancelar.

## Consecuencias

- Fase 1 no tiene coste operativo, ni superficie de ataque de servidor, ni obligaciones de tratamiento de datos personales.
- Los datasets muy grandes dependen del equipo del usuario; se mitiga con los límites de RNF-06 y RNF-08.
- No hay analítica de uso: las decisiones de producto se tomarán hablando con el profesor, no con métricas.
- Aceptar `output: 'export'` hoy no bloquea la fase 2: el cambio es de configuración, no de arquitectura.
