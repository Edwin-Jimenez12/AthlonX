# AthlonX — Guía para Claude

Plataforma de gestión deportiva (jugadores, coaches, directivos). El detalle funcional está en `README.md`.

## Bitácora (obligatorio)

Lleva el registro en `BITACORA.md`, en la raíz del repo.
- Antes de empezar, lee las últimas entradas para saber en qué quedó el trabajo, sea en la nube o en local.
- Al terminar una tarea, y antes de hacer commit, agrega una entrada **arriba del todo** con: fecha, rama, entorno (nube/local), qué se hizo, archivos clave, cómo se verificó y qué queda pendiente.
- Escribe para alguien que no vio la sesión. Sin relleno.

## Stack

- Next.js 16 (App Router, Turbopack), React 19 y TypeScript 5.8. OpenNext para Cloudflare rechaza versiones de Next sin soporte oficial (2 años desde su lanzamiento): mantén Next en una versión mayor soportada.
- Tailwind CSS 4 (`@tailwindcss/postcss`) y CSS propio en `app/globals.css`.
- Supabase (`@supabase/supabase-js`); el cliente está en `lib/supabase.ts`.
- Despliegue en Cloudflare con OpenNext (`wrangler.jsonc`, `open-next.config.ts`).
- Node `22.16.0` (`.node-version`).
- Iconos: `lucide-react`, `react-icons` y `country-flag-icons`.

## Comandos

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
node --test tests/*.mjs # pruebas de reglas (basketball, football-eight, regresión de torneos)
npm run preview    # build de OpenNext y preview de Cloudflare
npm run deploy     # despliega a Cloudflare: solo si se pide explícitamente
```

Las variables van en `.env.local` (no se sube a git); toma `.env.example` como base.

## Estructura

- `app/`: rutas públicas (`page.tsx`, `nosotros`, `contactanos`, `novedades`, `invitacion`).
- `app/(panel)/`: panel autenticado (`busqueda`, `equipos`, `torneos`, `eventos`, `partidos`, `estadisticas`, `calendario`, `configuracion`, etc.). `/dashboard` redirige a `/busqueda`.
- `Components/`: componentes compartidos. **La C es mayúscula.**
- `lib/`: lógica de dominio. Las reglas de cada deporte van separadas: `basketball.ts`, `football-eight.ts`.
- `supabase/`: migraciones SQL sueltas, idempotentes, que se ejecutan a mano en orden. No se ejecuta SQL contra el proyecto real sin pedirlo.
- `documentos/`: documentación de implementación (por ejemplo, `implementacion-baloncesto-3x3.md`).
- Los archivos `*.before-*.tsx` / `*.before-*.css` son respaldos de versiones anteriores. No se editan ni se importan.

## Convenciones

- La UI y los textos van en español.
- Sigue el estilo de lo que ya existe: los nombres, la densidad de comentarios y los patrones de componentes.
- No mezcles reglas de un deporte con las de otro; cada disciplina tiene su módulo en `lib/`.

## Sistema de diseño

- Tokens del panel en `.athlonx-dashboard` (`app/globals.css`): `--ax-bg`, `--ax-surface`, `--ax-surface-raised`, `--ax-line`, `--ax-text`, `--ax-muted`, `--ax-accent` (#b4ff45, verde lima), `--ax-on-accent`.
- Tema oscuro por defecto y claro con `data-theme='light'` (`lib/theme.ts`, `Components/theme-sync.tsx`).
- Fuentes locales en `app/fonts/`: Inter, Oswald, Barlow Condensed y Bebas Neue.
- Transiciones compartidas en `Components/site-transitions.css`.
- Usa los tokens; no metas colores sueltos.
- **Rediseño (`.ax-v2`)**: las pantallas rediseñadas (por ahora `app/(panel)/equipo`) van dentro de un contenedor `.ax-v2`, que queda fuera de los overrides globales heredados (radio forzado a 5px, fondos fijos de inputs, bordes de section/article). Usan solo tokens `var(--ax-*)` y las piezas de `Components/mi-equipo/ui.tsx`.
- **Regla de diseño**: todo lo que se construya en código debe seguir el diseño de Figma (página `Claude`). Si un componente no tiene diseño en Figma, se hace con el mismo lenguaje: mismos tokens, radios (10 px en botones y campos, 14 px en paneles, 20 px en tarjetas), tipografía (Bebas Neue en títulos, Inter en la interfaz) y patrones (paneles inline en vez de modales, confirmación inline en vez de `window.confirm`).
- `.next/` y `tsconfig.tsbuildinfo` están versionados por error: si un build o `tsc` los cambia, restáuralos con `git checkout -- .next tsconfig.tsbuildinfo` antes de hacer commit.

## Herramientas de diseño instaladas

Las skills viven en `.claude/skills/` (proyecto). Úsalas en cualquier trabajo de UI:
- `impeccable`: tipografía, espaciado, color, jerarquía, auditoría y pulido (incluye los comandos audit, critique y polish).
- `design-taste-frontend` (Taste): dirección de arte y referencias. Úsala para evitar diseños genéricos.
- Emil Kowalski: `emil-design-eng` (criterio general) y `animate`, `review-animations`, `improve-animations`, `animation-performance`, `find-animation-opportunities`, `animation-vocabulary`, `apple-design`, `break-ui`, `prototype` y `pick-ui-library`.
- Subagentes de Impeccable en `.claude/agents/`.

**Hooks de Impeccable** (`.claude/settings.json`): revisan cada archivo de UI editado y hacen una pasada profunda al terminar el turno. En el primer uso descargan el motor de Impeccable y lo guardan en caché. Atiende lo que reporten.

**Verificación visual:** después de cambiar UI, levanta `npm run dev`, abre la página con Playwright (MCP `playwright`), toma capturas en escritorio y móvil (390px), y revisa también el tema claro y el oscuro.

**Figma:** el archivo es `https://www.figma.com/design/YBGPZrYsYNb5259mmBgoF1/AthlonX` (fileKey `YBGPZrYsYNb5259mmBgoF1`). La página `Claude` (id `954:56`) es el espacio de trabajo de Claude. No toques las páginas `instagram`, `Manual` ni `Page 11` salvo que se pida.

### Playwright en local

`.mcp.json` está configurado para la nube: apunta al Chromium de `/opt/pw-browsers`. En local, crea un override con alcance local, que tiene prioridad sobre el del proyecto:

```bash
claude mcp add playwright -s local -- npx -y @playwright/mcp@0.0.83 --headless --isolated
```

Ese comando usa tu Chrome instalado. Si no tienes Chrome, instala el navegador de Playwright con `npx playwright install chromium` y agrega `--browser chromium`.

## Git

- Rama de trabajo: **`edwin`**. Los cambios se hacen en `edwin` y, ya verificados, se pasan a `main` (fast-forward: `git push origin edwin:main`). Así lo pidió Edwin el 2026-10-23.
- Si `main` tiene commits que no están en `edwin`, primero trae `main` a `edwin` (merge) y luego pasa `edwin` a `main`. Nunca hagas force-push a `main`.
- Haz commits pequeños con mensajes descriptivos.
- Actualiza `BITACORA.md` en el mismo commit que el cambio.
