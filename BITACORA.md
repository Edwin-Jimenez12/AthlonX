# Bitácora AthlonX

Registro de trabajo, en nube y en local. La entrada más reciente va arriba.
Formato: fecha · rama · entorno → qué se hizo · archivos · verificación · pendiente.

---

## 2026-10-23 · `edwin` → `main` · nube · Dorsal y posición editables en la plantilla

**Qué se hizo**
- En Mi equipo, el directivo puede asignar o cambiar el **dorsal** y la **posición** de cada jugador:
  - Desde el menú ⋯ → "Editar dorsal y posición", o tocando el dorsal ("—") de la fila.
  - Es un panel inline con el dorsal (0–99) y la posición; la lista de posiciones depende de la disciplina (rugby, fútbol o baloncesto, según `lib/team-positions.ts`).
- Nueva migración `supabase/team-player-details-migration.sql` con la RPC `set_team_player_details(p_team_id, p_player_id, p_shirt_number, p_position)`:
  - Mismos permisos que `set_team_player_division` (creador del equipo, propietario o directivo).
  - Valida el rango 0–99 y que el dorsal no esté repetido en la misma división.
  - Solo edita jugadores de la plantilla de ese equipo.
- Si la migración no está aplicada, la UI lo dice en lugar de fallar en silencio.
- Se versiona `AGENTS.md`, que `next dev` (Next 16) genera solo.

**Verificación**
- `tsc --noEmit` sin errores y 13 de 13 pruebas.
- Vista previa temporal con Playwright (1280 px oscuro y 390 px claro): abrir desde el "—", elegir la posición y el límite de 2 cifras. Se borró antes del commit.

**Pendiente**
- **Aplicar `supabase/team-player-details-migration.sql` en Supabase.** Sin ella, guardar el dorsal muestra el aviso de que falta la migración.
- El dorsal vive en `players` (global del jugador, no por equipo), igual que en el flujo de solicitudes de cambio de número.

---

## 2026-10-23 · `edwin` → `main` · nube · Build de Cloudflare: actualización a Next.js 16

**Qué pasó**
- El build de Cloudflare (`npx opennextjs-cloudflare build`) falló con "Next.js version 15.5.25 is not supported". OpenNext rechaza versiones mayores de Next con más de 2 años desde su lanzamiento, y Next 15 (oct 2024) dejó de tener soporte en oct 2026. No lo causó ningún cambio de código.

**Qué se hizo**
- Actualización: `next` 16.4.2, `eslint-config-next` 16.4.2, `@opennextjs/cloudflare` 1.20.13 (exige Next ≥16.4.1) y `wrangler` 4.152.
- Next 16 ajustó solo `tsconfig.json` (`moduleResolution: bundler`, `jsx: react-jsx`) y `next-env.d.ts`.
- No hubo que tocar código: no hay `middleware`, y las páginas dinámicas usan `useParams` en cliente.
- `CLAUDE.md`: se actualizó la versión de Next y la nota sobre la política de soporte.

**Verificación**
- `npx opennextjs-cloudflare build` (el mismo comando de Cloudflare) termina bien: "OpenNext build complete".
- El worker, levantado con `wrangler dev`, responde 200 en `/`, `/equipo`, `/equipo/convocatoria`, `/busqueda` y `/torneos/ver/x`.
- `tsc --noEmit` sin errores y `node --test tests/*.mjs` 13 de 13.

**Pendiente**
- Confirmar que el siguiente despliegue en Cloudflare pase, y revisar la app publicada.

---

## 2026-10-23 · `edwin` → `main` · nube · Cambio de flujo de ramas

**Qué se hizo**
- Todo lo de `claude/great-ritchie-2n8uq9` se pasó a `edwin` y de `edwin` a `main` (fast-forward hasta `97b9f88`; las tres ramas partían de `0ad0dc9`).
- A partir de ahora se trabaja en `edwin` y lo verificado se pasa a `main`. La regla quedó en `CLAUDE.md` → Git.

**Pendiente**
- Si `main` despliega automáticamente a Cloudflare, cada paso a `main` sale a producción. Falta confirmarlo.

---

## 2026-10-23 · `claude/great-ritchie-2n8uq9` · nube · Mi equipo rediseñado en código

**Qué se hizo**
- `app/(panel)/equipo/page.tsx` se reescribió según Figma:
  - Cabecera compacta: escudo, nombre, disciplina, "Añadir ubicación" (→ `/configuracion`), "Perfil activo", Editar perfil e Invitar persona.
  - Rejilla responsive: Plantilla y una columna lateral en xl; Plantilla y dos tarjetas en md; una columna en móvil.
- Se quitó de Mi equipo el bloque **Miembros del equipo** (`TeamRosterPanel`). El componente se conserva porque lo usa `app/(panel)/entrenador/equipo/[id]`.
- `TeamDivisionSettings` no se tocó: sigue en Configuración, sin cambios.
- Nuevos componentes en `Components/mi-equipo/`:
  - `ui.tsx`: piezas base del diseño.
  - `use-team-roster.ts`: datos de divisiones, `team_players` con dorsal y posición reales, miembros e invitaciones pendientes.
  - `team-roster-card.tsx`: Plantilla. Divisiones con conteo, buscador y tabla. Menú ⋯ con Ver perfil, Editar rol, Mover de división (`set_team_player_division`) y Quitar (confirmación inline). Panel de divisiones (`save_team_divisions`) y "Añadir jugador".
  - `team-people-card.tsx`: Cuerpo técnico y directiva. La directiva ya no se pierde y la edición de roles se movió aquí.
  - `invite-panel.tsx`: invitación con cualquier rol. Directivo va al equipo y el resto a una división.
  - `member-role-editor.tsx`: editor de rol y cargo, y confirmación inline para quitar.
  - `team-callups-card.tsx`: convocatorias por fecha con el estado de cada división.
- Nueva ruta `app/(panel)/equipo/convocatoria`: abre el panel de convocatorias existente para esa fecha, hasta el rediseño de titulares y reservas.
- `team-callups-panel.tsx`: se extrajo el hook `useTeamTournaments`; `TeamCallupsPanel` funciona igual.
- `globals.css`:
  - Tokens nuevos `--ax-*` (los mismos de Figma) en claro y oscuro.
  - Los overrides globales heredados se excluyen del subárbol `.ax-v2` con `:where(:not(.ax-v2 *))`, que no cambia la especificidad para el resto de la app.
- `CLAUDE.md`: comando de pruebas corregido (`node --test tests/*.mjs`), regla de diseño y nota sobre `.next` versionado.

**Verificación**
- `tsc --noEmit` sin errores. `next build` compila. `node --test tests/*.mjs`: 13 de 13.
- Capturas con Playwright en 1440, 834 y 390 px, en oscuro y claro, usando una ruta temporal con datos de ejemplo (borrada antes del commit). Se corrigió el chip cortado por el buscador, el texto de la acción y el plural.
- Interacciones probadas sin errores de consola: menú ⋯, mover de división, quitar, panel de divisiones y añadir jugador.
- No se probó contra Supabase real: en la nube no hay sesión ni `.env.local`. Falta probarlo con una cuenta de equipo.
- ESLint no tiene `eslint.config.*` en el repo (ya pasaba antes), así que no hay lint.

**Pendiente**
- Probar con una cuenta de equipo real: invitaciones, mover y quitar jugadores, divisiones y convocatorias.
- Las invitaciones pendientes solo muestran las que creó la persona actual (política RLS de `affiliation_requests`).
- Rediseño de la pantalla de convocatoria (titulares y reservas) y su cambio en Supabase.

---

## 2026-10-23 · `claude/great-ritchie-2n8uq9` · nube · Estados de la convocatoria en Figma

**Qué se hizo**
- Se diseñaron los estados Enviada (editable antes del cierre), Editando enviada (Reenviar lista y Descartar cambios) y Bloqueada (solo lectura).
- Se crearon 12 frames: escritorio y móvil, en oscuro y en claro.
- Tokens nuevos: `danger-soft` y `danger-line`. Botones nuevos: `Botón/Enviar`, `Botón/Descartar`, `Botón/Editar lista` y `Botón/Edición cerrada`.
- Se documentó en `documentos/rediseno-mi-equipo.md`.

**Verificación**
- Capturas revisadas de los 3 estados en escritorio oscuro, móvil Enviada y Bloqueada en oscuro, y escritorio Bloqueada en claro.

**Pendiente**
- Confirmar con el usuario que la versión enviada sigue vigente mientras se edita.
- Separar titular y reserva en Supabase.
- Implementar en web cuando el usuario apruebe.

---

## 2026-10-22 · `claude/great-ritchie-2n8uq9` · nube · Pantalla de convocatoria en Figma

**Qué se hizo**
- Se diseñó la pantalla que abre "Preparar convocatoria":
  - Plazo con cuenta regresiva (cierre 24 h antes) y selector de división.
  - Plantilla disponible con selector Titular/Reserva por jugador.
  - Lista de la jornada: conteos, aviso, dorsal editable, enviar, borrador y PDF.
- Se crearon 8 frames: escritorio, tablet y móvil, más la hoja "Revisar lista" en móvil, en oscuro y en claro.
- Componentes nuevos: `Asignación/*`, `Fila/Convocable`, `Fila/Convocable móvil`, `Fila/Convocado`, `Botón/Enviar deshabilitado`, `Botón/Guardar`, `Botón/Descargar` y `Botón/Primario texto`.
- En Mi equipo se ajustaron las cifras de ejemplo (Primera división 26, Segunda 18) para que encajen con una lista de rugby de 15 titulares y 8 reservas.

**Verificación**
- Capturas revisadas: escritorio oscuro y claro, tablet oscuro, móvil oscuro y la hoja en claro. Se corrigió el fondo oscuro de la hoja en modo claro.

**Pendiente**
- Separar titular y reserva en Supabase (ver `documentos/rediseno-mi-equipo.md`).
- Implementar en web cuando el usuario apruebe.

---

## 2026-10-22 · `claude/great-ritchie-2n8uq9` · nube · Convocatorias por fecha

**Qué se hizo**
- A pedido del usuario, las convocatorias pasan a agruparse por fecha (jornada) y no por enfrentamiento.
- Nuevo componente `Jornada` en Figma: día, "Fecha N", torneo, hora de cierre, estado por división, progreso y acción.
- Reemplazó al componente `Partido` en las 6 pantallas; `Partido` se eliminó.
- Se actualizó `documentos/rediseno-mi-equipo.md`.

**Verificación**
- Capturas de escritorio oscuro y móvil claro revisadas.

**Pendiente**
- Lo mismo que en la entrada anterior: implementar en web cuando el usuario apruebe.

---

## 2026-10-22 · `claude/great-ritchie-2n8uq9` · nube · Rediseño "Mi equipo" en Figma

**Qué se hizo**
- Se analizó la sección Mi equipo de la cuenta de equipo: `app/(panel)/equipo/page.tsx`, `Components/team-roster-panel.tsx`, `team-division-settings.tsx` y `team-callups-panel.tsx`.
- Decisiones con el usuario: se mantiene la identidad visual y la sección pasa a ser una sola vista de resumen.
- En Figma (página `Claude`, `954:56`):
  - Colección de variables `AthlonX` con modos Oscuro y Claro.
  - Componentes locales: botones, insignias, avatar, segmentos, buscador, filas de jugador (escritorio y móvil), fila de persona, partido, menú de acciones y logo.
  - 6 pantallas: escritorio, tablet y móvil, en oscuro y en claro.
  - Tablero de estados: hover y menú ⋯, división vacía y carga.
- Las decisiones y la especificación para implementar quedaron en `documentos/rediseno-mi-equipo.md`.

**Verificación**
- Capturas de Figma revisadas para las 6 pantallas y el tablero de estados. Se corrigió la insignia recortada en móvil y el contraste del bloque de fecha en modo claro.

**Pendiente**
- Implementar el diseño en la web, a la espera de que el usuario apruebe el diseño de Figma.
- Los datos de las pantallas son de ejemplo.

---

## 2026-10-22 · `claude/great-ritchie-2n8uq9` · nube

**Qué se hizo**
- Se instalaron las skills de diseño en `.claude/skills/`:
  - Emil Kowalski ([emilkowalski/skills](https://github.com/emilkowalski/skills)): las 11 skills web. Se omitieron las de Swift, Expo, móvil nativo y Sonner.
  - Impeccable ([pbakaus/impeccable](https://github.com/pbakaus/impeccable)): la skill y 4 subagentes en `.claude/agents/`.
  - Taste ([Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)): `design-taste-frontend`.
- Se activaron los hooks de Impeccable en `.claude/settings.json`: SessionStart, PostToolUse en Edit/Write y Stop.
- Se agregó el MCP de Playwright en `.mcp.json` (`@playwright/mcp@0.0.83`, headless, con el Chromium de `/opt/pw-browsers`).
- Se crearon `CLAUDE.md` y esta bitácora.
- Se verificó el acceso a Figma: lectura y escritura en el archivo `AthlonX` (fileKey `YBGPZrYsYNb5259mmBgoF1`). La página `Claude` (`954:56`) está vacía.

**Verificación**
- El hook de Impeccable se ejecutó sobre `app/(panel)/layout.tsx` y no reportó problemas automáticos.
- Chromium headless generó una captura. Las herramientas del MCP de Playwright se cargan en la sesión.
- En Figma se creó un rectángulo de prueba en la página `Claude` y se eliminó en la misma llamada.

**Pendiente**
- En local hay que configurar el override de Playwright (ver `CLAUDE.md` → "Playwright en local").
