# Rediseño del gestor de torneos (Figma)

Estado: **en código, primera parte** (ver "Implementación" al final). El resto de secciones sigue con el estilo anterior.

Archivo: `https://www.figma.com/design/YBGPZrYsYNb5259mmBgoF1/AthlonX`, página `Claude` (`954:56`).
- El tablero "Componentes · Torneos" (`1038:14518`) está en y = 33 000.
- Debajo hay una fila por bloque. Cada fila lleva un título verde.

## Disciplinas

El gestor trabaja con las disciplinas que existen en la base de datos.
- **Rugby:** Sevens y 15.
- **Fútbol:** fútbol 8, con las reglas de `lib/football-eight.ts`.
- **Baloncesto 3x3:** las reglas de `lib/basketball.ts`.

No hay vóleibol en el proyecto. Se tomó "voleyball" como baloncesto.

Cada disciplina tiene su propia versión de las pantallas que cambian según el deporte:

| | Rugby | Fútbol 8 | Baloncesto 3x3 |
|---|---|---|---|
| Formato | Todos contra todos por división, luego semifinales | Llave de 16, eliminación directa | Llave de 16, una cancha y un día |
| Pestaña de posiciones | Tablas (PJ, PG, PE, PP, PF, PC, Dif, Pts, últimos 3) | Llaves | Clasificación (según la ronda en que quedó eliminado cada equipo) |
| Programación | Fixtures por fecha y Generador | Partidos por cancha (A y B) | Cronograma del día (15 partidos) |
| Acciones en vivo | Try +5, conversión +2, penal +3, amarilla, roja, lesión, conmoción | Gol +1, gol de penal +1, amarilla, roja, cambio | Canasta +1, desde fuera +2, tiro libre +1, falta |
| Reloj | Dos tiempos | 2 × 20 min, tiempo extra de 10 min y luego penales (se cargan ganador y marcador) | Un periodo; en la prórroga gana el primero que saque 2 puntos de ventaja |
| Extras | Ajustes de puntos y zona de clasificación | Suspensiones y canchas en vivo | Colores de cada equipo y contador de faltas |
| Arte del banner por defecto | Líneas de rugby y postes | Medio campo y áreas | Círculo central y zona |

## Oficial y rápido

- **Oficial:**
  - Los equipos entran solo por invitación; deben estar registrados en AthlonX.
  - Tiene la pestaña Convocatorias.
- **Rápido:**
  - Muestra la insignia "Torneo rápido" y no tiene Convocatorias.
  - En Equipos se puede invitar a un equipo registrado o crear un equipo temporal en la misma pantalla.
  - Los jugadores invitados no tienen cuenta y reciben un código. Si reclaman su perfil, el organizador aprueba la solicitud.
  - Las insignias de cada jugador muestran su estado: "Cuenta vinculada", "Invitado sin cuenta" o "Solicitud para reclamar".

## Foto y banner

- La cabecera de todas las pantallas usa el banner del torneo y la foto superpuesta (120 px en escritorio, 76 px en móvil).
- Si el torneo no tiene banner, se muestra el arte de su disciplina. Si no tiene foto, se muestran sus iniciales.
- Se editan en Información general → "Imagen del torneo".
- Medidas recomendadas:
  - Foto: cuadrada, de 400 × 400 px como mínimo.
  - Banner: 1600 × 400 px (4:1).
  - Formatos: JPG, PNG o WebP, hasta 5 MB.
- **Supabase:**
  - Para la foto ya existe `tournaments.cover_url`.
  - Para el banner falta agregar un campo, por ejemplo `tournaments.banner_url`, y su bucket o ruta de almacenamiento. Es una migración nueva y no se ha aplicado.

## Cambios respecto a hoy

- **Guardar cambios:**
  - Hoy se usa el modal de contraseña (`EditConfirmationOverlay`) y un panel de cambios pendientes.
  - El diseño los reemplaza por una barra inline al final del formulario. La barra muestra el resumen de cambios, el campo de contraseña y los botones Descartar y Guardar.
- **Confirmaciones y errores:** van inline, sin `window.confirm`. Ejemplos en el tablero de estados.
- **Pestañas:** se reemplazan por una fila de pestañas con subrayado verde. En móvil se deslizan.

## Pantallas

### Rugby oficial (y = 33 700)

- Escritorio:
  - Resumen `1039:14518`.
  - Tablas `1043:14633`.
  - Partido en vivo `1043:15053`.
  - Equipos (con invitación) `1043:15354`.
  - Fixtures `1045:15470`.
  - Generador `1045:15820`.
- Móvil:
  - Resumen `1047:15086`.
  - Partido en vivo `1047:15335`.

### Fútbol 8 oficial (y = 36 000)

- Escritorio:
  - Resumen `1048:15220`.
  - Llaves `1048:15566`.
  - Partido en vivo (tiempo extra y penales) `1050:15376`.
  - Partidos por cancha `1050:15711`.
- Móvil:
  - Llaves `1050:16032`.
  - Partido en vivo `1050:16193`.

### Baloncesto 3x3 oficial (y = 38 300)

- Escritorio:
  - Resumen `1052:15662`.
  - Clasificación `1052:15990`.
  - Cronograma `1052:16352`.
  - Partido en vivo (prórroga) `1052:16696`.
- Móvil:
  - Partido en vivo `1053:15967`.
  - Cronograma `1053:16120`.
- La llave de baloncesto reutiliza el diseño de la de fútbol 8.

### Torneos rápidos (y = 40 600)

- Equipos:
  - Rugby `1054:16071`.
  - Fútbol 8 `1054:16459`.
  - Baloncesto 3x3 `1054:16826`.
- Resumen:
  - Rugby `1054:17203`.
  - Fútbol 8 `1054:17640`.
  - Baloncesto 3x3 `1054:17968`.
- Móvil: Equipos de fútbol 8 `1054:18356`.

### Secciones compartidas (y = 42 900)

- Información general en edición, con foto, banner, reglas del deporte y la barra de guardado: `1055:17159`.
- Convocatorias (solo en torneos oficiales): `1056:16926`.
- Historial: `1056:17233`.

### PDF en A4, tema claro (y = 45 200)

- Tabla de posiciones de rugby: `1057:17073`.
- Fixture con plantillas: `1057:17269`.
- Lista de convocatoria con firmas: `1057:17362`.
- Llave de fútbol 8 en horizontal: `1058:17115`.
- Reporte de baloncesto 3x3: `1058:17299`.

Todos llevan la foto del torneo, el logo, una línea verde y el pie "Generado con AthlonX".

### Tema claro y estados (y = 47 600)

- Clones en tema claro:
  - Resumen de rugby `1059:17143`.
  - Llaves de fútbol 8 `1059:17625`.
  - Partido en vivo de 3x3 `1059:17987`.
  - Resumen de rugby en móvil `1059:18274`.
- Tablero de estados `1059:18515`:
  - Sin banner ni foto.
  - Sin equipos.
  - Cargando.
  - Error al guardar.
  - Confirmación inline.

## Implementación (2026-10-23, primera parte)

Cambios pedidos por Edwin al revisar el diseño:
- **Rugby sin Llaves:** rugby se juega por tabla, así que la pestaña Llaves ya no aparece. Fútbol y baloncesto sí la tienen, porque son de eliminación directa.
- **Generador para todas las disciplinas:** tiene modo automático o manual.
  - Rugby y ligas de fútbol: todos contra todos, o enfrentamientos elegidos a mano.
  - Fútbol 8: sorteo de la llave o los 8 cruces de octavos definidos a mano.
  - Baloncesto 3x3: sorteo o cada equipo ubicado a mano en los octavos.
- **Tarjeta amarilla:** se muestra con un panel inline dentro de la tarjeta del equipo.
  - El panel muestra el minuto y la lista de jugadores con su dorsal y su estado (amarillas, expulsado, fuera temporalmente).
  - También explica la regla de la disciplina antes de confirmar.
  - **Rugby:** la amarilla es una expulsión temporal (2 min en sevens, 10 en XV). Arriba del marcador aparece "vuelve en mm:ss".
  - **Fútbol:** la segunda amarilla registra también la roja.
  - El mismo panel sirve para la roja, la lesión y la conmoción. La conmoción solo existe en rugby.

Qué está en código (`.ax-v2`, tokens, tema claro y oscuro):
- **Cabecera:** banner con arte de la disciplina, foto (`cover_url` o iniciales), insignias, datos y "Editar torneo".
  - Debajo van 4 datos del torneo y pestañas con subrayado que se deslizan en móvil.
  - Archivo: `Components/torneo/ui.tsx`.
- **Barra de guardado inline (`SaveBar`):** muestra el detalle de los cambios y pide la contraseña.
  - Reemplaza el modal de contraseña, el panel de cambios pendientes y el aviso modal de cambios sin guardar.
- **Resumen:** partido destacado, próximos partidos, últimos resultados y datos del torneo.
- **Partidos:**
  - Marcador con fases (en fútbol 8), reloj y controles.
  - Una tarjeta de acciones por equipo: jugador, anotaciones con confirmación inline y tarjetas.
  - Cronología con la opción de anular con motivo, y estadísticas.
  - Lista por fecha.
  - En móvil, se elige el equipo con un selector.
- **Generador:** las dos opciones de modo y, en ligas, la configuración junto al calendario actual.
- **Historial.**
- **Reglas:** `lib/rugby.ts` y `lib/football.ts`, con pruebas en `tests/match-cards.test.mjs`.
- **Tokens:** `--ax-card-yellow`, `--ax-card-yellow-soft`, `--ax-card-yellow-line` y `--ax-card-red`, en `app/globals.css`.

Pendiente (siguen con el estilo anterior, dentro de un panel con tokens):
- Tablas, Llaves, Equipos (oficial y rápido), Convocatorias, Fixtures e Información general.
- Los paneles de baloncesto 3x3: partido en vivo, cronograma y clasificación.
- Los PDF de las nuevas plantillas A4.
- La subida de foto y banner, que necesita la migración de `banner_url` y su almacenamiento.
