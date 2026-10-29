# Bitácora AthlonX

Registro de trabajo, en nube y en local. La entrada más reciente va arriba.
Formato: fecha · rama · entorno → qué se hizo · archivos · verificación · pendiente.

---

## 2026-10-29 · `edwin` · nube → Fijar error TypeScript en tipo ScheduleDate

- El commit bbb3116 agregó soporte para cuartos de final pero no incluyó 'quarterfinal' en el tipo `ScheduleDate`.
- Fix: actualizar tipo `ScheduleDate` para incluir `'quarterfinal'` en valores válidos de `stage`.
- Build local y cloud ahora pasan exitosamente.

**Archivos**: `Components/torneo/league-generator.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK.

**Pendiente**: Revisión visual en navegador (ver llave con 8 equipos, generar cuartos, verificar actualización automática). Script SQL de resultados para prueba.

---

## 2026-10-29 · `edwin` · nube → Cuartos de final (8 equipos) con actualización automática

- Implementado sistema de 8 equipos: cuartos (1.º vs 8.º, 2.º vs 7.º, 3.º vs 6.º, 4.º vs 5.º), semifinales desde ganadores de cuartos, final desde ganadores de semis.
- El generador permite seleccionar 8 equipos para fase final y genera automáticamente cuartos, semis y final en botones secuenciales.
- La llave renderiza 5 columnas con 8 equipos: clasificados, cuartos, semifinales, final y campeón. Se actualiza automáticamente cuando se registra un resultado.
- Cambios en `standings.tsx`: agregado cálculo de cuartos y lógica de actualización de semis desde ganadores de cuartos.

**Archivos**: `Components/torneo/league-generator.tsx`, `Components/torneo/standings.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK. Revisión en navegador: pendiente (ver llave con 8 equipos, generar cuartos, verificar actualización automática de semifinales al terminar cuartos).

**Pendiente**: Script SQL de resultados de cuartos, semifinales y final para torneo de prueba (opcional, usuario a confirmar).

---

## 2026-10-28 · `edwin` · nube → Llave con resultados y campeón

- La llave lee los partidos de semifinal y final de cada división: muestra marcadores, resalta al ganador de cada semifinal y de la final, y muestra el campeón cuando la final termina.
- La página pasa a la tabla los partidos de fase final (`playoffMatches`, con su fase).
- Pendiente: la pestaña Generador muestra "Generar desde cuartos" según el usuario; no hay texto de cuartos en la ruta de liga. Falta captura para revisarlo.

**Archivos**: `Components/torneo/standings.tsx`, `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK. Revisión en navegador: pendiente.

---

## 2026-10-26 · `edwin` · nube → Llave de fase final debajo de la tabla (aprobada en Figma `1143:18230`)

- La llave pasa debajo de la tabla de posiciones, en 4 columnas: clasificados, semifinales, final y campeón. Con zona de 2 no hay semifinales.
- Antes de terminar la liga, los nombres de la tabla se muestran como provisionales y los campeones como "Por definir". Al terminar, la llave usa la tabla final.
- Se muestra en cualquier división con zona de clasificación, aunque la liga no haya empezado.

**Archivos**: `Components/torneo/standings.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK. Revisión en navegador: pendiente.

---

## 2026-10-26 · `edwin` · nube → Llave no aparecía con 4 equipos y 4 clasificados

- Causa: la condición de la llave usaba la zona de clasificación solo si era menor que el número de equipos. Con 4 equipos y 4 clasificados, la llave no aparecía (caso de Segunda división).
- Fix: la llave usa la zona configurada directamente.
- Propuesta de diseño en Figma (frame `1143:18230`, página `REDISEÑO`): llave debajo de la tabla con clasificados, semifinales, final y campeón, con lugares "Por definir" antes de jugar. Pendiente aprobación; el cambio de ubicación (debajo de la tabla) no está implementado.

**Archivos**: `Components/torneo/standings.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK.

---

## 2026-10-26 · `edwin` · nube → Resultados de la fase de liga del torneo rápido

- Nuevo `supabase/seed-liga-rugby-rapido-resultados.sql`: resultados solo de la fase `league` del torneo rápido (tries, conversiones, tarjetas, conmociones, lesiones). Semifinales y final quedan pendientes. No ejecutado en Supabase.

**Archivos**: `supabase/seed-liga-rugby-rapido-resultados.sql` (nuevo).

---

## 2026-10-26 · `edwin` · nube → Llave de fase final en Tablas

- En Tablas, encima de la tabla de posiciones, aparece la llave de la fase final de la división seleccionada solo cuando todos sus partidos de liga están finalizados. Con 4 clasificados: 1.º vs 4.º y 2.º vs 3.º (título "Semifinales"); con 2: 1.º vs 2.º (título "Final").
- Se quitó el card lateral "Camino a semifinales", que mostraba la llave antes de terminar la liga.

**Archivos**: `Components/torneo/standings.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK. Revisión en navegador: pendiente.

---

## 2026-10-26 · `edwin` · nube → Script de torneo rápido Liga + Fase final

- Nuevo `supabase/seed-liga-rugby-rapido-fase-final.sql`: torneo rápido (`is_quick`), publicado, formato `league_playoffs`, 1 vuelta, 4 clasificados por división, 1 cancha. Divisiones: Primera (5 equipos), Segunda (4) y Femenina (5). 14 equipos registrados con invitación aceptada y 12 jugadores por equipo. No genera fixtures.
- No ejecutado en Supabase.

**Archivos**: `supabase/seed-liga-rugby-rapido-fase-final.sql` (nuevo).

---

## 2026-10-26 · `edwin` · nube → Ganadores por división en el Resumen

- Al finalizar el torneo (`status = 'finished'`), el Resumen muestra "Ganadores por división": el primer lugar de la tabla de cada división, con puntos, G/E/P.
- Para reutilizar la misma lógica de la tabla, el cálculo de posiciones se extrajo a `calculateDivisionRows` (función pura en `Components/torneo/standings.tsx`). `StandingsSection` la usa igual que antes.
- Nuevo componente `DivisionWinners`: carga puntos, desempates y ajustes del torneo, y no se muestra si el torneo no está finalizado ni si no hay equipos.

**Archivos**: `Components/torneo/standings.tsx`, `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK. Revisión en navegador con el torneo de prueba al finalizar: pendiente.

---

## 2026-10-26 · `edwin` · nube → Agregar enfrentamiento solo al editar

- En Fixtures, el banner "Nuevo enfrentamiento" (con el botón "Añadir enfrentamiento") solo aparece cuando la fecha está en modo edición. Al cancelar la edición se cierra también el formulario de agregar.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK. Revisión en navegador: pendiente.

---

## 2026-10-25 · `edwin` · nube → Penal retirado de rugby y resultados de prueba

- Quitado el botón "Penal" de la gestión de partidos de rugby (`app/(panel)/torneos/ver/[id]/page.tsx` y `app/(panel)/torneos/[torneo]/page.tsx`) y la estadística "Penales" (también en la página `[torneo]`). Sin cambios de base: la restricción de `match_events` sigue aceptando `penalty`.
- Nuevo `supabase/seed-liga-rugby-sevens-resultados.sql`: resultados de los partidos pendientes con tries, conversiones, amarillas, rojas, conmociones y lesiones. No ejecutado en Supabase.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`, `app/(panel)/torneos/[torneo]/page.tsx`, `supabase/seed-liga-rugby-sevens-resultados.sql` (nuevo).

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK.

---

## 2026-10-25 · `edwin` · nube → Script completo de la liga de prueba (torneo + equipos + jugadores)

- Nuevo `supabase/seed-liga-rugby-sevens-prueba-completa.sql`: une torneo, divisiones, equipos aceptados y jugadores en un solo bloque. Dueño: UID de Edwin (`ede6717e-…`). Ciudad en `location` (la tabla no tiene `city`).
- Reemplaza a los dos scripts anteriores para una sola ejecución. No ejecutado en Supabase.

**Archivos**: `supabase/seed-liga-rugby-sevens-prueba-completa.sql` (nuevo).

---

## 2026-10-25 · `edwin` · nube → Script de jugadores de la liga de prueba

- Nuevo `supabase/seed-liga-rugby-sevens-prueba-jugadores.sql`: 12 jugadores por equipo de prueba (`handle` `prueba-rugby-%`), dorsales 1-12, posiciones de rugby seven, 5 suplentes. Idempotente por equipo.
- Depende de `seed-liga-rugby-sevens-prueba.sql`. No ejecutado en Supabase.

**Archivos**: `supabase/seed-liga-rugby-sevens-prueba-jugadores.sql` (nuevo).

---

## 2026-10-25 · `edwin` · nube → Script de liga de prueba (Rugby Sevens)

- Nuevo `supabase/seed-liga-rugby-sevens-prueba.sql`: torneo oficial publicado, Rugby Sevens, todos contra todos a 4 vueltas, 1 cancha, fecha de hoy, Panamá. Tres divisiones con 4 equipos ficticios cada una, con invitación ya aceptada. Puntos 4/2/0.
- El script NO genera fixtures ni jugadores; se generan desde la app.
- Requiere reemplazar `OWNER_USER_ID` por el id de Supabase Auth del dueño. Es idempotente por slug.
- NO ejecutado en Supabase. Pendiente de confirmación de Edwin.

**Archivos**: `supabase/seed-liga-rugby-sevens-prueba.sql` (nuevo).

---

## 2026-10-25 · `edwin` · nube → Motivo mínimo en ajustes de puntos

- Error: `tournament_standing_adjustments_reason_check` al guardar un ajuste con motivo de 1-2 caracteres. La base exige al menos 3 caracteres.
- Fix: el formulario de ajuste de puntos valida el largo antes de guardar y muestra un aviso.

**Archivos**: `Components/torneo/standings.tsx`.

**Verificación**: `npx tsc --noEmit` y `npm run build`: OK. Prueba en navegador: pendiente.

---

## 2026-10-25 · `edwin` · nube → Migración de puntos aplicada

- Aplicada por Edwin en el SQL Editor de Supabase, proyecto `mlvtsgseneqzihwkiatg` (main): `supabase/tournament-points-rules-migration.sql`. Verificado con consulta de solo lectura: existen `points_for_win`, `points_for_draw` y `points_for_loss`.
- Fix: al guardar puntos, si el torneo aún no tiene fila en `tournament_competition_settings` se inserta con `competition_format: 'round_robin'` (columna obligatoria); si existe, solo se actualizan los puntos. Antes fallaba con `null value in column "competition_format"`.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**
- `npx tsc --noEmit`: OK. `npm run build`: OK.
- Guardado de puntos en navegador: pendiente de revisar.

---

## 2026-10-25 · `edwin` · nube → Advertencia al cambiar puntos

- La sección de reglas muestra una advertencia cuando los puntos cambian: al guardar, la tabla de posiciones de todas las divisiones se recalcula.
- Error observado al guardar: `Could not find the 'points_for_draw' column`. Causa: la migración `supabase/tournament-points-rules-migration.sql` no está aplicada en Supabase. Requiere confirmación antes de ejecutarla en el proyecto real.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`.

---

## 2026-10-25 · `edwin` · nube → Puntos por resultado configurables por torneo

**Qué se hizo**
- Victoria, empate y derrota ahora son valores de cada torneo, no constantes de la disciplina.
- Migración nueva `supabase/tournament-points-rules-migration.sql`: agrega `points_for_win`, `points_for_draw` y `points_for_loss` a `tournament_competition_settings` (enteros >= 0, nulos por defecto).
- Página: lee las tres columnas y, si están vacías, usa 4/2/0 (3/1/0 en fútbol, disciplina `futbol`).
- Formulario de edición: sección "Reglas" con tres campos numéricos. Los cambios pasan por el mismo diálogo de contraseña; al confirmar se guardan con upsert en `tournament_competition_settings`.
- Tabla de posiciones (`Components/torneo/standings.tsx`): calcula los puntos con los valores del torneo y los muestra en la leyenda.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`, `Components/torneo/standings.tsx`, `supabase/tournament-points-rules-migration.sql` (nueva).

**Verificación**
- `npx tsc --noEmit`: OK. `npm run build`: OK.
- La migración NO está aplicada en Supabase. Mientras no se aplique, la consulta de configuración de la página falla (las columnas no existen) y la tabla usa los valores por defecto.

**Pendiente**
- Aplicar la migración en el proyecto `mlvtsgseneqzihwkiatg`.
- "Bonus ofensivo" del diseño de Figma no tiene modelo ni cálculo; no se implementó.
- "Clasifican a semis" del diseño sigue en la configuración del generador (`qualifying_teams_per_group`); no se duplicó aquí.
- Verificación visual en navegador: pendiente.

---

## 2026-10-25 · `edwin` · nube → Estado del torneo: borrador / publicado manual, resto automático

**Qué se hizo**
- Formulario de edición: el selector de Estado solo ofrece Borrador y Publicado. "En curso" y "Finalizado" se muestran como texto ("se actualiza solo") cuando el torneo ya está en ese estado.
- Figma (frame `1055:17159`): el valor del selector pasa de "En curso" a "Publicado".
- Migración nueva `supabase/tournament-status-automation-migration.sql`: el trigger `start_tournament_on_first_match_trigger` pasa el torneo a `in_progress` cuando un partido pasa a `live`. Solo cambia torneos en `published`; un borrador no cambia.
- "Finalizado" ya se automatiza en ligas con `liga-finalizar-automatico-migration.sql` (cierra al terminar la última final o todos los partidos de todos contra todos).

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`, `supabase/tournament-status-automation-migration.sql` (nueva).

**Verificación**
- `npx tsc --noEmit`: OK. `npm run build`: OK.
- La migración NO se ha ejecutado en Supabase. Hay que aplicarla a mano en el proyecto `mlvtsgseneqzihwkiatg` después de confirmación.

**Pendiente**
- Aplicar la migración del trigger de inicio.
- "Finalizado" para torneos de eliminación directa (knockout) y fútbol 8 no está cubierto por un trigger nuevo; solo ligas.

---

## 2026-10-25 · `edwin` · nube → Edición de Información según Figma (modo edición)

**Qué se hizo**
- `EditTournamentForm` (`app/(panel)/torneos/ver/[id]/page.tsx`) reescrito con la estructura del frame `Torneo · Compartido · Información general · Edición` (nodo `1055:17159`):
  - Subnavegación lateral con anclas a cada sección.
  - Secciones en tarjetas: Imagen del torneo, Datos generales, Reglas de la disciplina y Divisiones participantes.
  - Barra de guardado al final (sticky) con Descartar y Guardar cambios. Guardar sigue usando el flujo existente de confirmación con contraseña.
- Campos editables: nombre, temporada, estado, fecha de inicio, país y ciudad. Divisiones se agregan y quitan igual que antes.
- Solo lectura, como indica Figma o por el modelo de datos: disciplina y modalidad (no se puede cambiar), tipo (oficial o rápido) y fecha de cierre (se registra sola).
- Puntaje (victoria, empate, derrota) en modo lectura. Los valores (4/2/0 en rugby, 3/1/0 en fútbol) están fijos en `Components/torneo/standings.tsx` y se repiten aquí. Si cambian, hay que actualizar los dos lugares.
- Duración de tiempo y descanso no aparecen en esta sección; viven en el generador de fixtures.

**No implementado (faltan datos o funciones)**
- Imagen: la carga de imágenes no está conectada. Se muestra la imagen actual como texto.
- Visibilidad y Zona de riesgo: no hay campos para eso en el modelo; no se agregaron.
- Contraseña en línea: Figma la pone en la barra; se mantiene el diálogo de confirmación existente.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- Verificación visual en navegador: pendiente.

---

## 2026-10-25 · `edwin` · nube → Información del torneo según Figma

**Qué se hizo**
- Aplicado en código el diseño de Información (Figma `1130:18187`, página `REDISEÑO`), con dos cambios pedidos: sin duración de tiempo ni descanso (viven en el generador de fixtures) y sin el tile duplicado "Organiza".
- `GeneralInfoSection` en `app/(panel)/torneos/ver/[id]/page.tsx`: vista de solo lectura con tokens `--ax-*` en `.ax-v2`:
  - Datos del torneo (nombre, código, estado, temporada, organización, disciplina, modalidad, ubicación, fechas, equipo organizador).
  - Canchas y competencia (canchas, intervalo, formato, vueltas, clasificados a playoffs).
  - Cupos (equipos máximos, jugadores por plantilla, en cancha).
  - Divisiones participantes.
- Los datos salen de los estados que ya carga la página (`leagueSettings`, `maxTeamsLimit`, `maxRosterLimit`, `modalityRule`). Nada es editable aquí: la edición sigue en "Editar torneo" y en el generador, así no hay campos duplicados.
- `EditTournamentForm` sin cambios; se muestra en modo edición como antes.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- Verificación visual en navegador: pendiente.

**Pendiente**
- Revisar en navegador (escritorio y móvil, claro y oscuro) con un torneo real.
- El intervalo entre partidos también existe en el generador; se muestra como lectura y no se edita aquí. Si se quiere quitar de la vista, se elimina el tile.

---

## 2026-10-25 · `edwin` · nube → Equipos del torneo oficial según Figma

**Qué se hizo**
- Aplicado en código el diseño `Torneo · Rugby · Oficial · Equipos · Escritorio · Oscuro` (nodo `1043:15354`, página `REDISEÑO`).
- `Components/torneo/teams-section.tsx` (`TournamentTeamsSection`):
  - Barra de herramientas: buscador (filtra equipos y jugadores), chips de división (Todas / una por división), contador de equipos y botón "Invitar equipo".
  - Panel "Invitar equipos": selector de división, búsqueda de equipos registrados compatibles y botón "Invitar" por equipo.
  - Una tarjeta por división con título en Bebas Neue, conteo y filas de equipo con escudo, código y ciudad, pill "Aceptada" y chevron.
  - Plantilla expandida como tabla (#, Jugador, Posición, Estado). Estado "Activo" o "Sin dorsal" según el dorsal. Debajo sigue el detalle de convocatorias por fecha (`renderTeamDetails`).
  - "Expulsar del torneo" aparece dentro de cada equipo expandido, en lugar del botón global de la barra.
- Props sin cambios: `app/(panel)/torneos/ver/[id]/page.tsx` no se modificó.

**Archivos**: `Components/torneo/teams-section.tsx`.

**Verificación**
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- Verificación visual en navegador: pendiente.

**Pendiente**
- El diseño muestra "Invitación pendiente" en equipos que aún no aceptan. El componente no recibe ese dato, así que todas las filas muestran "Aceptada". Falta cargar las invitaciones pendientes en la página y pasarlas como prop.
- El diseño muestra "12 de 16 cupos"; la página no pasa el límite de equipos al componente oficial, así que se muestra solo el conteo.
- Revisar en navegador (escritorio y móvil, claro y oscuro).

---

## 2026-10-25 · `edwin` · nube → Menú de notificaciones (campana)

**Qué se hizo**
- Implementado en código el menú desplegable de notificaciones aprobado en Figma (nodo `1124:18187`, página `REDISEÑO`).
- `Components/notifications-menu.tsx`: panel con `.ax-v2` y tokens `--ax-*`, radio de 14px, encabezado con botón de cierre, ícono por tipo de notificación (torneo, dorsal, afiliación), hora relativa, punto de no leída, estado "Pendiente" y botones Aceptar / Rechazar, y pie "Ver historial completo".
- La lógica de respuesta (RPC de invitaciones, afiliaciones y dorsales), el conteo de no leídas y el cierre por clic externo no cambian.

**Archivos**: `Components/notifications-menu.tsx`.

**Verificación**
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- Verificación visual en navegador: pendiente (la sesión de Playwright no arranca y el menú requiere sesión con notificaciones reales).

**Pendiente**
- Revisar en navegador (escritorio y móvil, claro y oscuro) con notificaciones reales.
- El diseño de Figma muestra "Aceptada" en notificaciones ya respondidas; el componente no tiene ese estado, así que solo muestra "Pendiente" en las que aún se pueden responder.

---

## 2026-10-25 · `edwin` · nube → Rediseño de Fixtures (editor de fixtures)

**Qué se hizo**
- Implementado en código el diseño de Fixtures aprobado en Figma (nodo `1122:18499`, página `REDISEÑO`).
- `FixtureListSection` en `app/(panel)/torneos/ver/[id]/page.tsx`: render reescrito con tokens `--ax-*` dentro de `.ax-v2`:
  - Chips de fecha (una fecha a la vez) y botones PDF sin/con plantillas para la fecha activa. Reemplazan el menú PDF por fecha.
  - Tarjeta de fecha con título en Bebas Neue, conteo de partidos y acciones Editar / Cancelar / Eliminar fecha / Guardar.
  - Filas de partido en columnas alineadas (hora y cancha, división, local, "vs", visitante). En edición se mantienen los selectores.
  - Banner "Nuevo enfrentamiento" y panel de recesos con el nuevo lenguaje visual.
- Sin cambios de lógica: guardado, recesos, eliminación y PDF usan los mismos manejadores.
- Quitado el estado `pdfMenuDate`, que ya no tiene uso.
- Diseño sin datos de estado: el mockup muestra "Programado" en cada fila, pero el modelo de partido no tiene estado, así que no se muestra.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- Verificación visual en navegador: pendiente. Playwright no arranca en esta sesión (Chromium sin sandbox como root) y la página requiere sesión.

**Pendiente**
- Revisar en navegador (escritorio y móvil, claro y oscuro) con un torneo oficial real.
- Decidir si el estado de cada partido (Programado / Finalizado) debe mostrarse cuando exista en el modelo.

## 2026-10-25 · `edwin` · nube → Reestructurar QuickTournamentTeamsSection para coincidir con diseño Figma

**Qué se hizo**
- Reestructuración completa de `Components/quick-tournament-teams-section.tsx` para que tenga la misma estructura visual que `TournamentTeamsSection`:
  - Cambio de estados: `teamMode` → `showAddExisting`, `showAddNew`, `showRemove` (consistente con TournamentTeamsSection).
  - Encabezado reorganizado: label "TORNEO RÁPIDO · NO OFICIAL", título "EQUIPOS Y PLANTILLAS", descripción.
  - Botones de control: "Invitar equipo" y "Añadir equipo no registrado" con toggles independientes.
  - Secciones de formularios: "Invitar equipos" y "Añadir equipo no registrado" como paneles desplegables.
  - Nueva sección: "Invitaciones pendientes" que muestra equipos con invitaciones en estado pending (con nuevo prop opcional `pendingInvitations`).
  - Tipo de dato nuevo: `PendingInvitation` para gestionar invitaciones pendientes.
  - Mismo sistema de tokens CSS (--ax-*) en toda la sección.
- Estructura visual: coincide con diseño Figma mostrado en imagen 43 (oficial tournament view).

**Archivos**: `Components/quick-tournament-teams-section.tsx` (reestructurado completamente).

**Verificación**
- Build `npm run build`: OK, sin errores TS.
- El componente es backward-compatible: el prop `pendingInvitations` es opcional.

**Pendiente**
- Implementar consulta de invitaciones pendientes en `app/(panel)/torneos/ver/[id]/page.tsx` para pasar el prop `pendingInvitations` al componente.
- Deploy a producción para visualizar los cambios.

---

## 2026-10-25 · `edwin` · nube → Completar redesign de QuickTournamentTeamsSection

**Qué se hizo**
- Edwin señaló que el redesign debe estar disponible para CUALQUIER tipo de torneo, no solo torneos oficiales. El componente `QuickTournamentTeamsSection` (usado en torneos rápidos/temporales) aún tenía colores hardcodeados.
- Actualización completa de `Components/quick-tournament-teams-section.tsx`:
  - Cambio de root wrapper a `.ax-v2 space-y-5` (consistente con `TournamentTeamsSection`).
  - Reemplazo de todos los colores hardcodeados con tokens CSS:
    - `--ax-surface`, `--ax-surface-raised` para fondos.
    - `--ax-line`, `--ax-line-strong` para bordes.
    - `--ax-text`, `--ax-text-secondary`, `--ax-muted` para texto.
    - `--ax-accent` para botones primarios, `--ax-accent-line`, `--ax-accent-text` para interactivos.
    - `--ax-danger-line`, `--ax-danger-text` para botón de expulsión.
    - `--ax-hover` para estados hover.
  - Actualización de radios: `rounded-[14px]` paneles, `rounded-[10px]` botones/campos.
  - Tipografía: títulos Bebas Neue, interfaz Inter con tamaños estandarizados (11px labels uppercase, 13px inputs/buttons, 26px h2).
  - Fixes menores: corregir tag HTML `</article>` → `</div>`, actualizar texto vacío a usar tokens.

**Archivos**: `Components/quick-tournament-teams-section.tsx` (redesign completo).

**Verificación**
- Build `npm run build`: OK, sin errores TS. Turbopack compiló exitosamente en 6.1s.
- Todos los componentes mantienen coherencia visual con TournamentTeamsSection (mismo sistema de tokens).

**Pendiente**
- Commit y push a `edwin` y `main`.
- Posible deploy a Cloudflare para que el redesign sea visible en producción.

---

## 2026-10-25 · `edwin` · nube → Redesign de "Equipos y plantillas"

**Qué se hizo**
- Seguimiento del redesign anterior: Edwin pidió mejorar la sección de equipos y plantillas manteniendo coherencia con el sistema de diseño ya establecido (`.ax-v2`, tokens `--ax-*`).
- Nuevo componente `TournamentTeamsSection` en `Components/torneo/teams-section.tsx`:
  - Exporta función principal que renderiza la sección con tarjetas expandibles de equipos.
  - Componente `TeamCrest` para logo/inicial del equipo.
  - Formulario de búsqueda e invitación de equipos (si `canManage && editMode`).
  - Botones de invitar y expulsar (si `canManage && editMode`).
  - Tarjetas de equipo expandibles con ChevronDown animado; al expandir muestra detalles vía `renderTeamDetails` callback.
  - Uso de componentes reutilizables de UI (`Button`, `Card`, `EmptyState`, `StyledSelect`) para consistencia.
  - Responde a diseño Figma: espaciado, radios (10px botones/campos, 14px paneles), tipografía (Bebas Neue títulos, Inter interfaz).
  - Soporta división compatible y accesorios para búsqueda (normalización de nombres con acentos).
- Integración en `/app/(panel)/torneos/ver/[id]/page.tsx`:
  - Reemplazó la función inline `TeamsSection` con import de `TournamentTeamsSection`.
  - Props mapeados correctamente; se pasa `renderTeamDetails` como callback que renderiza `TeamFixtureCallupDates` (lista de convocados por fecha).
- Corrección de tipos: `TournamentTeam` en el nuevo componente ahora incluye `handle`, `is_official`, `contact_phone` para matching con el tipo global.

**Archivos**: `Components/torneo/teams-section.tsx` (NEW), `app/(panel)/torneos/ver/[id]/page.tsx` (actualizado import y JSX).

**Verificación**
- Build `npm run build`: OK, no errores TS. Turbopack compiló exitosamente.
- Dev server `npm run dev`: levantó sin errores en 388ms.
- Componente sigue patrón `.ax-v2` con tokens de color, accesibilidad (aria-expanded, aria-controls), y responsive (mobile-first).

**Pendiente**
- Prueba visual en navegador (dev server en localhost:3000).
- Testear flujo de añadir/remover equipos y visualizar plantilla expandida.

---

## 2026-10-25 · `edwin` · nube → Historial de ajustes de puntos

**Qué se hizo**
- Edwin pidió un historial de ajustes que muestre todos los cambios realizados, con la posibilidad de ver el motivo de cada uno.
- Nueva tabla `tournament_standing_adjustment_history` que registra cada ajuste individual con timestamp y usuario.
- Migraciones SQL:
  - `tournament-standing-adjustment-history-migration.sql`: crea la tabla con índices y políticas RLS.
  - Actualizada `tournament-standing-adjustments-migration.sql`: la RPC ahora inserta en la tabla de historia después de actualizar el ajuste actual.
- `Components/torneo/standings.tsx`:
  - Nueva carga de `adjustmentHistory` en el effect, ordenada por fecha descendente.
  - Tarjeta "Ajustes de puntos" ahora es clickeable: muestra solo el **último ajuste** de cada equipo y al presionar (o con Enter/Espacio) desplaza al historial.
  - Nueva sección "Historial de ajustes" bajo la tabla, con lista completa de todos los ajustes, equipo, monto, motivo, fecha y hora.
- `Components/mi-equipo/ui.tsx`:
  - Card ahora acepta props: `onClick`, `onKeyDown`, `role`, `tabIndex` para hacerlo interactivo.
- **Corrección de autofill**: campo Motivo cambió de `<input>` a `<textarea>` para evitar que Chrome autocomplete el correo de la cuenta.

**Archivos**: `supabase/tournament-standing-adjustments-migration.sql`, `supabase/tournament-standing-adjustment-history-migration.sql`, `Components/torneo/standings.tsx`, `Components/mi-equipo/ui.tsx`.

**Verificación**
- `tsc --noEmit` y 25 de 25 pruebas pasadas. Build pendiente (local solo genera, no despliega).
- Las migraciones son idempotentes; la tabla history está lista para recibir datos de la RPC.
- Estructura: el último ajuste por equipo se muestra en la tarjeta; el completo en el historial debajo.

**Pendiente**
- Aplicar las migraciones SQL contra el proyecto real en Supabase (requiere confirmación del usuario).

---

## 2026-10-25 · `edwin` · nube → Columna "Ajuste" en la tabla y en el PDF

**Qué se hizo**
- Edwin preguntó dónde se ve el ajuste de puntos. Antes solo aparecía como "Ajuste ±N", en rojo aunque sumara, bajo el nombre del equipo.
- Nueva columna **Ajuste** entre Dif y Pts, que solo aparece si la división tiene ajustes. Muestra +N en verde, −N en rojo y "—" donde no hay ajuste.
- Se agregó la misma columna en los PDF oficial y compacto.
- En las notas, verde o rojo según el signo, y "punto" o "puntos" según la cantidad.
- En móvil el ajuste sigue bajo el nombre, ahora con color según el signo.
- Panel de ajustes:
  - El campo Motivo tiene `autoComplete="off"`.
  - Se agregó un campo de usuario oculto, porque Chrome autocompletaba ahí el correo de la cuenta (en producción quedó un ajuste con el motivo "carversobers@gmail.com").

**Archivos**: `Components/torneo/standings.tsx`, `lib/standings-print.ts`.

**Verificación**
- `tsc`, 25 de 25 pruebas y `build`.
- Capturas con el mock temporal (ya retirado) en claro y en PDF, con un ajuste de +1 y otro de −2.

**Pendiente**
- El ajuste ya guardado con el correo como motivo se corrige volviendo a guardar el ajuste con el motivo correcto.

---

## 2026-10-24 · `edwin` → `main` · nube · Tabla de posiciones y PDF rediseñados en código

**Qué se hizo** (aplica el diseño de Figma de la entrada anterior)
- `Components/torneo/standings.tsx`: nueva `StandingsSection` en `.ax-v2`, que sale de `page.tsx`:
  - Divisiones con conteo de equipos.
  - Tabla de escritorio con columnas #, Equipo, PJ, G, E, P, PF/PC (GF/GC en fútbol), Dif, Pts resaltado y últimos 3 resultados G/E/P.
  - Lista compacta en móvil.
  - Zona de clasificación con barra lima y línea punteada (solo cuando ya hay partidos jugados).
  - Ajustes marcados con *, tarjeta "Ajustes de puntos" y tarjeta "Camino a semifinales / a la final" con la proyección.
  - Sin partidos, el orden es alfabético.
- La zona sale de `zoneSize`:
  - Rugby "Liga + Fase final": 2 o 4 equipos.
  - Rugby "Todos contra todos": sin zona.
  - Fútbol: `qualifying_teams_per_group`.
- "Ajustar puntos" es un panel en línea con −/+ por equipo, total en vivo, motivo y contraseña. Usa la misma RPC `save_tournament_standing_adjustments`.
- "Generar PDF" es un panel en línea:
  - Divisiones: la actual o todas.
  - Diseño: Oficial, Compacto o Para compartir.
  - Incluir: últimos resultados, ajustes y notas, zona de clasificación y próxima fecha.
- `lib/standings-print.ts`:
  - `officialHtml`: A4, una hoja por división, con cabecera de escudo, liga y logo AthlonX, franja oscura y notas.
  - `compactHtml`: todas las divisiones en una hoja.
  - `shareImage`: PNG de 1080×1350 dibujado en canvas, una imagen por división.
  - La ventana de impresión copia los `@font-face` de la app (Inter y Bebas Neue) con URL absolutas.
- Escudo de la liga: `organizations.logo_url` → portada del torneo → `public/upr-escudo.png` (nuevo, recorte del óvalo de `upr.png`). Hoy ninguna organización tiene `logo_url` (consulta de solo lectura).
- Se quitó la `StandingsSection` vieja de `page.tsx` y su menú Todos/Individual.

**Verificación**
- `tsc`, `node --test tests/*.mjs` (25 de 25) y `npm run build`.
- Capturas con el mock temporal (`/*AXMOCK*/`, ya retirado):
  - Escritorio oscuro y claro, móvil, panel de PDF y panel de ajustes.
  - HTML del PDF oficial (con datos y sin partidos, 3 hojas) y del compacto, renderizado desde el mismo origen.
  - PNG para compartir.

**Pendiente**
- Desplegar para verlo en athlonx.world.
- Que las organizaciones puedan subir su logo (`logo_url`) para no depender de `upr-escudo.png`.

---

## 2026-10-24 · `edwin` → `main` · nube · Figma: rediseño de la tabla de posiciones y sus PDF

**Qué se hizo** (solo Figma, página `Claude`; no hay cambios de código)
- Fila "Tabla de posiciones · rediseño" (y=50000):
  - Tabla de rugby en escritorio y móvil, en oscuro y en claro.
  - Columnas: zona de clasificación con barra lima y línea punteada "Clasifican a semifinales", columna PTS resaltada, últimos resultados G/E/P, ajuste administrativo marcado con *, divisiones con conteo de equipos, y tarjetas de ajustes y "Camino a semifinales" con la proyección.
  - Sin pestaña Llaves en rugby.
- Panel en línea "Generar PDF de la tabla" (escritorio y móvil, en oscuro y en claro), que reemplaza el menú Todos/Individual:
  - Divisiones: solo la actual o todas.
  - Diseño: Oficial, Compacto o Para compartir.
  - Interruptores para incluir últimos resultados, ajustes y notas, zona de clasificación y próxima fecha.
- Fila "PDF · Tabla de posiciones" (y=52700):
  - PDF Oficial A4 de una división.
  - PDF Compacto A4 con todas las divisiones.
  - Imagen para compartir de 1080×1350.
  - PDF Oficial sin partidos jugados (tabla inicial).
  - Nota con la regla de qué diseño sale según las opciones.
- Componente `Escudo liga/UPR`, que usa `public/upr.png` recortado al óvalo y se carga como imagen dentro del plugin.

**Verificación**: capturas de cada frame en Figma.

**Pendiente**
- Pasar a código: `StandingsSection` y `printStandings` en `app/(panel)/torneos/ver/[id]/page.tsx`.
- El PDF debe usar el logo de la organización en lugar de `upr.png` fijo.
- Variante de fútbol con GF/GC y puntos 3·1·0.

---

## 2026-10-24 · `edwin` → `main` · nube · Sin aviso en partidos programados

**Qué se hizo**
- Se quitó el aviso "La cronología y las estadísticas aparecen cuando empieza el partido", como pidió Edwin.
- Mientras el partido está programado y sin eventos, solo se ve el marcador. La cronología y las estadísticas siguen ocultas hasta que empieza.

**Archivos**
- `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (25 de 25).

**Pendiente**
- Nada.

---

## 2026-10-24 · `edwin` → `main` · nube · Partido programado sin cronología vacía

**Qué se hizo**
- Edwin preguntó por qué no salía la cronología: el partido estaba programado y la cronología solo muestra lo que pasa durante el juego.
- Mientras el partido está programado y no tiene eventos, ya no se muestran la cronología vacía ni las estadísticas en 0. En su lugar aparece un aviso: "La cronología y las estadísticas aparecen cuando empieza el partido". Al organizador también le dice que toque «Iniciar primer tiempo».

**Archivos**
- `app/(panel)/torneos/ver/[id]/page.tsx` (`MatchHighlight`).

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (25 de 25).

**Pendiente**
- Nada.

---

## 2026-10-24 · `edwin` → `main` · nube · Cancha en cada partido del fixture

**Qué se hizo**
- Se quitó el contenedor "Asignación de canchas" de la pestaña Fixtures, como pidió Edwin.
- Cada partido muestra su cancha al lado de la hora ("08:00 · Cancha 2") cuando el torneo tiene más de una cancha.
- Al editar una fecha, la cancha se cambia en el mismo partido, con un selector junto a la hora. Se guarda igual que antes (`matches.court_number`).
- Se borró el componente `CourtEditor`, que ya no se usaba.

**Archivos**
- `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (25 de 25).
- Sin captura: el número de canchas de la pestaña se lee de Supabase, que no está disponible en este entorno.

**Pendiente**
- Revisar en athlonx.world después de publicar.

---

## 2026-10-24 · `edwin` → `main` · nube · Canchas libres visibles en la vista previa

**Qué se hizo**
- Edwin vio tandas con un solo partido teniendo 2 canchas (08:20 con un partido). No es un error.
  - Con divisiones de 3 equipos y sin partidos seguidos, cada división solo puede jugar en una tanda sí y otra no.
  - Con 3 divisiones y 2 canchas, las tandas alternan entre 2 y 1 partido.
- La vista previa ahora lo explica. Debajo de esas tandas aparece "Cancha 2 libre · los equipos disponibles están descansando". En la última tanda dice "no quedan más partidos en la fecha".

**Archivos**
- `Components/torneo/league-generator.tsx`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (25 de 25).
- Captura con 3 divisiones de 3 equipos y 2 canchas (parche temporal ya quitado).

**Pendiente**
- Nada.

---

## 2026-10-24 · `edwin` → `main` · nube · Fechas personalizadas en el generador

**Qué se hizo**
- "¿Cada cuánto se juega una fecha?" ahora tiene la opción "Personalizado (eliges cada día)". Con ella aparece un selector de día para cada fecha a partir de la segunda, con el calendario de AthlonX.
- Por defecto cada fecha queda una semana después de la anterior.
- Si una fecha cae el mismo día o antes que la anterior, se muestra un aviso.

**Archivos**
- `Components/torneo/league-generator.tsx`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (25 de 25).
- Captura con datos de ejemplo (parche temporal ya quitado).

**Pendiente**
- Nada.

---

## 2026-10-24 · `edwin` → `main` · nube · Sin partidos seguidos con varias canchas y división en la vista previa

**Qué se hizo**
- Con 3 divisiones de 3 equipos y 2 canchas, el generador no lograba ordenar la fecha sin partidos seguidos y obligaba a encender "Permitir partidos seguidos" (A3 jugaba 08:00 y 08:26).
- Ahora `orderDate` arma tandas y, si hace falta para el descanso, deja una cancha libre en una tanda (o la tanda entera, como pausa). Nunca falla. Con la opción apagada nadie juega en tandas seguidas.
- `scheduleBlocks` calcula los horarios por tanda, con tandas incompletas o vacías.
- La vista previa muestra la división de cada partido (al lado en escritorio, debajo en móvil) cuando el torneo tiene más de una.

**Archivos**
- `lib/league.ts`, `tests/league.test.mjs` (prueba nueva del caso 3×3 con 2 canchas).
- `Components/torneo/league-generator.tsx`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (25 de 25).
- Captura con 3 divisiones de 3 equipos, 2 canchas y la opción apagada: A3 juega 08:00 y 08:52, y la cancha 2 queda libre a las 08:26.

**Pendiente**
- Nada.

---

## 2026-10-24 · `edwin` → `main` · nube · Generador: frecuencia de fechas clara y aviso sin equipos

**Qué se hizo**
- "Días entre fechas" (un número) no se entendía. Ahora es "¿Cada cuánto se juega una fecha?", con tres opciones: cada semana, cada 2 semanas y todos los días. Debajo se ven las primeras fechas calculadas, por ejemplo "Fecha 1: sáb, 24 oct · Fecha 2: sáb, 31 oct".
- El día de la primera fecha usa el calendario de AthlonX y el campo de hora tiene `cursor-pointer`.
- Antes el botón decía "Generar 0 fechas" sin explicar por qué. Ahora:
  - Si el torneo tiene menos de 2 equipos, avisa que hay que inscribirlos en Equipos y plantillas.
  - Si la liga ya está toda programada, lo dice.
  - El botón muestra "Nada por generar".

**Archivos**
- `Components/torneo/league-generator.tsx`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (24 de 24).
- Captura con datos de ejemplo (parche temporal ya quitado).

**Pendiente**
- Nada.

---

## 2026-10-24 · `edwin` → `main` · nube · Borrar torneos con fixture generado

**Qué se hizo**
- Borrar un borrador con fixture generado ("Rugby Prueba") fallaba con `violates foreign key constraint "matches_division_id_fkey"`. Los borradores sin partidos sí se borraban.
- Causa: al borrar el torneo se borran en cascada sus divisiones y sus fechas, pero `matches.division_id` no tenía `ON DELETE`, así que la división no se podía borrar mientras tuviera partidos.
- Se cambió a `ON DELETE CASCADE`. Los eventos, correcciones y convocatorias de esos partidos ya se borraban en cascada.

**Archivos**
- `supabase/partidos-division-cascade-migration.sql`: aplicada en `mlvtsgseneqzihwkiatg`.

**Verificación**
- Restricción comprobada después de aplicar.
- Borrado de "Rugby Prueba" en una transacción revertida: se borra sin error. El borrador sigue existiendo para que Edwin lo borre desde la app.

**Pendiente**
- Nada.

---

## 2026-10-24 · `edwin` → `main` · nube · Canchas solo al crear el torneo

**Qué se hizo**
- Se quitó el selector de canchas del generador de fixtures de liga, como pidió Edwin: las canchas se definen al crear el torneo.
- El generador usa el número guardado en `tournament_competition_settings.courts_count` y lo muestra en el subtítulo de "Partidos y horarios".

**Archivos**
- `Components/torneo/league-generator.tsx`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (24 de 24).

**Pendiente**
- Para cambiar las canchas de un torneo de rugby ya creado no hay campo en Información todavía.

---

## 2026-10-24 · `edwin` → `main` · nube · Calendario de AthlonX en torneos, sin fecha final y cierre automático

**Qué se hizo**
- **Fecha de inicio:** usa el selector de fecha propio de AthlonX (`DateField` de Mi perfil) en lugar del calendario del navegador, al crear y al editar un torneo.
  - Todo el campo abre el calendario y tiene `cursor-pointer`.
  - Sin fecha elegida, abre en el mes actual. Antes abría en el mes del límite máximo.
- **Fecha final:** se quitó de los dos formularios. Los torneos nuevos se crean con `end_date` vacío, salvo baloncesto 3x3, que es de un día y usa la fecha de inicio.
  - La cabecera muestra "Desde 24 oct 2026" hasta que el torneo termina.
- **Cierre automático (trigger en `matches`):** el torneo pasa a "Finalizado" y guarda como fecha final el día de esa fecha (o hoy si no tiene día):
  - **Liga + Fase final:** al terminar la final.
  - **Todos contra todos:** al terminar todos los partidos de la liga (cada pareja, una vez por vuelta).

**Archivos**
- `Components/organization-events-panel.tsx`.
- `Components/mi-perfil/ui.tsx`: mes inicial del calendario.
- `app/(panel)/torneos/ver/[id]/page.tsx`: formulario de edición y `formatDateRange`.
- `supabase/liga-finalizar-automatico-migration.sql`: aplicada en `mlvtsgseneqzihwkiatg`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (24 de 24).
- Prueba del trigger en una transacción que se revierte: un partido de liga terminado deja el torneo en `published`; la final terminada lo deja en `finished` con fecha final 2026-11-30.
- Capturas del formulario con el calendario abierto en 1440 px (oscuro) y 390 px (claro), con una página de vista previa temporal que ya se borró.

**Pendiente**
- Fútbol 8 y 3x3 no se cierran solos al terminar su final: tienen sus propias llaves.

---

## 2026-10-24 · `edwin` → `main` · nube · Formatos de liga y generador de fixtures para rugby

**Qué se hizo**
- **Formato de juego en rugby al crear el torneo:**
  - "Todos contra todos" o "Liga + Fase final".
  - Vueltas: 1, ida y vuelta, 3 o 4.
  - Fase final: semifinales (1.º–4.º y 2.º–3.º) y final, o final directa entre los 2 primeros.
  - Canchas: 1 a 3.
- **Generador de liga nuevo** (pestaña Generador):
  - **Automático:** solo se indican los partidos por fecha y el máximo de partidos por equipo en una fecha. Las fechas se crean solas hasta completar la liga, con la misma cantidad de partidos o lo más pareja posible.
  - Cada pareja se enfrenta exactamente una vez por vuelta y, en la segunda vuelta, se invierte la localía. Se descuentan los partidos que ya existen.
  - Dentro de una fecha juegan primero los equipos que menos han jugado.
  - **Manual:** se eligen los enfrentamientos de una fecha. Se valida que una pareja no supere sus partidos de la liga.
  - **Opción "Permitir partidos seguidos"**, en automático y en manual. Si está apagada, nadie juega en dos tandas seguidas; si no se puede, el generador avisa qué cambiar.
  - **Canchas:** 1 a 3, con partidos en paralelo.
  - **Tiempos:** minutos por tiempo, medio tiempo, intervalo, primer partido, primera fecha y días entre fechas.
  - **Recesos:** se agregan con un botón (después de qué partido o tanda y cuántos minutos). Después de un receso el siguiente partido empieza al terminar el receso, sin sumar el intervalo.
  - Vista previa con horarios, canchas y partidos por equipo antes de generar.
  - **Fase final:** botones "Generar semifinales" y "Generar final" según la tabla de la liga. Si una semifinal termina empatada, se elige quién pasa.
  - La tabla de posiciones solo cuenta la liga, no la fase final.
- El fixture se guarda con la barra de cambios y contraseña, y guarda también formato y tiempos en `tournament_competition_settings`.

**Archivos**
- `lib/league.ts` y `tests/league.test.mjs` (8 pruebas nuevas).
- `Components/torneo/league-generator.tsx` (nuevo) y `Components/tournament-fixture-generator.tsx`.
- `Components/organization-events-panel.tsx`.
- `app/(panel)/torneos/ver/[id]/page.tsx`.
- `supabase/formatos-liga-migration.sql`, aplicada en `mlvtsgseneqzihwkiatg`:
  - Formatos `round_robin` y `league_playoffs`.
  - Columna `round_robin_legs`.
  - Hasta 3 canchas, también en el trigger de validación (fútbol sigue con 1 o 2).
  - Se quitó la restricción que fijaba el intervalo en 10 minutos.
  - Columna `fixtures.stage` (`league`, `semifinal` o `final`).
  - Se probó con un insert en un bloque que se revierte.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (24 de 24).
- Capturas del generador (oscuro y claro) con datos de ejemplo: 6 equipos ida y vuelta generan 5 fechas de 5 partidos, con 1 y 2 canchas y partidos seguidos encendidos y apagados.

**Pendiente**
- Probar con una cuenta real: crear un torneo de rugby, generar el fixture y la fase final.
- Formato 3, "Grupos + Copas": todavía no está.
- Las fechas que ya existen en torneos anteriores no se corrigen solas: hay que borrarlas y generarlas de nuevo.

---

## 2026-10-23 · `edwin` → `main` · nube · Una sola cancha y Rugby 15s inactivo

**Qué se hizo**
- Con una sola cancha, los fixtures ya no muestran "Asignación de canchas", ni la columna Cancha en el PDF del fixture, ni las etiquetas de cancha por fecha.
- En los cruces manuales de la llave de fútbol 8 no aparece el selector de cancha y todos los cruces van a la cancha 1.
- Rugby 15s (`xv`) quedó inactivo en Supabase, como pidió Edwin ("por ahora"). No se borró: los formularios solo listan modalidades activas.
  - Antes se comprobó que no hay torneos ni equipos con esa modalidad.

**Archivos**
- `app/(panel)/torneos/ver/[id]/page.tsx`.
- `Components/tournament-knockout-bracket.tsx`.
- `supabase/rugby-xv-desactivar-migration.sql`: aplicada en `mlvtsgseneqzihwkiatg`; queda `xv` con `is_active = false` y `seven` activa.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (16 de 16).
- Consulta después de la migración: `xv` inactiva.

**Pendiente**
- Para volver a habilitar Rugby 15s: `update sport_modalities set is_active = true where code = 'xv'`.

---

## 2026-10-23 · `edwin` → `main` · nube · Gestor de torneos en código (primera parte) y tarjeta amarilla

**Qué se hizo**
- **Rugby:** ya no tiene la pestaña Llaves (se juega por tabla). Si alguien llega a Llaves en rugby, se le manda a Tablas.
- **Generador:** está en todas las disciplinas, con modo automático o manual.
  - En fútbol 8 se fija el modo de la llave existente (`generationMode`).
  - En 3x3, el sorteo o los cruces manuales (`drawMode`).
- **Tarjetas en el partido en vivo:** se registran con un panel inline.
  - Muestra el minuto y la lista de jugadores con dorsal y estado.
  - Explica la regla antes de confirmar.
  - **Rugby:** la amarilla expulsa 2 min en sevens y 10 en XV, con contador "vuelve en" junto al marcador.
  - **Fútbol:** la segunda amarilla registra también la roja.
- **Página del torneo con el rediseño (`.ax-v2`):**
  - Cabecera con banner y foto, datos y pestañas.
  - Barra de guardado inline con contraseña: se quitaron el modal de confirmación, el panel de cambios pendientes y el modal de cambios sin guardar.
  - Resumen, Partidos (marcador, acciones, cronología, estadísticas y lista por fecha), Generador e Historial.
- **Avisos:** los `window.alert`, `confirm` y `prompt` del partido en vivo pasaron a avisos y confirmaciones inline.

**Archivos**
- `app/(panel)/torneos/ver/[id]/page.tsx`.
- `Components/torneo/ui.tsx` (nuevo).
- `Components/tournament-fixture-generator.tsx`, `tournament-knockout-bracket.tsx` y `basketball-tournament-panels.tsx`.
- `lib/rugby.ts` y `lib/football.ts` (nuevos), y `tests/match-cards.test.mjs`.
- `app/globals.css`: tokens de tarjeta.
- `documentos/rediseno-gestor-torneos.md`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (16 de 16).
- Capturas con Playwright en 1440 y 390 px, en tema oscuro y claro, con datos de ejemplo inyectados por un parche temporal que ya se quitó. En este entorno no hay Supabase.
- Se revisaron:
  - Resumen y Partidos.
  - El panel de amarilla en rugby y la segunda amarilla en fútbol.
  - El generador de rugby (automático y manual) y el de fútbol 8 (cruces manuales).

**Pendiente**
- Probar con una cuenta real que las tarjetas se guardan en `match_events`.
- Pasar al rediseño:
  - Tablas, Llaves, Equipos, Convocatorias, Fixtures e Información.
  - Los paneles 3x3.
  - Los PDF.
- Foto y banner: falta la migración de `banner_url`.
- En Figma, quitar Llaves de las pantallas de rugby y agregar el selector de modo del generador.

---

## 2026-10-23 · `edwin` → `main` · nube · Rediseño del gestor de torneos en Figma

**Qué se hizo**
- Diseño completo del gestor de torneos en Figma, página `Claude`, desde y = 33 000. Aún no está en código.
- Hay versiones propias para rugby, fútbol 8 y baloncesto 3x3. Cambian las tablas, la llave, la programación, las acciones en vivo, el reloj y el arte del banner.
- No hay vóleibol en la base de datos; se tomó "voleyball" como baloncesto.
- **Torneo oficial:** equipos solo por invitación y con Convocatorias.
- **Torneo rápido:**
  - Sin Convocatorias.
  - Equipos registrados o temporales.
  - Jugadores invitados con código para reclamar su perfil.
- **Foto y banner:**
  - Aparecen en la cabecera de todas las pantallas y se editan en Información general.
  - Si faltan, se usa el arte de la disciplina y las iniciales.
- **PDF:** 5 PDF en A4 con tema claro (tabla, fixture con plantillas, convocatoria, llave horizontal y reporte de 3x3).
- **Responsive y temas:** pantallas de móvil para cada disciplina y clones en tema claro.
- **Estados:** tablero con sin banner, sin equipos, cargando, error y confirmación.
- **Guardar cambios:** una barra inline reemplaza el modal de contraseña y el panel de cambios pendientes.
- En total son 40 frames. La lista, con ids, está en `documentos/rediseno-gestor-torneos.md`.

**Archivos**
- `documentos/rediseno-gestor-torneos.md`. No se cambió código.

**Verificación**
- Capturas de Figma de cada frame. Se corrigieron:
  - Opacidad del banner, que se perdía al clonar.
  - Espaciadores con alto de 100 px.
  - Cabecera móvil recortada.
  - Textos desbordados.

**Pendiente**
- Que Edwin apruebe el diseño antes de pasarlo a código.
- Al implementarlo, crear la migración del campo del banner (por ejemplo `tournaments.banner_url`) y su almacenamiento. La foto usa `cover_url`, que ya existe.

---

## 2026-10-23 · `edwin` → `main` · nube · Menú de cuenta pasado a código

**Qué se hizo**
- El menú de cuenta de la barra superior sigue el diseño de Figma.
- **Botón que abre el menú:** avatar, nombre de la cuenta activa y su tipo.
  - Antes, en las cuentas de equipo decía el nombre del perfil (por ejemplo "equipo"). Ahora muestra el nombre del equipo.
- **Cabecera del menú:** nombre, tipo, código AthlonX con botón de copiar y correo.
- **Accesos:** Mi perfil, Ver perfil público (según la cuenta) y Configuración.
- **Tema:** la fila con el selector Oscuro/Claro.
- **Cerrar sesión:** se confirma dentro del menú.
- **Mi perfil:** se quitó "Ver perfil público" de la cabecera, como pidió Edwin, porque ya está en el menú. En móvil, "Editar información" ocupa todo el ancho.
- **`/configuracion`:** la página antigua, que ya nada enlazaba, ahora redirige a `/mi-perfil?seccion=configuracion`.

**Archivos**
- `Components/account-menu.tsx` y `Components/dashboard-header.tsx`.
- `Components/mi-perfil/ui.tsx` (Hero) y las tres vistas de Mi perfil.
- `app/(panel)/configuracion/page.tsx`.
- `documentos/rediseno-menu-cuenta.md`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (13 de 13).
- Playwright en 1440 px oscuro y claro y en 390 px:
  - Menú abierto y confirmación de cerrar sesión.
  - El menú se cierra con Escape.
  - Mi perfil se ve sin el botón de perfil público.
- Se corrigió que "Cerrar sesión" no salía en rojo por un choque de clases.
- Sin sesión en la nube, el nombre y el código reales no se pudieron ver: hay que probarlo con cuentas de Persona, Equipo y Organización.

**Pendiente**
- Probar con cuentas reales que el menú muestre el nombre, el código y el enlace al perfil público correctos.
- `Components/team-profile-settings.tsx` y `Components/team-division-settings.tsx` quedaron sin uso: solo los usaba la página antigua de `/configuracion`.

---

## 2026-10-23 · `edwin` → `main` · nube · Rediseño en Figma del menú de cuenta

**Qué se hizo**
- Se diseñó en Figma (página `Claude`, desde y≈31 000) el menú que se abre desde el avatar de la barra superior.
- **Botón que abre el menú:** muestra el nombre de la cuenta activa y su tipo.
- **Cabecera del menú:** avatar, nombre, tipo, código AthlonX con botón de copiar y correo.
- **Accesos:** Mi perfil, Ver perfil público y Configuración.
- **Tema:** una fila con el selector Oscuro/Claro.
- **Cerrar sesión:** separado y en rojo, con la confirmación dentro del menú en vez de una ventana aparte.
- **Frames:** escritorio oscuro y claro (Persona), Equipo con avatar cuadrado, cerrar sesión en oscuro y claro, y móvil.
- **Componentes nuevos:** `Menú cuenta/Ítem` (normal, hover y peligro) y `Cuenta/Disparador` (cerrado y abierto).

**Archivos**
- `documentos/rediseno-menu-cuenta.md`.

**Verificación**
- Capturas de Figma de los frames.
- Se corrigió que la etiqueta "Tema" se partía en dos líneas por falta de espacio.

**Pendiente**
- Pasarlo a código cuando Edwin lo apruebe.
- En el código actual, las cuentas de equipo muestran el nombre del perfil (por ejemplo "equipo") en vez del nombre del equipo: se corrige al implementarlo.

---

## 2026-10-23 · `edwin` → `main` · nube · Teléfonos de cualquier país y eliminación solo para Persona y Equipo

**Qué se hizo**
- **Eliminación de cuentas por tipo**, como pidió Edwin: Persona y Equipo se pueden eliminar; Organización no.
  - `supabase/cuenta-eliminacion-tipos-migration.sql` (aplicada en `mlvtsgseneqzihwkiatg`) hace que `request_account_deletion` rechace las cuentas con `account_type = 'organizacion'` ("Las cuentas de organización no se pueden eliminar.").
  - `purge_expired_account_deletions` omite las organizaciones aunque estén programadas.
  - Se quitó el permiso de ejecutar a `anon`.
  - Al eliminar una cuenta de Equipo, el equipo se conserva sin autor: Edwin no quiere que se borre.
  - En la sección Cuenta de Organización, la tarjeta de eliminar se cambió por una explicación con enlace a Contáctanos.
- **Teléfonos de cualquier país:**
  - Se agregó `libphonenumber-js@1.13.15` y `lib/phone.ts`: 245 países con nombre en español (`Intl.DisplayNames`), código, formato mientras se escribe (`AsYouType`) y validación (`isValidPhoneNumber`).
  - `PhoneField` (`Components/mi-perfil/ui.tsx`):
    - Selector de país con buscador (nombre, código o ISO), bandera y código. Panamá es el país por defecto y aparece primero.
    - El número toma el formato del país.
    - Un número inválido muestra "El número no es válido para el país elegido.".
    - En modo lectura se muestra la bandera junto al número.
  - El formato guardado sigue siendo `+código número`, así que los teléfonos que ya estaban guardados se leen igual.
  - Se quitaron de `lib/mi-perfil.ts` las funciones de teléfono que solo servían para Panamá. `phoneError` ahora viene de `lib/phone.ts`.

**Archivos**
- Nuevos: `lib/phone.ts` y `supabase/cuenta-eliminacion-tipos-migration.sql`.
- Cambiados: `Components/mi-perfil/ui.tsx`, `Components/mi-perfil/organization-profile-view.tsx`, `lib/mi-perfil.ts`, `package.json`, `package-lock.json` y `documentos/rediseno-mi-perfil.md`.

**Verificación**
- Antes de aplicar, una consulta de solo lectura: los tipos en `auth.users` son `persona` (11), `equipo` (5) y `organizacion` (3).
- Prueba en una transacción revertida con un usuario de cada tipo:
  - Organización se rechaza y la purga no la borra aunque se programe a la fuerza.
  - Equipo y Persona se programan y se purgan.
  - Después quedaron 0 usuarios de prueba y 0 cuentas programadas.
- Playwright (1440 px oscuro y 390 px claro):
  - Buscar "esta" muestra Estados Unidos +1.
  - Al elegirlo, `4155552671` se formatea como `(415) 555-2671`.
  - "12" muestra el error de número inválido.
  - La sección Cuenta de Organización ya no tiene el botón de eliminar.
- `tsc`, `npm run build` y `node --test tests/*.mjs` (13 de 13). La ruta temporal de prueba se borró.

**Pendiente**
- Si el país de equipos y organizaciones también debe abrirse a otros países, hay que revisar `supabase/paises-athlonx-migration.sql` (no se aplicó).

---

## 2026-10-23 · `edwin` → `main` · nube · Eliminación de cuentas en Supabase Auth

**Qué se hizo**
- Se aplicaron en el proyecto `mlvtsgseneqzihwkiatg`, en este orden:
  1. `supabase/cuenta-eliminacion-migration.sql`: agrega `profiles.deletion_scheduled_at` y las funciones `request_account_deletion`, `cancel_account_deletion` y `purge_expired_account_deletions`.
  2. `supabase/cuenta-eliminacion-auth-migration.sql` (nueva).
- **Problema que se corrigió:** 36 referencias de `public.*` a `auth.users` no tenían regla de borrado o usaban RESTRICT. Entre ellas, `created_by` de `tournaments`, `teams` y `organizations`, `match_events`, las auditorías y los eventos de calendario. Con eso, borrar de Auth a alguien que creó algo habría fallado.
- La nueva migración las pasa a `ON DELETE SET NULL` y quita el NOT NULL de esas columnas. Se conserva el historial deportivo sin autor. Las 15 que ya borraban en cascada no cambian (perfil, roles, membresías, privacidad, preferencias).
- **Purga automática:** se activó `pg_cron` y el trabajo `athlonx-purge-expired-account-deletions` (cada hora) borra de `auth.users` las cuentas con el plazo de 15 días vencido. El perfil y los datos personales se van en cascada.
- `purge_expired_account_deletions` solo la puede ejecutar `service_role`.
- **Flujo completo:**
  - "Eliminar cuenta" en Mi perfil llama a `request_account_deletion` con la contraseña y programa la eliminación a 15 días.
  - Iniciar sesión antes del plazo llama a `cancel_account_deletion` (`Components/auth-panel.tsx`) y recupera la cuenta.
  - Si nadie inicia sesión, la purga la borra de Auth.

**Archivos**
- `supabase/cuenta-eliminacion-auth-migration.sql` (nuevo).
- `documentos/rediseno-mi-perfil.md`, en el estado de Supabase.

**Verificación**
- Antes de aplicar, consultas de solo lectura:
  - `pgcrypto` está en `extensions`.
  - `pg_cron` estaba disponible pero sin instalar.
  - `profiles.updated_at` existe.
  - Ninguna de las 36 columnas está en una clave primaria ni en un CHECK.
- Después de aplicar:
  - Existen las tres funciones y la columna.
  - Las referencias a `auth.users` quedaron en 15 en cascada y 36 en `SET NULL`.
  - El trabajo de cron está activo.
- Pruebas dentro de transacciones revertidas (no quedó ningún usuario de prueba):
  - Un usuario de prueba, autor de un torneo real y con el plazo vencido, se purgó: se borró de Auth y de `profiles`; el torneo se conservó con autor `null`.
  - `request_account_deletion` con la contraseña incorrecta devuelve "La contraseña no es correcta.". Con la correcta, programa a 15 días, y `cancel_account_deletion` lo deja en `null`.

**Pendiente**
- Decidir qué pasa con los equipos y organizaciones creados por cuentas de Equipo u Organización eliminadas: hoy se conservan sin autor.
- No se aplicó `supabase/paises-athlonx-migration.sql`. Edwin todavía decide si los teléfonos aceptan otros países.

---

## 2026-10-23 · `edwin` → `main` · nube · Mi perfil pasado a código

**Qué se hizo**
- Mi perfil (`/mi-perfil`) pasó al rediseño de Figma para Persona, Equipo y Organización. Las consultas y RPC de Supabase son las mismas.
- Se aplicaron los tres cambios que aprobó Edwin:
  - Barra de cambios fija abajo, que pasa a aviso al salir con cambios, en vez de los modales.
  - La configuración se guarda al momento: privacidad, invitaciones, visibilidad, tema y avisos.
  - La confirmación para eliminar la cuenta es inline y pide la contraseña.
- Cambiar el rol o quitar a un directivo del equipo también se confirma en la fila.
- En móvil y tablet, las secciones se muestran como pestañas.
- En escritorio, la barra lateral muestra "Volver al panel", que respeta los cambios sin guardar, y el título del perfil.
- Los enlaces "Editar perfil" y "Añadir ubicación" de Mi equipo ahora llevan a `/mi-perfil`.
- El gestor de torneos no se tocó.

**Archivos**
- `Components/mi-perfil/ui.tsx`, `persona-profile-view.tsx`, `team-profile-view.tsx`, `organization-profile-view.tsx`, `password-card.tsx` y `delete-account-card.tsx`.
- `Components/settings-nav.tsx` y `Components/dashboard-sidebar.tsx`.
- `app/(panel)/mi-perfil/page.tsx` y `app/(panel)/equipo/page.tsx`.
- Documentación: `documentos/rediseno-mi-perfil.md` (sección "En código") y `CLAUDE.md` (lista de pantallas `.ax-v2`).

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (13 de 13).
- Capturas con Playwright en 1440, 834 y 390 px, en claro y oscuro, de las secciones de las tres cuentas, con una ruta temporal de datos de ejemplo (borrada antes del commit).
- Se probó con clics:
  - Editar y cambiar el nombre: aparece la barra de cambios.
  - "Volver al panel" con cambios: aparece el aviso; "Seguir editando" y luego "Descartar" salen del modo edición.
  - Eliminar cuenta inline.
  - Quitar a un directivo inline.
- Se corrigió que el aviso de salida era semitransparente.
- `/mi-perfil`, `/equipo` y `/busqueda` cargan sin errores de consola.
- Consulta de solo lectura a Supabase (`mlvtsgseneqzihwkiatg`): existen todas las tablas y RPC que usa Mi perfil, salvo `request_account_deletion` y `athlonx_countries`.

**Pendiente**
- Autorizar y aplicar `supabase/cuenta-eliminacion-migration.sql`. Sin ella, eliminar la cuenta falla.
- Decidir si se aplica `supabase/paises-athlonx-migration.sql`: también pasa a Panamá el país de todos los equipos y organizaciones.
- Probar con cuentas reales:
  - Guardar datos personales.
  - Privacidad e invitaciones (se guardan al momento).
  - Visibilidad del equipo y de la organización.
  - Cambio de contraseña y de correo.

---

## 2026-10-23 · `edwin` → `main` · nube · Rediseño en Figma de Mi perfil

**Qué se hizo**
- Se diseñó en Figma (página `Claude`, desde y≈24 000) toda la configuración de Mi perfil para Persona, Equipo y Organización, con el mismo lenguaje de Mi equipo, Búsqueda y Eventos.
- El gestor de torneos queda fuera, como pidió Edwin.
- **Frames de escritorio:**
  - Persona: Información personal (lectura y edición), Equipo y roles, Configuración, Seguridad y Cuenta.
  - Equipo: Información y Roles.
  - Organización: Información, Equipos y roles, y Configuración.
- **Tablet y móvil:** Información personal, edición, Configuración y Cuenta.
- **Tablero de estados:**
  - Salir con cambios sin guardar.
  - Confirmación inline para eliminar la cuenta.
  - Errores de contraseña, guardado y error.
  - Enlace de correo enviado y código copiado.
  - Datos sin registrar, carga y sin permiso de edición.
- Cada frame tiene su versión en claro, en x+8000.
- Componentes nuevos en `Componentes · Mi perfil`: 25 iconos, botones con icono intercambiable, `Dato/Lectura`, `Campo/Texto` (cuatro estados), interruptores, segmentados (privacidad y tema), insignias y elementos del menú de perfil.
- Los iconos antiguos (`Icono/users`, `trophy`, `shield`, `building`, `bell`, etc.) ahora escalan sus vectores al cambiar de tamaño: antes se encimaban con el texto.

**Archivos**
- `documentos/rediseno-mi-perfil.md`: frames, componentes, estructura, secciones por cuenta, cambios de comportamiento propuestos y lo pendiente para el código.

**Verificación**
- Capturas de Figma de cada pantalla en escritorio, tablet, móvil y claro.
- Se corrigió durante la revisión:
  - Los espacios vacíos de las rejillas, que agregaban 100 px.
  - La etiqueta del menú de organización, que se cortaba (ahora dice "Información general").
  - La fila del escudo, que estaba apretada.

**Pendiente**
- Pasarlo a código cuando Edwin lo apruebe.
- Confirmar los cambios de comportamiento propuestos:
  - Barra de cambios en vez de los modales.
  - La configuración se guarda al momento.
  - La confirmación para eliminar la cuenta es inline.

---

## 2026-10-23 · `edwin` → `main` · nube · Búsqueda, Notificaciones y Eventos pasados a código

**Qué se hizo**
- Las tres secciones se pasaron al rediseño de Figma (`.ax-v2` y tokens `--ax-*`). Sirven igual para Persona, Equipo y Organización; el menú lateral no cambió.
- **Búsqueda:**
  - Buscador grande y segmentos por tipo con conteo.
  - Filtros: tarjeta lateral en escritorio, fila de selectores en tablet y botón "Filtros · N" en móvil.
  - Lista compacta con insignia de tipo ("División" para divisiones) y "Cargar más".
  - Estados de antes de buscar y sin resultados (con "Quitar filtros").
- **Notificaciones:**
  - Filtros Todas, Pendientes y No leídas.
  - Grupos Hoy, Esta semana y Anteriores, con icono por tipo e insignia de estado.
  - "Marcar todas como leídas".
- **Eventos:**
  - "Crear evento" abre el panel inline.
  - Buscador, segmentos de estado y selector de disciplina.
  - Borradores con "Continuar" y borrado con confirmación inline (pide la contraseña, como antes).
  - Tarjetas de torneo en 2 columnas y "Ver más torneos".
- El detalle y las decisiones están en `documentos/rediseno-secciones.md` (sección "En código").

**Archivos**
- `Components/mi-equipo/ui.tsx`: `PageHeader`, `IconTile`, `EntityMark` y `Select` con `hideLabel`.
- `app/(panel)/busqueda/page.tsx` y `Components/busqueda/search-results.tsx`.
- `Components/notifications-history.tsx` y `Components/notificaciones/notification-row.tsx`.
- `app/(panel)/eventos/page.tsx`, `Components/eventos/event-cards.tsx` y `Components/organization-events-panel.tsx`.

**Verificación**
- `tsc`, `npm run build` y `node --test tests/*.mjs` (13 de 13).
- Capturas con Playwright en 1440, 834 y 390 px, en oscuro y claro, con una ruta temporal de datos de ejemplo (borrada antes del commit). Se probó el borrado inline (contraseña incorrecta → error en la fila).
- Se corrigió durante la revisión:
  - Títulos de notificación en Bebas por la regla global de `h1`–`h3`.
  - El botón "Continuar" visible en móvil.
  - El placeholder cortado del buscador.
- Las pantallas reales cargan sin errores de consola. No se probó contra Supabase real: en la nube no hay sesión ni `.env.local`.

**Pendiente**
- Probar con cuentas reales:
  - Búsqueda: conteos y filtros.
  - Notificaciones: aceptar, rechazar y marcar todas.
  - Eventos: crear un borrador (debe abrir la configuración del torneo) y eliminarlo.
- La cabecera superior (campana y usuario) y el menú lateral siguen con el estilo anterior en tema claro.

---

## 2026-10-23 · `edwin` → `main` · nube · Rediseño en Figma de Búsqueda, Notificaciones y Eventos

**Qué se hizo**
- Se diseñaron en Figma (página `Claude`, desde y≈15 600) Búsqueda, Notificaciones y Eventos con el mismo lenguaje que Mi equipo, para las tres cuentas (Persona, Equipo, Organización).
- Cada sección tiene escritorio, tablet y móvil, en oscuro (x=0/1540/2474) y en claro (+3200 px, modo Claro de la colección AthlonX y logo claro).
- Frames extra: `Navegación por cuenta` (menú de cada cuenta y selector de cuenta) y `Estados` (estados vacíos y especiales de las tres secciones, como antes de buscar y sin resultados).
- Componentes nuevos en el tablero `962:2`:
  - Iconos: user-plus, trophy, hash, bell, calendar-plus, zap, dumbbell, megaphone, users, building y shield.
  - Botones y enlaces: `Botón/Aceptar`, `Botón/Rechazar`, `Botón/Pequeño`, `Botón/Crear` y `Enlace/Acción`.
  - Campos y marcas: `Campo/Select`, `Campo/Select con etiqueta` y `Marca/Entidad`.
  - Filas y tarjetas: `Fila/Resultado`, `Fila/Resultado entidad`, `Fila/Notificación`, `Fila/Notificación móvil`, `Insignia/Rechazada`, `Tarjeta/Evento` y `Fila/Borrador`.
  - Opciones de evento: `Opción/Evento` (activa, normal y próximamente).

**Archivos**
- `documentos/rediseno-secciones.md`: la especificación por sección, la navegación por cuenta, los datos que usa cada pantalla y lo pendiente para el código.

**Verificación**
- Capturas de Figma de cada frame en escritorio, móvil y claro.
- Se corrigieron filas de notificación apretadas en móvil (componente propio), botones de ancho fijo que se aplastaban, contraste en claro y rellenos.

**Pendiente**
- Pasarlo a código cuando Edwin apruebe el diseño (ver "Pendiente para el código" en `documentos/rediseno-secciones.md`).
- Siguen pendientes: probar el dorsal en athlonx.world/equipo y el estado `reserva` en Supabase para la convocatoria con titulares y reservas.

---

## 2026-10-23 · `edwin` → `main` · nube · Migración del dorsal aplicada en Supabase

**Qué se hizo**
- Se configuró el acceso a Supabase desde la nube:
  - Edwin creó un token personal con alcance a las organizaciones AthlonX, Desarrollador-dkgroup y ndavis@daxis.lat (Database en escritura, el resto en lectura).
  - El token se guardó como secreto de red Bearer del entorno "AthlonX Nube" para `api.supabase.com`.
  - El conector MCP de Supabase solo admite una organización por autorización, por eso se usó la API de gestión.
- Se aplicó `supabase/team-player-details-migration.sql` en el proyecto **AthlonX (`mlvtsgseneqzihwkiatg`)**.
  - Antes se comprobó, con una consulta de solo lectura, que existían `players` (id, shirt_number, position, user_id), `team_players` (team_id, player_id, division_id), `teams` (id, created_by) y `team_user_memberships` (team_id, user_id, role, status), y que la función no existía.
- Se recargó la caché de esquema de PostgREST (`notify pgrst, 'reload schema'`).
- `CLAUDE.md`: se agregó el ref del proyecto y cómo se aplican migraciones desde la nube.

**Verificación**
- `set_team_player_details(uuid, uuid, integer, text)` existe, es `security definer`, la puede ejecutar `authenticated` y no `anon`.
- Una llamada sin sesión responde "No tienes permisos para editar la plantilla del equipo" y no modifica nada.
- No se probó contra la API pública (`mlvtsgseneqzihwkiatg.supabase.co`), porque ese dominio no está permitido en el entorno.

**Pendiente**
- Probar en athlonx.world/equipo con la cuenta del equipo: asignar un dorsal y una posición, y comprobar que rechaza un dorsal repetido en la misma división.

---

## 2026-10-23 · `edwin` → `main` · nube · Menú lateral en móvil no se abría

**Qué pasó**
- En celular, al tocar el botón del menú (☰) no pasaba nada.
- La cabecera del panel (`Components/dashboard-header.tsx`, `relative z-50`) ocupa todo el ancho y quedaba encima del botón (`fixed z-30`) de `Components/dashboard-sidebar.tsx`, así que el toque lo recibía la cabecera. Aunque se abriera, el menú (`z-40`) y el velo (`z-30`) también quedaban debajo de la cabecera.

**Qué se hizo**
- `Components/dashboard-sidebar.tsx`: en móvil, el botón y el velo pasan a `z-[60]` y el menú a `z-[70]`, por encima de la cabecera y de sus menús desplegables (`z-50`).
- En escritorio el menú conserva `lg:z-20`.

**Verificación**
- Playwright a 390 px con toque. Antes: el elemento bajo el botón era el `div` de la cabecera y el menú no se abría. Después:
  - El menú se abre.
  - Se cierra tocando el velo.
  - "Notificaciones" navega a `/notificaciones` y cierra el menú.
- A 1440 px la barra lateral sigue fija y el botón oculto.
- `tsc --noEmit` sin errores y 13 de 13 pruebas.

**Pendiente**
- Nada.

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
