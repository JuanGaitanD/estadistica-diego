# StatLab — Despliegue

StatLab es una aplicación 100 % estática (`output: "export"`): no necesita servidor Node en producción, solo un hosting de archivos estáticos con las cabeceras correctas. Esta guía cubre el despliegue en [Vercel](https://vercel.com) desde GitHub.

## 1. Importar el repositorio en Vercel

1. En el panel de Vercel, **Add New → Project**.
2. Elegir **Import Git Repository** y seleccionar este repositorio de GitHub (autorizando el acceso de Vercel a GitHub si es la primera vez).
3. En la configuración del proyecto:
   - **Framework Preset:** `Next.js` (Vercel lo detecta automáticamente al ver `next.config.ts`).
   - **Build Command:** `pnpm build`.
   - **Output Directory:** `out` (por el `output: "export"` de `next.config.ts`; en proyectos Next.js con export estático, Vercel también lo detecta solo, pero conviene dejarlo explícito).
   - **Install Command:** dejar el que infiere Vercel a partir de `pnpm-lock.yaml` (`pnpm install`).
4. **Variables de entorno / versión de Node:** fijar Node **22** en la configuración del proyecto (Settings → General → Node.js Version), para que coincida con `.nvmrc` y con lo usado en desarrollo. StatLab no requiere variables de entorno para funcionar (no hay backend ni claves de API en fase 1).
5. Confirmar el despliegue. Vercel construye la rama por defecto (`main`) y genera un dominio `*.vercel.app` de vista previa.

## 2. Configurar el subdominio

Dominio previsto: `estadistica.juandgaitan.com`.

1. En el proyecto de Vercel: **Settings → Domains → Add**.
2. Escribir `estadistica.juandgaitan.com` y confirmar. Vercel indicará el registro DNS exacto a crear.
3. En el proveedor DNS del dominio `juandgaitan.com`, crear un registro:
   - **Tipo:** `CNAME`
   - **Nombre/Host:** `estadistica`
   - **Valor/Destino:** `cname.vercel-dns.com`
   - **TTL:** el valor por defecto del proveedor (o el más bajo disponible mientras se verifica, para propagar rápido).
4. Esperar la propagación DNS (minutos a un par de horas) y volver a **Settings → Domains** en Vercel: el estado debe pasar de "Pendiente" a "Válido", y Vercel emite el certificado TLS automáticamente.

## 3. Verificar las cabeceras de seguridad

Las cabeceras (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options) están definidas en `vercel.json` y se aplican a todas las rutas (`/(.*)`). Después de desplegar, verificar con `curl`:

```bash
curl -sI https://estadistica.juandgaitan.com | grep -iE "content-security-policy|x-content-type-options|referrer-policy|permissions-policy|x-frame-options"
```

Se debe ver algo equivalente a:

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
x-frame-options: DENY
```

Si alguna cabecera falta, revisar que `vercel.json` esté en la raíz del repositorio y que el proyecto en Vercel apunte a esa raíz (no a un subdirectorio).

`connect-src 'self'` bloquea deliberadamente cualquier llamada de red saliente: es la cabecera que hace cumplir, a nivel de navegador, la promesa de que los datos del usuario no salen del dispositivo. Si en una fase 2 se activa el reporte con IA (Gemini), esta directiva deberá ampliarse explícitamente y de forma consciente.

## 4. Checklist previo a publicar

Antes de mezclar a `main` o de promover un despliegue a producción:

- [ ] `pnpm check` (lint + formato + tipos + tests) termina en verde localmente y en CI.
- [ ] `pnpm build` termina sin errores y sin advertencias bloqueantes; `out/` se genera correctamente.
- [ ] Se probó la build de producción localmente o en el preview de Vercel, revisando la consola del navegador en busca de errores de **Content-Security-Policy** (scripts o estilos bloqueados).
- [ ] Las cabeceras de seguridad se verificaron con `curl` sobre el dominio final (paso 3).
- [ ] El dominio `estadistica.juandgaitan.com` resuelve correctamente y sirve con TLS válido.
- [ ] No quedan `console.log` ni `TODO` en el código que se está publicando.
