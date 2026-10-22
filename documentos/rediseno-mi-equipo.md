# Rediseño de "Mi equipo" (cuenta de equipo)

Figma: archivo `AthlonX`, página **Claude** (`954:56`).
https://www.figma.com/design/YBGPZrYsYNb5259mmBgoF1/AthlonX?node-id=954-56

Pantallas: `Mi equipo · {Escritorio 1440 | Tablet 834 | Móvil 390} · {Oscuro | Claro}`.
Además hay un tablero de componentes (`Componentes · Mi equipo`) y otro de estados (`Estados · Mi equipo · Oscuro/Claro`).

La identidad visual se mantiene: azul marino, verde lima, Bebas Neue en los títulos, Inter en la interfaz y Barlow Condensed en la navegación.

## Problemas de la versión actual

1. La misma persona aparece en dos bloques: **Miembros del equipo** y **Jugadores y cuerpo técnico**. Cada bloque tiene su propio botón "Añadir" con un flujo distinto.
2. Para añadir jugadores hay que activar antes un modo "Editar" global. La acción está escondida.
3. Las tarjetas de miembro miden unos 200 px de alto y solo muestran nombre, rol y "Editar". La información no es compacta.
4. "Editar" en el cuerpo técnico manda a otra sección de la misma página.
5. Hay etiquetas en mayúsculas encima de cada título ("PANEL DE EQUIPO", "IDENTIDAD DEPORTIVA", etc.) que no aportan información.
6. "Ubicación pendiente" es un texto muerto: no lleva a ninguna acción.
7. Los chips de división tienen fondo gris claro fijo (`#e8e8e8`), que no respeta el tema.

## Estructura nueva (una sola vista de resumen)

1. **Cabecera del equipo**
   - Escudo, nombre y una línea de datos: disciplina, el enlace **Añadir ubicación** y la insignia "Perfil activo".
   - Acciones: **Editar perfil** (secundaria) e **Invitar persona** (la única acción primaria de la pantalla).
   - Se quitó "Buscar perfiles", porque la búsqueda ya está en el menú lateral.
2. **Plantilla** (bloque principal)
   - Chips de división con su conteo; la división activa va en verde lima.
   - Buscador "Buscar por nombre o dorsal".
   - Botones **Divisiones** (gestionar) y **Añadir jugador**, siempre visibles, sin modo edición.
   - Tabla compacta con #, Jugador (avatar, nombre, @usuario), Posición, Estado (Activo / Invitación pendiente) y menú ⋯.
   - Pie: "Mostrando N de M" y "Ver todos".
3. **Cuerpo técnico y directiva**: una lista agrupada (Cuerpo técnico / Directiva). Si una persona tiene varios roles, se muestran en un solo chip (por ejemplo, "Presidente · Jugador").
4. **Convocatorias**: los próximos partidos con fecha, rival, torneo, hora y división.
   - Estado "Sin convocar", con la acción **Convocar**.
   - Estado "Convocatoria lista", con la acción **Revisar**.

El menú ⋯ de cada persona tiene: Ver perfil, Editar rol y cargo, Mover a otra división y Quitar del equipo. La opción de quitar va al final, separada y en rojo, con confirmación inline (sin `window.confirm`).

## Responsive

| Ancho | Layout |
|---|---|
| ≥1280 (escritorio) | Menú lateral de 256 px; dos columnas: Plantilla (fluida) y columna lateral de 360 px (Cuerpo técnico + Convocatorias). |
| 768–1279 (tablet) | Barra superior con botón de menú; Plantilla a todo el ancho; debajo, Cuerpo técnico y Convocatorias en dos columnas. |
| <768 (móvil) | Una columna. Botones de cabecera al 50 % cada uno. Chips de división con scroll horizontal. Las filas de jugador muestran la posición y el estado bajo el nombre. Añadir y ⋯ quedan como botones de icono de 40 px. |

## Tokens

Los colores son variables de Figma (colección `AthlonX`, modos **Oscuro** y **Claro**). Los valores salen de `app/globals.css`, y se agregaron estos tokens: `surface-sunken`, `line-strong`, `text-secondary`, `accent-soft`, `accent-line`, `warning-text`, `warning-soft`, `danger-text` y `hover`. Al implementar, conviene añadirlos como `--ax-*` en `.athlonx-dashboard`, en lugar de seguir usando hex sueltos y los overrides por selector de atributo del tema claro.

## Pendiente para implementar en web

- Componentes nuevos o refactorizados en `Components/`, sustituyendo los bloques actuales de `app/(panel)/equipo/page.tsx`: `team-roster-panel.tsx`, `team-division-settings.tsx` y `team-callups-panel.tsx`.
- Los datos de las pantallas de Figma son de ejemplo (nombres, dorsales, posiciones, partidos). Hay que revisar que el RPC `get_team_members_for_manager` y `team_players` entreguen dorsal y posición para la tabla.
- Verificar con Playwright en 1440, 834 y 390 px, en tema claro y oscuro.
