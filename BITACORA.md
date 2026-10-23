# Bitácora AthlonX

Registro de trabajo, en nube y en local. La entrada más reciente va arriba.
Formato: fecha · rama · entorno → qué se hizo · archivos · verificación · pendiente.

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
