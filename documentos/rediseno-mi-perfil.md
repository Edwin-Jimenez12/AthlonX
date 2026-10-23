# Rediseño de Mi perfil

Figma: archivo `AthlonX`, página **Claude** (`954:56`), desde y≈24 000:
https://www.figma.com/design/YBGPZrYsYNb5259mmBgoF1/AthlonX?node-id=954-56

Mismo lenguaje que Mi equipo, Búsqueda, Notificaciones y Eventos: contenedor `.ax-v2`, tokens `--ax-*`, títulos en Bebas Neue, tarjetas de 20 px, botones y campos de 10 px, sin etiquetas en mayúsculas encima de los títulos, y paneles inline en vez de modales. El gestor de torneos (formulario y gestión de rugby, basketball y fútbol) queda fuera de este rediseño.

Código actual: `app/(panel)/mi-perfil/page.tsx` y `Components/mi-perfil/*` (`persona-profile-view`, `team-profile-view`, `organization-profile-view`, `password-card`, `delete-account-card`, `ui`).

## Frames

Oscuro a la izquierda; Claro en +8000 px (modo Claro de la colección AthlonX y logo claro).

| Fila (y) | Frames |
|---|---|
| 24 000 | `Componentes · Mi perfil` (iconos y controles nuevos) |
| 24 600 | Persona · Información personal, Editando y Equipo y roles (escritorio) |
| 25 700 | Persona · Configuración, Seguridad y Cuenta (escritorio) |
| 26 800 | Equipo · Información del equipo y Roles; Organización · Información, Equipos y roles, y Configuración (escritorio) |
| 28 100 | Persona · Información personal en tablet y móvil; Editando, Configuración y Cuenta en móvil |
| 29 500 | `Estados · Mi perfil` |

## Componentes nuevos (tablero `Componentes · Mi perfil`)

- **Iconos:** `Icono/arrow-left`, `user-round`, `sliders`, `shield-check`, `user-cog`, `copy`, `external-link`, `pencil`, `camera`, `lock`, `mail`, `log-out`, `trash`, `check`, `eye`, `chevron-down`, `calendar`, `alert`, `info`, `sun`, `moon`, `globe`, `link`, `map-pin` y `phone`.
- **Botones:** `Perfil/Botón primario`, `secundario`, `fantasma` y `peligro`, cada uno con versión `pequeño`. El icono es una instancia intercambiable.
- **Datos y campos:**
  - `Dato/Lectura` (etiqueta y valor).
  - `Campo/Texto`, en sus estados normal, `activo`, `bloqueado` y `error`.
- **Controles:**
  - `Interruptor/Encendido` y `Apagado`.
  - `Segmentado/Solo yo` y `Público`.
  - `Segmentado/Tema oscuro` y `Tema claro`.
- **Insignias:** `Insignia/Fija` (candado o globo: "Solo tú", "Siempre público") e `Insignia/Rol` (verde suave).
- **Menú:** `Nav/Perfil activo` y `Nav/Perfil` para el menú lateral en modo Mi perfil.

## Estructura de la página

- **Menú lateral (escritorio):**
  - Arriba, "Volver al panel".
  - Una etiqueta con el nombre del perfil (Mi perfil, Perfil del equipo o Perfil de la organización).
  - Las cinco secciones. Es la misma barra de hoy (`settings-nav.tsx`), con otro estilo.
- **Tablet y móvil:** el menú lateral no está, así que las secciones pasan a pestañas (`Segmento`) bajo la cabecera, con desplazamiento horizontal.
- **Cabecera:**
  - Avatar: redondo para personas, cuadrado de 18 px para equipos y organizaciones.
  - El nombre en Bebas Neue.
  - Una fila con la insignia del tipo de cuenta, el código AthlonX con botón de copiar, y los roles o las disciplinas.
  - A la derecha, **Ver perfil público** y **Editar información**. "Editar información" solo aparece en las secciones que se editan.
- **Contenido:** tarjetas a todo el ancho o en dos columnas. En modo lectura, los datos se muestran como texto (`Dato/Lectura`), no como campos deshabilitados.

## Secciones por cuenta

- **Persona:**
  - Información personal: datos personales y foto.
  - Equipo y roles: roles, cargo de staff, equipos, organizaciones y torneos que supervisa.
  - Configuración: privacidad y preferencias.
  - Seguridad: contraseña y correo.
  - Cuenta: datos de la cuenta, sesión y zona de riesgo.
- **Equipo:**
  - Información del equipo: identidad (8 datos en 4 columnas), descripción, escudo y divisiones (con enlace a Mi equipo).
  - Roles: directivos y organización.
  - Configuración: visibilidad y preferencias.
  - Seguridad y Cuenta, igual que en Persona.
- **Organización:**
  - Información general: identidad con logotipo, descripción, disciplinas, contacto y redes.
  - Equipos y roles: equipos afiliados y directivos.
  - Configuración: visibilidad, preferencias y torneos (con enlace a Eventos).
  - Seguridad y Cuenta, igual que en Persona.

## Cambios de comportamiento propuestos

- **Guardar:** al editar aparece una **barra de cambios** fija abajo, con "Descartar" y "Guardar cambios". Reemplaza al modal "¿Guardar cambios?".
- **Salir con cambios:** si la persona intenta salir con cambios sin guardar, la barra se vuelve aviso con "Seguir editando", "Descartar" y "Guardar y salir". Reemplaza al modal de "Cambios sin guardar".
- **Configuración:** la privacidad, el tema, las invitaciones y los avisos **se guardan al momento**, sin pulsar Editar. Hoy la privacidad y las invitaciones solo cambian en modo edición.
- **Eliminar cuenta:** la confirmación es inline dentro de la Zona de riesgo y pide la contraseña.
- **Errores y confirmaciones:**
  - Los errores de un campo se muestran debajo del campo (`Campo/Texto error`).
  - Al guardar, la confirmación aparece como aviso verde arriba de la sección.
- **Datos vacíos:** se muestran como "Sin registrar" atenuado, con "Completar datos".

## En código (2026-10-23)

Aprobado por Edwin: barra de cambios en vez de los modales, configuración que se guarda al momento y confirmación inline para eliminar la cuenta.

- **`Components/mi-perfil/ui.tsx`:** reescrito sobre `.ax-v2` y las piezas de `Components/mi-equipo/ui.tsx`.
  - `Shell` tiene pestañas en tablet y móvil, la barra de cambios fija y el aviso al salir. Registra las secciones, el título y "Volver al panel" en la barra lateral.
  - En modo lectura, `Field`, `SelectField`, `DateField` y `PhoneField` se muestran como `ReadValue`.
  - Piezas nuevas: `InlineConfirm`, `Switch`, `SaveStatus` y `useSaveStatus` (guardado al momento con "Guardado" o el error).
- **Vistas de Persona, Equipo y Organización:**
  - Las consultas y RPC de Supabase son las mismas que antes.
  - Ya no hay `ConfirmModal` ni `Modal`.
  - Solo entran en modo edición: en Persona, Información personal y Equipo y roles; en Equipo y Organización, Información.
- **Configuración al momento:**
  - Persona: cada fila de privacidad hace un upsert en `profile_privacy_settings`; las invitaciones actualizan `profiles.allow_athlete_invitations`.
  - Equipo y Organización: la visibilidad llama a `update_team_profile` o `update_organization_public_profile` con los datos ya guardados y el nuevo valor de `is_public`.
  - El tema y los avisos se guardan en `account_preferences`. Si algo falla, el control vuelve a su valor anterior.
- **Equipo · Roles:** cambiar el rol o quitar a un directivo se confirma en la misma fila.
- **Cuenta:**
  - "Cerrar sesión" sale directo (`SessionCard`).
  - "Eliminar cuenta" pide la contraseña en línea y llama a `request_account_deletion`.
- **Otros cambios:**
  - `Components/settings-nav.tsx` admite el título, los iconos de cada sección y `onBack`.
  - `Components/dashboard-sidebar.tsx` muestra "Volver al panel" y el título del perfil.
  - Los enlaces "Editar perfil" y "Añadir ubicación" de Mi equipo ahora llevan a `/mi-perfil`.

### Estado de Supabase (consulta de solo lectura, 2026-10-23)

- Ya existen las tablas `profiles`, `profile_privacy_settings`, `profile_tournament_visibility`, `account_preferences`, `team_division_catalog`, `organization_disciplines`, `organization_modalities` y `staff_positions`.
- Ya existen las funciones `update_team_profile`, `update_organization_public_profile`, `update_team_member_role`, `remove_team_member_role`, `get_team_members_for_manager`, `is_organization_manager` y `ensure_my_organization`.
- **`request_account_deletion`:** se aplicó el 2026-10-23 con `supabase/cuenta-eliminacion-migration.sql` y `supabase/cuenta-eliminacion-auth-migration.sql`. Las cuentas vencidas se borran de Supabase Auth cada hora con `pg_cron`.
- **Falta `athlonx_countries`** (`supabase/paises-athlonx-migration.sql`). Sin ella, el teléfono usa Panamá como único país (`fallbackCountries`). Esta migración también cambia el país de todos los equipos y organizaciones a Panamá.
- Ninguna de las dos se aplicó: esperan la autorización de Edwin.
