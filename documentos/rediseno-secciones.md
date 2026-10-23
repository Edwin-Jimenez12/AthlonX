# Rediseño de Búsqueda, Notificaciones y Eventos

Figma: archivo `AthlonX`, página **Claude** (`954:56`), desde y≈15 600:
https://www.figma.com/design/YBGPZrYsYNb5259mmBgoF1/AthlonX?node-id=954-56

Mismo lenguaje que Mi equipo (`documentos/rediseno-mi-equipo.md`): tokens `--ax-*`, contenedor `.ax-v2`, piezas de `Components/mi-equipo/ui.tsx`. Títulos en Bebas Neue, sin etiquetas en mayúsculas encima, paneles inline en vez de modales.

| Sección | Frames (Oscuro a la izquierda, Claro a la derecha, +3200 px) | Cuenta usada en el ejemplo |
|---|---|---|
| Búsqueda | `Búsqueda · {Escritorio, Tablet, Móvil}` | Persona |
| Notificaciones | `Notificaciones · {Escritorio, Tablet, Móvil}` | Equipo |
| Eventos | `Eventos · {Escritorio, Tablet, Móvil}` | Organización |
| Navegación | `Navegación por cuenta` | Las tres |
| Estados | `Estados · Búsqueda, Notificaciones y Eventos` | — |

## Por tipo de cuenta

El diseño de cada sección es el mismo en todas las cuentas. Cambian el menú lateral y el selector de cuenta:

- **Persona:** Búsqueda, Notificaciones, Calendario (pronto).
- **Equipo:** Búsqueda, Notificaciones, Mi equipo, Eventos, Calendario.
- **Organización:** Búsqueda, Notificaciones, Organización, Eventos, Calendario, Equipos, Participantes (pronto).
- Eventos solo existe en Equipo y Organización, como hoy en `Components/dashboard-sidebar.tsx`.
- En celular, el menú abierto muestra abajo la cuenta activa. Si la persona tiene varias cuentas, el selector de la barra superior abre la lista (Persona, Equipo, Organización) y marca la activa.

## Búsqueda (`app/(panel)/busqueda/page.tsx`)

- **Cabecera:** el título y una línea de descripción.
- **Buscador:** un campo grande (52 px) con botón para borrar y el botón **Buscar**.
- **Tipos:** segmentos Todos, Personas, Equipos, Organizaciones y Torneos, con el conteo de la última búsqueda. Sustituyen a los chips de "Tipo de cuenta" dentro de Filtros.
- **Filtros (Disciplina, Ciudad, Registro):**
  - Escritorio: tarjeta lateral de 280 px.
  - Tablet: tres selectores en fila.
  - Móvil: botón "Filtros · N" que despliega los selectores en la página.
- **Resultados:** lista compacta (`Fila/Resultado`).
  - Avatar redondo para personas y marca cuadrada para entidades.
  - Nombre con insignia del tipo, línea de detalle y meta (@usuario · código).
  - Acción "Ver …" (en móvil, solo la flecha).
  - Pie con "Mostrando N de M" y "Cargar más".
- **Estados:** antes de buscar (con ejemplos tocables) y sin resultados (ofrece "Quitar filtros").
- **Datos:** las mismas RPC de hoy (`search_directory_filtered`, `search_public_players_filtered`, `search_public_team_divisions_filtered`). El conteo por tipo sale de los resultados.

## Notificaciones (`Components/notifications-history.tsx`)

- **Cabecera:** el título y el botón **Marcar todas como leídas**. Hoy solo existe marcar una por una; marcar todas recorre las no leídas.
- **Filtros:** Todas, Pendientes y No leídas, con conteos.
- **Grupos por fecha:** Hoy, Esta semana y Anteriores.
- **Fila (`Fila/Notificación`; en móvil, `Fila/Notificación móvil`):**
  - Icono según el tipo:
    - Invitación de equipo u organización: `user-plus`.
    - Cambio de dorsal: `hash`.
    - Invitación a torneo: `trophy`.
    - Informativa: `bell` o `shield`.
  - Punto verde si no está leída, y la hora relativa.
  - Insignia de estado: Pendiente, Aceptada o Rechazada; las informativas no llevan insignia.
  - **Aceptar** y **Rechazar** solo en las pendientes. Para torneos se mantiene "Inspeccionar torneo".
- Ancho máximo de 880 px en escritorio para que el texto se lea bien.

## Eventos (`app/(panel)/eventos/page.tsx`, `Components/organization-events-panel.tsx`)

- **Cabecera:** el título y el botón **Crear evento**, que solo aparece si hay organización o equipo activo, como `canCreate` hoy.
- **Herramientas:**
  - Buscador (nombre, código o sede).
  - Segmentos de estado: Todos, En curso, Publicados y Finalizados.
  - Selector de disciplina.
  - Sustituyen a la barra lateral de filtros.
- **Borradores** (solo los del usuario): fila con **Continuar** y la papelera.
  - Eliminar abre una confirmación inline en la misma fila, con contraseña (reautenticación, como hoy).
- **Torneos:** tarjetas (`Tarjeta/Evento`) en 2 columnas en escritorio y tablet, y 1 en móvil.
  - Contenido: estado, disciplina o modalidad, nombre, fechas, sede, quién organiza y código.
  - Acciones: **Editar**, si es del usuario, y **Ver torneo**.
- **Crear evento:** panel inline bajo la cabecera.
  - Tipos: Torneo, Torneo rápido, y Jornada, Entrenamiento y Convocatoria como "Próximamente".
  - Debajo, el formulario inicial (nombre, disciplina, modalidad, fechas, sede) y **Guardar borrador y continuar**.

## Pendiente para el código

- Mover el contenido de `organization-events-panel.tsx` al panel inline, sin cambiar su lógica.
- Reutilizar `ui.tsx` y sacar a `Components/` las piezas compartidas (tarjetas, filas, segmentos) para no duplicarlas entre secciones.
- Verificar con Playwright en 1440, 834 y 390 px, en claro y oscuro.
