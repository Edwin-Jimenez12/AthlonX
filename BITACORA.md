# Bitácora AthlonX

Registro de trabajo, en nube y en local. La entrada más reciente va arriba.
Formato: fecha · rama · entorno → qué se hizo · archivos · verificación · pendiente.


## Pendientes

Lista viva de lo que queda por hacer. Cuando algo se termine, se marca con [x] y se anota la entrada de bitácora donde se cerró.

**Monetización y planes**
- [ ] Descuento por tener los cuatro perfiles (atleta, coach, staff, directivo) en vez de pagar cada plan completo. Decidido: planes individuales por ahora.
- [ ] Plan Free completo del atleta: definición final (lo aprobado está en el calendario).
- [ ] Prorrateo de cupos de AX Club y precio por cupo.
- [ ] Planes de grupo (Club Pro y Club Élite): cupos, invitaciones y panel de miembros.
- [ ] Cuenta de organización: parte económica (que la organización maneje pagos, cobros y planes de sus miembros). Se incluirá más adelante.
- [ ] Precios de los planes Pro y Élite para organización y para equipo (hoy "Por definir").
- [x] Reportes PDF y CSV en la cuenta de organización: desde Pro (decidido el 2026-11-03). El logotipo propio en reportes sigue siendo de Élite.
- [x] Eliminar la cuenta de organización: disponible en Free, Pro y Élite (decidido el 2026-11-03). Los torneos y eventos compartidos con otras instituciones o equipos no se borran y quedan con el organizador "Organización eliminada" (frase propuesta, a confirmar).
- [x] Formato liga (con fases o final directa) en la cuenta de organización: lo que cambia es cuántas ligas activas hay. Pro: 5 en torneos rápidos y 3 en oficiales; Élite: sin límite; Free: en su único torneo rápido activo (decidido el 2026-11-03).
- [x] Implementar en código los límites y bloqueos de la cuenta de organización según el Excel aprobado: base de datos, Mi perfil y planes (entrada del 2026-11-03, "Planes de la cuenta de organización en código").
- [x] Participantes y calendario de la organización (entrada del 2026-11-04, "Calendario y Participantes de la organización").
- [x] Organización: asistencia resumida por equipo, reportes PDF/CSV y patrocinios (entrada del 2026-11-04).
- [ ] Probar en navegador, con una cuenta de organización real, el calendario y Participantes en Free y en Pro.
- [x] Pasar a código, según Figma y separado por plan: Organización, Equipos y Torneos (entrada del 2026-11-04, "Secciones de organización según Figma").
- [ ] Patrocinios: mostrar los logotipos en la página pública del torneo y permitir subir la imagen (hoy se guarda un enlace).
- [ ] Sincronización real con Google y Outlook (el interruptor de Pro queda guardado solo en pantalla).
- [x] Organización: repetir eventos y recordatorios por plan (entrada del 2026-11-04).
- [ ] Panel administrativo: editar límites y funciones (`limits`, `feature_flags`) de cada plan desde la pantalla de Planes.
- [x] Planes de equipo (Free, Pro, Élite) y la sección Finanzas en código (entrada del 2026-11-04, "Planes de la cuenta de equipo y Finanzas en código").
- [ ] Pasarela de pago antes de diciembre: sin ella no hay ingreso real (hoy solo códigos al 100 %). Se decide más adelante, con el proveedor.
- [ ] Plan de pruebas con un equipo de prueba (copia, sin datos reales de jugadores) y cuentas de cada perfil, en Free, Pro y Élite.
- [ ] Probar en navegador, con una cuenta de equipo real, Finanzas, Estadísticas, Calendario y Mi perfil en Free y en Pro (con un código al 100 %).
- [ ] Finanzas: editar un movimiento (hoy se puede crear y eliminar; el registro de cambios ya guarda las ediciones).
- [ ] Cuenta de organización en Figma: versión responsive (tablet y móvil).
- [ ] Confirmar la frase para el organizador de una cuenta eliminada (propuesta: "Organización eliminada").

**Calendario**
- [ ] Sincronización con Google Calendar y Outlook (Pro): requiere crear las credenciales de Google y de Microsoft.
- [ ] Lista de preparación en el detalle del evento (diseño de Figma; no hay datos todavía).
- [ ] Recordatorios personalizados para eventos de equipo y organización en Pro (hoy todos reciben 4 horas antes).
- [ ] Exportar a ICS: postergado.
- [ ] **Eventos: agregar el tipo "Amistoso"** (pedido por Edwin el 2026-11-05), para partidos amistosos del equipo sin armar un torneo.
- [ ] **Definir la asistencia del jugador**: Edwin quiere un sistema de asistencia dentro de la cancha (no solo la confirmación Voy / Tal vez / No voy). Hay que definir cómo se registra, quién la toma y en qué plan va. Mientras se define, no se muestra en la plataforma (se quitó la tarjeta "Próximamente" del calendario y de Estadísticas el 2026-11-05).
- [ ] Reporte de asistencia por jugador (Pro): base de datos lista, falta la pantalla. Depende de la definición anterior.
- [ ] Vista de todos los equipos de la organización y choques de cancha/horario (Pro, directivo): base de datos lista, falta la pantalla.
- [ ] Torneos y convocatorias en el calendario: los filtros existen, pero no hay eventos de esos tipos.
- [ ] Verificar en navegador el calendario de coach, staff y directivo.
- [ ] Versión móvil y modo claro del calendario, contra Figma.

**Cuenta personal y staff**
- [x] Planes por perfil: atleta y entrenador con planes Free y Pro (y Élite después); staff y directivo quedan en Free por ahora. (Código y SQL aplicados el 2026-11-05, entrada "Cuenta personal aplicada en código".)
- [x] Excel de planes de atleta y entrenador (Free y Pro): marcado por Edwin y guardado en `documentos/PLANES_ATLETA_ENTRENADOR_APROBADO.xlsx` (entrada del 2026-11-05, "Figma de atleta y entrenador").
- [ ] Revisar y aprobar en Figma los 4 sets de la cuenta personal (Atleta Free y Pro, Entrenador Free y Pro); después, pasarlos a código.
- [x] Modo claro y versión móvil de los 4 sets de la cuenta personal (entrada del 2026-11-05, "Modo claro y móvil de la cuenta personal"). Pendiente: versión de tableta y revisión de Edwin.
- [ ] Recordatorios por correo: el recordatorio de un evento llega también al correo de la cuenta (personal, equipo u organización). Requiere un proveedor de correo.
- [ ] Estadísticas por año en vez de temporada, en todas las cuentas: vista por semana, mes y año; Free ve el año actual y Pro los años anteriores. Quitar la tarjeta "Temporada" de Configuración del equipo y de la organización, y cambiar `team_season`, `team_set_season` y las vistas de Estadísticas y Finanzas.
- [ ] Atleta Free: 1 actividad personal repetida al mes; la repetición se desactiva al terminar el mes.
- [ ] Entrenador Free: 5 eventos del equipo al mes (hoy el límite del equipo Free es 10). Definir cómo conviven el límite del entrenador y el del equipo.
- [ ] El entrenador no crea eventos Amistoso ni torneos, y no da permisos de edición por evento: eso lo hace un directivo. Solo edita un evento si un directivo le da permiso como staff.
- [ ] Confirmar que "Equipos que entrena" (Free 1, Pro 3) cuenta los equipos donde tiene el cargo de entrenador.
- [ ] Pro completo: asistencia en cancha pendiente (por definir). Formaciones y anuncios ya están construidos (entrada del 2026-11-05, "Cuenta personal aplicada en código").
- [ ] Carga de trabajo semanal del atleta: la ven el atleta y el médico por defecto; el médico da permiso al entrenador o a la cuenta de equipo.
- [ ] Seguimiento de salud centralizado: un registro por atleta con acceso por cargo y por equipo (tabla de vistas en la entrada del 2026-11-05). Confirmar con un médico y un fisioterapeuta profesionales antes de construirlo.
- [ ] Aviso de molestias al médico: consentimiento expreso, tutores para menores de edad y revisión legal (Ley 81 de 2019, Panamá) antes de lanzarlo.
- [ ] Perfil de staff como cargo (médico, preparador físico, fisioterapeuta, analista, delegado, logística, utilero), con permisos asignables: tesorero y árbitro/juez.
- [ ] Calificación de árbitros por las personas: mostrar solo con un mínimo de calificaciones, con moderación y sin revelar quién califica.

**Cuenta de equipo**
- [ ] Decidir si el equipo puede crear torneos rápidos o solo las organizaciones (pregunta del 2026-11-04). Hoy el equipo sí puede; en Free cuenta contra su límite de 1 torneo activo.
- [ ] Finanzas: discutir la sección completa con Edwin (lo dejó pendiente en el Excel); el diseño de Figma sirve de base.
- [ ] Confirmar el límite de presupuestos en Free (en el diseño: 1 presupuesto activo).

**Mi perfil**
- [ ] Modo claro de "Plan actual" y "Mejorar plan" (diseño de Figma).
- [ ] Probar en navegador la compra con código promocional.

**Panel administrativo**
- [ ] Probar los roles con cuentas reales: propietario, administrador y colaborador, con y sin permisos.
- [ ] Probar el flujo de contraseña temporal y el de eliminar cuenta.
- [ ] Versión móvil del panel.
- [ ] Revisar el contenido publicado en Novedades (hoy aparece "ñaohf", que parece texto de prueba).

**Sitio público**
- [ ] Sección de Planes en la página de inicio (hoy solo está en el menú).
- [ ] Formulario de Sugerencias para los usuarios (la función de base de datos ya existe).

**Otros**
- [ ] Documento PERSONA: definir el contenido de "Permitido" y "No permitido".
- [ ] Bug del botón pausa en la UI de básquet: falta el error de consola.
- [ ] Repositorio: quitar de Git `.next` y `tsconfig.tsbuildinfo` (pesan unos 282 MiB en el historial; el build de la plataforma se agotó una vez).
- [ ] Probar en navegador el flujo completo de eliminación de cuenta y recuperación dentro de los 15 días.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Selector de vista con los tokens del panel

**Qué se hizo**: `Components/context-switcher.tsx` usaba colores fijos (`#b4ff45`, `#0b1d2c`) y no los tokens `var(--ax-*)` del resto del panel. Se reescribió con tokens, radios de 14 px en paneles y 10 px en opciones, como en `Components/mi-equipo/ui.tsx`. Cada vista personal ahora dice "Cuenta personal" como subtítulo, en vez de repetir "Vista personal". La vista actual lleva una marca circular con check.

**Verificación**: `npx tsc --noEmit` sin errores; el selector vive dentro de `.athlonx-dashboard`, así que hereda los tokens. Falta revisar en navegador, tema claro y oscuro.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Agregar roles en Mi perfil

**Qué pasaba**: la tarjeta Roles de Mi perfil > Equipo y roles solo mostraba los roles. No había forma de agregar entrenador. La función `set_my_personal_roles` ya existía en la base (`supabase/personal-role-management-migration.sql`), pero la interfaz nunca la llamaba.

**Qué se hizo**: en modo de edición, la tarjeta Roles muestra los cuatro roles (Atleta, Entrenador, Staff, Directivo) para activar o desactivar. Al guardar se llama a `set_my_personal_roles`; la base exige que quede al menos un rol. Después se avisa al menú lateral para que cambie el contexto. Archivo: `Components/mi-perfil/persona-profile-view.tsx`.

**Verificación**: `npx tsc --noEmit` sin errores; la función existe y el constraint acepta los cuatro roles (consulta de solo lectura). Falta probar en navegador con una cuenta real.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Estadísticas por año, cuota propia, entrenamientos, formaciones y anuncios (con SQL aplicado)

**Decisiones de Edwin aplicadas**:
- Estadísticas por año (año calendario, del 1 de enero al 31 de diciembre), por semana, mes o año, para todas las cuentas. La temporada personalizada ya no existe: `team_season()` devuelve el año en curso. Finanzas dice "Saldo del año". La tarjeta Temporada de Configuración del equipo se quitó.
- Free ve el año actual; Pro ve los anteriores (en equipos, por `comparar_temporadas`; en personas, por plan Pro o Élite).

**SQL aplicado** (proyecto `mlvtsgseneqzihwkiatg`, verificado con consultas de solo lectura; cada migración devolvió HTTP 201):
- `supabase/persona-stats-by-year-migration.sql`: `team_season`, `team_season_stats` (sin reemplazar el rango por temporada) y la nueva `persona_personal_stats(p_from, p_to)`, que suma por equipo las estadísticas propias usando `players.user_id`.
- `supabase/persona-coach-event-limit-migration.sql`: trigger `team_calendar_events_coach_limit`. Entrenador con plan Libre: máximo 5 eventos de equipo creados por él al mes, en todos sus equipos. Solo cuenta altas nuevas.
- `supabase/team-my-fee-migration.sql`: `team_my_fee(p_team, p_month)`. El jugador ve su propio monto, estado del mes y meses pendientes.
- `supabase/team-training-formations-announcements-migration.sql`: tablas `team_training_sessions`, `team_training_exercises`, `team_training_responses`, `team_training_templates`, `team_formations`, `team_announcements`, `team_announcement_views`, con seguridad por fila. Triggers `team_formations_pro` y `team_announcements_pro`: el entrenador con plan Libre no puede crear formaciones ni anuncios.

**Interfaz aplicada**:
- Atleta · Mi equipo: cuota por equipo (pagada o pendiente, con meses pendientes).
- Entrenamientos (atleta y entrenador): sesiones con ejercicios y respuestas Voy, Tal vez o No voy; el entrenador asigna a todo el equipo o a una división, crea y reutiliza plantillas.
- Formaciones (entrenador Pro): cancha de rugby de 15 posiciones, asignación de jugadores y formaciones guardadas.
- Anuncios (entrenador Pro para publicar): para todo el equipo o una división; el atleta registra su lectura y el entrenador ve el número de lecturas.
- Estadísticas personales y del equipo: periodo común (`Components/estadisticas/periodo.tsx`).

**Decisiones por defecto, a revisar con Edwin y el entrenador** (están en el encabezado de la migración): entrenamientos sin repetición; formaciones de rugby guardadas por equipo; anuncios dentro de la app, sin push.

**Pendiente, fuera de alcance por ahora**:
- Carga y salud: no se construyó. La bitácora pide confirmar el modelo con un médico y un fisioterapeuta profesionales, y revisar la Ley 81 de 2019, antes de construirlo. Esa confirmación la tiene que dar una persona, no el código.
- Recordatorios por correo: falta elegir el proveedor de correo y sus credenciales.
- Sincronización con Google y Outlook: requiere credenciales de Google y Microsoft.
- `supabase/` del proyecto: `team_set_season` sigue existiendo en la base, pero ya no tiene pantalla.

**Verificación**: `npx tsc --noEmit` sin errores fuera de `.next`; `npm run build` correcto; 59 pruebas en `tests/*.mjs` correctas (corridas después de los últimos cambios). No se probó en navegador con cuentas reales.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Cuenta personal aplicada en código (diseño aprobado)

**Qué se hizo** (Edwin aprobó el diseño de la cuenta personal en Figma y dio permiso para aplicarlo):
- **Menú**: atleta con Búsqueda, Notificaciones, Mi equipo, Calendario, Estadísticas, Entrenamientos y Carga y salud. Entrenador con Mi equipo, Calendario, Estadísticas, Entrenamientos, Carga y salud, Formaciones y Anuncios (`Components/dashboard-sidebar.tsx`).
- **Atleta · Mi equipo** (`app/(panel)/atleta/page.tsx`): equipos del atleta, convocatorias por equipo (`TeamCallupsCard`) y plan. La cuota muestra un aviso de pendiente.
- **Entrenador · Mi equipo** (`app/(panel)/entrenador/page.tsx`): equipos a cargo con su plantilla y convocatorias. Límite de equipos por plan: Libre 1, Pro 3.
- **Entrenador · Convocatoria** (`app/(panel)/entrenador/convocatoria/page.tsx`): convocatorias del equipo elegido.
- **Estadísticas personales** (`Components/persona/persona-stats-view.tsx`, enlazado desde `app/(panel)/estadisticas/page.tsx`): semana, mes y año. Libre ve el año actual; Pro ve años anteriores. Muestra la fila propia del jugador en `team_season_stats` (busca por nombre).
- **Entrenamientos, Carga y salud, Formaciones y Anuncios** (`app/(panel)/*`): pantallas del diseño con sus funciones y su plan, marcadas como "Próximamente". No hay datos ni tablas todavía.
- **Componentes compartidos**: `Components/persona/persona-ui.tsx`.

**Limitaciones conocidas** (requieren SQL nuevo, no aplicado):
- La cuota propia del atleta: `team_fee_board` solo deja leerla al tesorero. Hace falta una consulta de lectura propia.
- Estadísticas por año: el rango lo ajusta el plan del **equipo**, no el de la persona (`team_season_stats`). Hace falta una consulta personal con el plan de la persona. Si el rango cambia, la pantalla lo avisa.
- Límite de 5 eventos al mes para el entrenador en Free: no está implementado. Requiere una regla en la base de datos.
- Carga, disponibilidad, entrenamientos, formaciones y anuncios: sin modelo de datos. Carga y disponibilidad dependen de decisiones de salud pendientes.
- Recordatorios por correo: sin proveedor.
- Calendario móvil en el código: sin cambios; el de Figma ya replica su diseño.

**Verificación**: `npx tsc --noEmit` (sin errores fuera de `.next`), `npm run build` correcto, 59 pruebas en `tests/*.mjs` correctas. `npm run lint` no corre: el repo no tiene configuración de ESLint (`eslint.config.*`), problema previo. No se probó en navegador porque las pantallas requieren una cuenta con datos reales.

**Pendiente**: aplicar las consultas de lectura propia (cuota y estadísticas) y la regla de 5 eventos al mes, con aprobación de Edwin para ejecutar SQL en el proyecto. Definir la lista de salud con médico y revisión legal. Elegir proveedor de correo para recordatorios.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Calendario móvil en Figma igual al código

**Qué se hizo**: en los 8 frames móviles de calendario de la cuenta personal (Atleta y Entrenador, Free y Pro, oscuro y claro) la cuadrícula del mes pasó a 640 px dentro de un contenedor de 358 px con recorte, como en `Components/calendario/athlete-calendar.tsx` (`overflow-x-auto` con `min-w-[640px]`). Las barras de color de "Próximas actividades" volvieron a 4 px. No se cambió el diseño del código.

**Aprobación**: Edwin aprobó el diseño de la cuenta personal en Figma y dio permiso para aplicarlo en código. Esa implementación no se empezó en esta entrada; ver la pregunta de alcance en la sesión.

**Verificación**: capturas de Atleta Free (oscuro) y Entrenador Pro (claro) en móvil.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Modo claro y móvil de la cuenta personal

**Qué se hizo**: en la página REDISEÑO se agregaron, para los 4 sets de la cuenta personal (Atleta Free y Pro, Entrenador Free y Pro):
- **Escritorio en modo claro**: copia de cada pantalla oscura con el modo de variables `Claro` (`960:1`). Nombre `Persona · <Rol> · <Plan> · <Pantalla> · Claro`. Filas en y=100000 (Atleta Free), 104000 (Atleta Pro), 108000 (Entrenador Free) y 112000 (Entrenador Pro).
- **Móvil (390 px) oscuro y claro**: copia de cada pantalla con el menú lateral arriba (en varias líneas), contenido en una sola columna con 16 px a cada lado, y columnas, tarjetas y filas apiladas. Las tablas pasan a una celda por línea. Nombre `... · Móvil · Oscuro` o `... · Móvil · Claro`. Móviles oscuros en x=20000 y claros en x=26000, en la misma fila que su escritorio.
- Los colores fijos del diseño oscuro (textos y fondos que no estaban ligados a variables) se pasaron a colores del tema claro del equipo. Los elementos en lima no cambian.
- Las conexiones de prototipo de cada variante apuntan a su propia variante (menú lateral, selector Free/Pro, Mi perfil y Mejorar plan).

**Limitaciones conocidas**:
- Versión de tableta (834 px) no hecha; el equipo sí la tiene.
- En el móvil, la cuadrícula del calendario queda compacta: las celdas del mes son muy angostas. Conviene una vista de agenda en móvil antes de pasar a código.
- En el móvil del entrenador, la plantilla usa una lista simple (nombre, posición y estado) en vez de la tabla completa.
- Los móviles tienen altura variable (por ejemplo, la búsqueda con 14 resultados mide ~6300 px).
- La adaptación móvil es automática sobre el diseño de escritorio; no se revisó cada pantalla a detalle.

**Archivos**: ninguno del repositorio (solo Figma). Esta entrada.

**Verificación**: se revisaron capturas de escritorio claro y móvil (oscuro y claro) de Atleta Free, Atleta Pro, Entrenador Free y Entrenador Pro. Se corrigieron filas comprimidas, texto cortado, tarjetas oscuras en modo claro y títulos ilegibles.

**Pendiente**:
- Versión de tableta de los 4 sets.
- Vista de agenda para el calendario en móvil.
- Revisión y aprobación de Edwin antes de pasar a código.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Figma de atleta y entrenador (Free y Pro)

**Qué se hizo**: con el Excel marcado por Edwin (`documentos/PLANES_ATLETA_ENTRENADOR_APROBADO.xlsx`) se diseñaron en Figma, página REDISEÑO, cuatro sets de la cuenta personal en tema oscuro, con datos ficticios. Están debajo de los diseños de equipo, desde y=85000, con el rótulo "Cuenta personal · Atleta y Entrenador". Los frames se llaman `Persona · <Atleta|Entrenador> · <Free|Pro> · <pantalla>`.
- Atleta (9 pantallas, y=85400 Free y y=87600 Pro): Búsqueda, Notificaciones, Mi equipo (equipos, convocatorias y mi cuota), Calendario, Nueva actividad, Estadísticas, Entrenamientos, Carga y salud, Mi perfil (plan y tabla Free/Pro).
- Entrenador (12 pantallas, y=89800 Free y y=92000 Pro): Búsqueda, Notificaciones, Mi equipo (equipos que entrena y plantilla), Convocatoria, Calendario, Nuevo evento, Estadísticas (con historial por jugador y reportes), Entrenamientos (sesiones, plantillas y asignación), Carga y salud (con permiso del médico), Formaciones, Anuncios, Mi perfil.
- En Free, lo que es de Pro aparece como "Disponible en Pro" con el botón Mejorar plan.
- Prototipo: el menú lateral navega entre pantallas del mismo set. El selector Free/Pro salta a la misma pantalla del otro plan. "Mejorar plan" y el avatar abren Mi perfil.

**Qué no se incluyó**:
- Lo marcado [POR DEFINIR]: asistencia en cancha, reporte de molestia al médico y diagnóstico visible para el entrenador. También quedó fuera el reporte de asistencia por jugador, porque depende de la asistencia en cancha.
- Lo rechazado: Amistoso y torneos para el entrenador, y que el entrenador dé permisos de edición por evento (lo hace un directivo).

**Decisiones del Excel**:
- Los recordatorios también llegan por correo.
- Las estadísticas van por año (semana, mes y año), no por temporada, también para equipo y organización.
- Atleta Free: 1 actividad repetida al mes, que se desactiva al terminar el mes.
- Entrenador Free: 5 eventos al mes.
- Sincronización, historial y comparar años: solo en Pro.
- Entrenamientos, carga semanal y disponibilidad están en Free y en Pro. Formaciones, anuncios, historial por jugador y reportes son solo de Pro.

Todo está agregado en Pendientes.

**Verificación**: se revisaron capturas de las pantallas de los cuatro sets. Se corrigieron filas vacías que quedaban muy altas, tablas en media columna, la altura de la plantilla y el botón "Añadir jugador" en la plantilla del entrenador.

**Pendiente**:
- Que Edwin apruebe el diseño.
- Modo claro y móvil.
- Pasar a código, incluido el cambio de temporada a año en equipo y organización.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Seguimiento de salud centralizado con acceso por cargo y equipo

**Decisiones**
- La información de salud del atleta (molestias, estado de disponibilidad, restricciones y carga) se guarda en **un solo registro por atleta**. Lo que cada persona ve depende de su cargo en el equipo y de los permisos del atleta o del médico.
- **Acceso ligado al equipo**: el cargo cuenta solo dentro del equipo donde está activo. Un fisioterapeuta de un equipo no ve a los atletas de otro. Si la persona deja el equipo, pierde el acceso.
- **Vista por cargo** (propuesta, pendiente de confirmar):
  - Atleta: todo lo suyo.
  - Médico y fisioterapeuta del equipo: ficha clínica completa y carga de los atletas del equipo.
  - Preparador físico: carga, sesiones y estado de disponibilidad; las restricciones que defina el médico, pero no el diagnóstico.
  - Entrenador: estado de disponibilidad y restricciones; carga y diagnóstico solo con permiso del médico.
  - Staff sin cargo clínico (logística, utilero, delegado): nada de salud.
  - Árbitro: nada de salud ni de carga. La sección aparece solo si la persona tiene un cargo con acceso en ese equipo.
  - Tesorero: solo finanzas.
- Una persona con varios cargos en el mismo equipo ve la unión de sus accesos.

**Pendientes**
- [ ] Confirmar la tabla de vistas por cargo con el médico, el fisioterapeuta y el preparador físico.
- [ ] Definir la ficha de seguimiento (molestia, evolución, estado, restricciones) y el registro de quién cambió cada dato.
- [ ] Revisión legal (Ley 81 de 2019) del acceso por equipo y por cargo.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Decisiones de staff, árbitro y datos de salud

**Decisiones de Edwin**
- El perfil de **staff es un cargo** con varios cargos posibles según la experiencia de la persona: médico, preparador físico, fisioterapeuta, árbitro, tesorero, etc.
- **Tesorero y árbitro/juez son permisos**, no cargos. Los puede tener cualquiera del perfil de staff.
- **Árbitro** puede ser calificado por las personas (calificación del árbitro). Pendiente: reglas de moderación y de cuántas calificaciones hacen falta para mostrarla.
- **Datos de salud (molestias):** el atleta y el médico lo ven por defecto. El entrenador lo ve solo si el médico da permiso. Lo mismo para la **carga semanal**: la ven el atleta y el médico; el médico puede dar permiso al entrenador o a la cuenta de equipo.

**Recomendación pendiente de decidir (no implementada)**
- Separar el dato clínico del dato operativo:
  - Molestia y diagnóstico: solo médico y fisioterapeuta, y el atleta.
  - Estado de disponibilidad (apto, apto con restricciones, no apto) y avance de recuperación: lo ve el entrenador y el preparador físico, sin diagnóstico.
  - Carga de entrenamiento: preparador físico y entrenador, con permiso del médico.
- Revisión legal de la Ley 81 de 2019 (protección de datos personales, Panamá). Incluye: consentimiento expreso para datos de salud, acceso y eliminación, transferencias fuera de Panamá (la base está alojada fuera) y consentimiento de tutores para menores de edad.

**Pendientes**
- [ ] Definir el modelo de datos de salud (molestia, estado de disponibilidad y carga) con el médico y el preparador.
- [ ] Revisión legal con abogado de Ley 81 de 2019 antes de lanzar molestias o carga.
- [ ] Calificación de árbitros: reglas de moderación y mínimo de calificaciones.
- [ ] Perfil de staff como cargo con permisos (tesorero, árbitro) asignables.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Decisiones de la cuenta personal (sin Excel todavía)

**Decisiones de Edwin**
- El plan es **por perfil**: cada perfil (atleta, entrenador, staff, directivo) puede tener su propio plan.
- **Por ahora solo planes para atleta y entrenador.** Staff y directivo quedan en Free hasta nuevo aviso.
- **Pro se vende completo**, incluidas las funciones que todavía no existen (entrenamientos, asistencia, formaciones, anuncios). Hay que construirlas para que la cuenta personal y la de equipo queden completamente listas antes de cobrar.
- Pasarela de pago: se decide más adelante (sigue en Pendientes).

**Nuevas funciones pedidas (pendientes de definir)**
- **Carga de trabajo semanal del atleta:** que el atleta registre su carga por semana para que el cuerpo técnico la vea.
- **Aviso de molestias al médico:** que el atleta pueda reportar una molestia y notificar al médico. Es un dato de salud: requiere consentimiento explícito, acceso solo para el médico (no para el entrenador por defecto) y revisión legal de la ley de protección de datos personales de Panamá.

**Staff: definición pendiente**
- Hoy existen dos conceptos distintos que se llaman "staff":
  - **Cargos del cuerpo técnico** (tabla `staff_positions`): médico, preparador físico, fisioterapeuta, analista de rendimiento, delegado, logística y utilero.
  - **Árbitro o juez:** rol dentro de un torneo (`tournament_staff_grants`), no del equipo.
- **Tesorero** es un permiso de finanzas (`team_treasurers`), no un cargo: lo puede tener cualquier persona del equipo.
- Pendiente: decidir si el cargo de staff se separa del permiso de tesorero y si árbitro/juez queda en el perfil de staff o en el torneo.

**Pendientes nuevos**
- [ ] Definir la funcionalidad de carga de trabajo semanal del atleta.
- [ ] Definir el aviso de molestias al médico (consentimiento, permisos y revisión legal).
- [ ] Definir el perfil de staff: cargos del cuerpo técnico frente a permiso de tesorero y árbitro/juez.
- [ ] Construir las funciones de Pro que todavía no existen (entrenamientos, asistencia, formaciones, anuncios) antes de vender Pro.
- [ ] Excel de planes de atleta y entrenador, después de definir los puntos anteriores (el de noviembre se rehará).

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Fotos más grandes en la búsqueda

**Qué se hizo**: los resultados de búsqueda muestran la foto o el escudo a 64 px (antes 44 px), y 56 px en móvil, con tamaño sm: 64 px. Se agregó el tamaño 64 a `Avatar` y `EntityMark` (`Components/mi-equipo/ui.tsx`), y se usa en `Components/busqueda/search-results.tsx`.
**Verificación**: `npm run build` sin errores; 59 pruebas correctas. No se probó en navegador.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Imagen completa al subir (sin recorte de los lados)

**Causa**: el encuadre inicial cubría todo el recuadro (como una foto), así que un logo ancho perdía los lados al guardarse. El margen se aplicaba bien, pero la imagen ya llegaba recortada.
**Qué se hizo**:
- El encuadre inicial muestra la imagen completa, con el margen alrededor (`fitZoom`). El zoom puede bajar hasta ese punto y subir hasta 3.
- Si la imagen es más pequeña que el marco, se centra. Si es más grande, no deja huecos (`clampFrameOffset`).
- El archivo se dibuja a partir del encuadre visible (`FrameView` en `lib/image-compress.ts`), recortado al área del margen. Ya no se usa el recorte a partir de la imagen original.
- El recuadro de edición y "Así se verá" recortan la imagen al área del margen.
**Archivos**: `lib/image-compress.ts`, `lib/image-upload.ts`, `Components/image-upload-field.tsx`, `tests/image-compress.test.mjs` (3 pruebas nuevas, las anteriores se conservan).
**Verificación**: `npm run build` sin errores; 59 pruebas correctas. No se probó en navegador.
**Nota**: las imágenes ya subidas siguen recortadas; hay que volver a subirlas.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Margen para fotos, escudos y logotipos

**Qué se hizo**: al subir una imagen aparece el control "Margen (espacio alrededor)" (0 a 30 %, por defecto 10 %). Deja espacio vacío alrededor de la imagen para que no toque el borde. Se aplica igual en el recuadro de edición, en "Así se verá" y en el archivo que se guarda (`lib/image-compress.ts` → `render` dibuja en un área reducida; `lib/image-upload.ts` recibe el margen).
**Nota**: las imágenes ya guardadas no cambian; para aplicar el margen hay que volver a subirlas.
**Verificación**: `npm run build` sin errores; 56 pruebas correctas. No se probó en navegador.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Escudo del equipo solo en modo edición

**Qué se hizo**: el escudo ya no se guarda al subirlo. "Cambiar imagen" y "Quitar" se habilitan solo al pulsar Editar información, y el cambio se guarda con el botón Guardar cambios, junto con el resto de los datos. Cancelar devuelve el escudo guardado. El cambio cuenta como cambio sin guardar.
**Archivos**: `Components/mi-perfil/team-profile-view.tsx`.
**Verificación**: `npm run build` sin errores; 56 pruebas correctas. No se probó en navegador.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Imágenes sin fondo: transparencia respetada

**Qué se hizo**
- Los recuadros de foto, escudo y logotipo tenían el verde de la marca de fondo, que se veía a través de las partes transparentes. Ahora el fondo de color solo se usa cuando no hay imagen (iniciales). Aplica a: encabezado de Mi perfil, listas de Mi perfil, `Avatar` compartido, menú de cuenta, selector de vistas, Mi equipo, tarjeta del logotipo de la organización, panel del atleta y perfiles públicos (persona, equipo, organización).
- Compresión (`lib/image-compress.ts`): si el navegador no genera WebP (Safari), se usa PNG antes de JPEG, para conservar la transparencia. `lib/image-upload.ts` guarda la extensión `.png`.

**Verificación**: `npm run build` sin errores; 56 pruebas correctas. No se probó en navegador.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Foto, escudo y logotipo en todos los lugares donde aparece la cuenta

**Qué se hizo**: revisión de todos los lugares que dibujaban iniciales en vez de la imagen de la cuenta. Ahora usan la foto (persona), el escudo (equipo) o el logotipo (organización) cuando existe:
- **Barra superior**: el menú de cuenta (`Components/account-menu.tsx`, `Components/dashboard-header.tsx`) y el selector de vistas (`Components/context-switcher.tsx`). Se actualizan al momento al subir una imagen (evento `athlonx-profile-updated` con `avatar_url` o `logo_url`).
- **Contextos de cuenta** (`lib/account-contexts.ts`): nuevo campo `imageUrl`.
- **Mi equipo**: encabezado con el escudo (`lib/team-access.ts` trae `logo_url`).
- **Mi perfil**:
  - Encabezado (Hero) de equipo, persona y organización.
  - Listas: equipos y organizaciones de la persona, directivos y organización del equipo, equipos y directivos de la organización. `ListRow` acepta `image`.
  - Tarjeta del logotipo de la organización.
- **Torneo**: filas de partidos con el escudo de cada equipo.
- **Panel del atleta**: tarjetas de afiliaciones.
- Ya mostraban imagen y no se tocaron: perfiles públicos (persona, equipo, organización), búsqueda, plantilla, cuerpo técnico, tabla de posiciones y equipos del torneo.

**Verificación**: `npm run build` sin errores; 56 pruebas correctas. No se probó en navegador (hay que desplegar).

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Escudo del equipo con subida, recorte y vista previa

**Qué se hizo**: la tarjeta "Escudo" de Mi perfil › Información del equipo tenía un aviso "Próximamente". Ahora usa el mismo componente de imagen de la foto de persona (compresión en el navegador, arrastrar para elegir la parte visible y zoom con vista previa). El escudo se guarda al subirlo en `teams.logo_url`, con `update_team_profile`. Solo propietario y directivos lo cambian.
**Archivos**: `Components/mi-perfil/team-profile-view.tsx`.
**Verificación**: `npm run build` sin errores; 56 pruebas correctas. Backend ya existente: bucket `avatars` (2 MB, webp/jpg/png) y permiso `equipo/{id}` para dueño y organización.
**Corrección**: al subir, el escudo se borraba al recargar porque se guardaba el valor anterior (el estado de React todavía no se había actualizado). Ahora la URL nueva se pasa directamente al guardar.
**Encabezado**: el encabezado del perfil (Hero) mostraba siempre las iniciales. Ahora usa la imagen cuando existe, en equipo, persona y organización (escudo, foto y logotipo).
**Pendiente**: probar la subida en el sitio publicado (requiere desplegar).

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Excel de atleta y entrenador (Free y Pro), para elegir funciones por incluir

**Qué se hizo**: `documentos/PLANES_ATLETA_ENTRENADOR_FREE_PRO.xlsx`, con hojas Atleta, Entrenador y Por definir. Cada función lleva [HOY] (ya existe), [PENDIENTE] (hay que construirla) o [POR DEFINIR] (falta una decisión). Élite queda para después.
**Forma de trabajo acordada**: primero se marcan las funciones a incluir en cada perfil (APRO/RECHA), luego se resuelven las decisiones de la hoja Por definir, y después se incorporan al código poco a poco.
**Pendiente**: que Edwin marque el Excel y decida la primera tanda.

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Excel de planes de la cuenta personal por perfil

**Qué se hizo**: `documentos/PLANES_PERSONA_PROPUESTA.xlsx`, con una hoja por perfil (Atleta, Entrenador, Staff y Directivo) y columnas Libre, Pro y Élite con APRO/RECHA. Además, hojas de Precios (los del documento de planes de noviembre) y Decisiones (6 preguntas abiertas). Lo que todavía no existe lleva "(próximo)" y no debería cobrarse hasta construirlo.
**Base**: `documentos/athlonx-planes-y-precios.docx` (noviembre) y los límites actuales de la tabla `plans`.
**Pendiente**: que Edwin marque el Excel; luego, Figma por perfil y código. Pasarela de pago antes de diciembre (ver Decisiones).

---

## 2026-11-05 · `claude/great-ritchie-2n8uq9` · nube → Asistencia del jugador fuera de la plataforma y amistoso pendiente

**Qué se hizo**
- Se quitó la tarjeta "Asistencia por jugador · Próximamente" del calendario de equipo y de Estadísticas, en código y en Figma (12 tarjetas en los marcos "Equipo · …"). Se mostrará cuando se defina el sistema de asistencia dentro de la cancha.
- En el detalle del evento, la lista de respuestas (Voy, Tal vez, No voy) pasó a llamarse "Respuestas de los jugadores", para no confundirla con ese sistema.
- Se agregó a Pendientes el tipo de evento "Amistoso".

**Archivos**: `Components/calendario/athlete-calendar.tsx`, `Components/equipo/team-stats-view.tsx`, `BITACORA.md`.
**Verificación**: `npm run build` sin errores; 56 pruebas correctas.

---

## 2026-11-04 · `claude/great-ritchie-2n8uq9` · nube → Planes de la cuenta de equipo y Finanzas en código

**Base de datos** (`supabase/team-plans-migration.sql`, aplicada)
- **Planes** `team_free`, `team_pro` y `team_elite`, con límites y funciones del Excel aprobado.
  - `platform_account_plan` y el canje de códigos ya distinguen la cuenta de equipo.
  - Funciones nuevas: `platform_team_plan`, `platform_team_limit` y `platform_team_feature`.
- **Triggers por plan** (se aplican a lo nuevo):
  - Divisiones (`team_division_catalog`), jugadores por división (`team_players`) y cuerpo técnico (`team_user_memberships`).
  - Eventos al mes, eventos repetidos y recordatorios (`team_calendar_events`: nuevas columnas `repeat_rule`, `repeat_until` y `reminder_minutes`).
  - Torneos rápidos del equipo y equipos por torneo.
- **Calendario**:
  - `calendar_save_team_event_v2` (con división, repetición y recordatorios) y `calendar_team_feed`.
  - `calendar_my_feed` repite los eventos de equipo.
  - Los recordatorios usan los minutos de cada evento.
  - `calendar_grant_event_edit` exige el plan Pro.
- **Temporada**: `teams.season_start` y `teams.season_end`, con `team_season` y `team_set_season`.
- **Finanzas**:
  - Tablas: tesoreros, cajas, categorías propias, movimientos, cuotas (montos y pagos), presupuestos con sus líneas, patrocinios y registro de cambios.
  - RLS: solo propietario, directivos y tesoreros; cada jugador ve solo su cuota. En Free, el historial se limita a 3 meses.
  - Bucket privado `team-finance` para comprobantes y contratos.
  - Triggers: 30 movimientos al mes en Free, comprobantes y categorías propias desde Pro, cuota por división, patrocinios, tesoreros (1, 2 o sin límite), presupuestos (1 en Free), jugadores con cuota (30 en Free), alerta de presupuesto al 90 % (Élite) y registro de cambios.
  - Recordatorio de cuota pendiente desde el día 5: tarea pg_cron `athlonx-fee-reminders`, todos los planes.
- **Lecturas**: `platform_team_usage`, `team_fee_board`, `team_season_stats`, `team_compare_seasons` y `team_finance_stats` (Pro; costo y comparativa en Élite).

**Pantallas**
- Menú del equipo: Estadísticas y Finanzas.
- `/finanzas`, cinco pestañas:
  - **Resumen**: indicadores del mes, saldo de la temporada, últimos movimientos, cajas con transferencias, tesoreros, reportes PDF/CSV, patrocinios con contrato y aviso de vencimiento, y cobro en línea "Próximamente".
  - **Movimientos**: filtros, tabla, eliminar con confirmación y registro de cambios (Élite).
  - **Cuotas**: tablero por mes con Pagado, Pendiente o Exento; al marcar Pagado se registra el ingreso. Cuota del equipo y por división (Pro). Interruptor del recordatorio.
  - **Presupuesto**: presupuestos con líneas por categoría, archivar y alertas (Élite).
  - **Estadísticas**: gráfico de 12 meses, gasto por categoría, ingreso por fuente, morosidad, proyección y, en Élite, costo por jugador y partido, y comparativa entre temporadas.
- `/estadisticas` (cuenta de equipo): partidos jugados, ganados, empatados y perdidos, y estadísticas por jugador de la temporada. Rango libre y comparar temporadas desde Pro. Asistencia por jugador "Próximamente". Reportes.
- Calendario de la cuenta de equipo: aviso de eventos del mes, división, repetir según el plan (Free: 1), recordatorios (Free fijo, Pro 5), sincronización y exportar (Pro), tarjeta de asistencia "Próximamente" y Conexiones.
- **Mi equipo**: tarjeta "Límites del plan". **Eventos**: tarjeta "Torneos del equipo".
- **Mi perfil**:
  - Divisiones con su medidor.
  - Tesoreros y Permisos de edición por evento en Roles.
  - Temporada en Configuración.
  - Plan actual y Mejorar plan con el catálogo de equipo.
  - Aviso "Equipo eliminado" al eliminar la cuenta.
- `/planes` muestra "Para equipos"; Promociones acepta `team_pro` y `team_elite`.

**Verificación**
- Prueba que se revierte, en Free: se bloquean la 2.ª división, el 11.º evento, el 2.º evento repetido, el 31.º movimiento, las categorías propias, los patrocinios y el 2.º presupuesto. Los recordatorios quedan en `{240}`.
- Como Élite (simulando al dueño): estadísticas de finanzas y registro de cambios correctos.
- `npm run build` sin errores; 56 pruebas correctas (3 nuevas en `tests/team-finance.test.mjs`).
- No se probó en navegador: falta una cuenta de equipo real.

**Pendiente**: ver la sección Pendientes.

---

## 2026-11-04 · `claude/great-ritchie-2n8uq9` · nube → Figma: cuenta de equipo por plan (Free, Pro, Élite), con Finanzas

**Excel aprobado**: `documentos/PLANES_EQUIPO_APROBADO.xlsx` (marcado por Edwin).

**Decisiones del Excel y de sus respuestas**
- **Free**:
  - 1 división de hasta 25 jugadores; 5 personas en cuerpo técnico y directiva.
  - 1 torneo rápido activo con hasta 8 equipos.
  - 10 eventos al mes y 1 evento repetido; recordatorio fijo de 4 horas.
  - Estadísticas de la temporada actual.
- **Pro**:
  - 3 divisiones de hasta 60 jugadores; 15 personas en cuerpo técnico y directiva.
  - 1 torneo rápido activo.
  - Repetir eventos, sincronización, permisos de edición por evento y comparar temporadas.
  - Reportes PDF/CSV con el logotipo del equipo.
- **Élite**: todo sin límite.
- **Temporada**: la define el equipo en Mi perfil › Configuración (inicio y fin; por defecto, enero a diciembre).
- **Asistencia por jugador**: queda "Próximamente" porque Edwin quiere un sistema de asistencia dentro de la cancha.
- **Permisos de edición por evento**: para personas con permiso de staff, aunque no tengan el perfil de staff.
- **Finanzas**: "tenemos que discutirlo mejor"; se diseñó con sus notas para revisarla viendo las pantallas.
  - Free: 30 movimientos al mes, categorías base, historial de 3 meses, cuotas de hasta 30 jugadores, recordatorio de cuota pendiente y varias cajas. 1 presupuesto activo (supuesto mío, a confirmar).
  - Desde Pro: comprobantes, categorías propias, cuota por división, presupuestos sin límite, estadísticas (ingresos contra gastos, gasto por categoría, morosidad, proyección), patrocinios y reportes con logotipo.
  - Solo en Élite: costo por jugador y por partido, comparativa entre temporadas, alertas de presupuesto y registro de cambios.
  - Tesoreros: Free 1, Pro 2, Élite sin límite.
  - Cobro en línea: "Próximamente" en todos los planes.

**Qué se hizo en Figma** (página REDISEÑO)
- Comparación de la cuenta de equipo debajo de la de organización, con rótulos `Equipo · Rótulo · …`.
  - Oscuro desde y=70000 (Free 70000, Pro 72000, Élite 74000).
  - Claro desde y=77000.
- 19 pantallas por plan: Búsqueda, Notificaciones, Mi equipo (con Límites del plan), Eventos (con Torneos del equipo), Calendario, Nuevo evento, Estadísticas, Finanzas (Resumen, Movimientos, Cuotas, Presupuesto, Estadísticas), Información del equipo, Roles (Tesoreros y permisos por evento), Configuración (Temporada), Seguridad, Cuenta (aviso "Equipo eliminado"), Mejorar plan y Código.
- En total, 114 marcos con nombres `Equipo · <plan> · <sección>[ · Claro]`.
- Prototipo con 1356 enlaces: menú, menú del perfil, "Vista del plan", pestañas de Finanzas, Mejorar plan, Comprar, Crear evento y Nuevo movimiento.
- Ajustes en modo claro:
  - Los marcos de equipo usan el modo "Claro" de las variables.
  - Las tarjetas blancas heredadas toman el tono del panel.
  - Los iconos inactivos del menú se oscurecieron, también en los marcos de organización en claro.
- Menú del equipo: Búsqueda, Notificaciones, Mi equipo, Eventos, Calendario, Estadísticas y Finanzas (icono de billetera).

**Verificación**: capturas de cada tipo de pantalla en oscuro y en claro.
**Pendiente**: que Edwin apruebe el diseño; luego pasarlo a código, con límites en la base de datos como en organización.

---

## 2026-11-04 · `claude/great-ritchie-2n8uq9` · nube → Excel de planes de la cuenta de equipo (con Finanzas)

**Qué se hizo**: propuesta `documentos/PLANES_EQUIPO_PROPUESTA.xlsx`, con el mismo formato que el Excel de organización: columnas Free, Pro y Élite, y "APRO/RECHA" con lista desplegable. Tiene cuatro hojas:
- **Planes equipo**: 49 filas por plan. Las de Finanzas van en amarillo.
- **Finanzas · detalle**: 25 filas sobre qué muestra cada pantalla de Finanzas y en qué plan (Resumen, Movimientos, Cuotas, Presupuesto, Estadísticas, Cajas, Patrocinios, Reportes, Permisos, Auditoría).
- **Precios**: Free gratis; Pro y Élite por definir.
- **Secciones**.

**Verificación**: el archivo se generó con openpyxl.
**Pendiente**: que Edwin lo apruebe; luego el diseño en Figma (REDISEÑO) por plan y después el código.

---

## 2026-11-04 · `claude/great-ritchie-2n8uq9` · nube → Secciones de organización según Figma, separadas por plan

**Qué se hizo**
- **Organización** (`/organizaciones`), con el diseño aprobado:
  - Jerarquía organizacional con el mapa por niveles y la invitación inline.
  - Personas de la organización con el medidor de directivos y staff. En Free, al llegar al límite, aparece "Llegaste al límite del plan Free" con "Mejorar plan" y la invitación se desactiva.
- **Equipos** (`/equipos`, cuenta de organización), con pestañas Equipos y Torneos:
  - Límites del plan.
  - Equipos propios, afiliados directamente y de organizaciones vinculadas.
  - "+ Crear equipo" crea un equipo propio (`org_create_team`); el límite del plan lo aplica el trigger.
  - Asistencia resumida por equipo y reportes PDF/CSV: bloqueados en Free; desde Pro funcionan (Élite pone el logotipo de la organización en el PDF).
- **Torneos** (`/equipos?vista=torneos`):
  - Torneos rápidos con su límite y su lista.
  - Torneos oficiales: bloqueados en Free; con límite en Pro; sin límite en Élite.
  - Formato liga: en Pro, ligas activas en torneos rápidos y en oficiales.
  - Patrocinios en Élite: agregar y quitar.
  - Reportes.
  - "+ Crear torneo" abre el formulario de Eventos (`/eventos?crear=1`).
- **Calendario de organización**:
  - Pro: "Exportar PDF / CSV", filtro "Todos los equipos" y tarjeta "Choques de cancha y horario" (`findClashes`).
  - Free: chip "Todos los equipos · Pro" y tarjetas bloqueadas.
  - Conexiones según el plan.
  - Editor:
    - Calendario: Organización o un equipo (`calendar_org_save_team_event`).
    - Repetir: bloqueado en Free; en Pro se elige.
    - Recordatorios: 4 horas fijo en Free; hasta 5 en Pro; sin límite en Élite.
    - Sincronizar: bloqueado en Free.
    - Aviso "te quedan X de Y eventos".
- **Base de datos** (`supabase/organization-sections-migration.sql`, aplicada):
  - Eventos de organización: nuevas columnas `repeat_rule`, `repeat_until` y `reminder_minutes`. El trigger `enforce_org_event_features` aplica el plan.
  - Feed con repeticiones y equipos editables desde la organización.
  - `calendar_send_due_reminders` usa los minutos y las repeticiones de cada evento de organización.
  - Funciones nuevas: `platform_org_teams`, `platform_org_tournaments`, `org_create_team`, `org_team_attendance_summary`, `calendar_org_save_team_event` y `calendar_org_delete_team_event`.
  - Tabla `organization_sponsors`, con RLS solo para Élite.
- Tokens nuevos `--ax-info-*` y `--ax-violet-*` (chips Afiliado y Vinculado), en oscuro y claro.

**Archivos clave**: `Components/organizacion/plan-ui.tsx`, `org-teams-view.tsx`, `org-tournaments-view.tsx`, `Components/organization-hierarchy-panel.tsx`, `Components/organization-direct-people-panel.tsx`, `app/(panel)/organizaciones/page.tsx`, `app/(panel)/equipos/page.tsx`, `Components/calendario/athlete-calendar.tsx`, `lib/athlete-calendar.ts`, `app/(panel)/eventos/page.tsx`, `app/globals.css`.

**Verificación**
- Prueba que se revierte en la base: en Free, los recordatorios quedan en `{240}`, repetir se bloquea con el mensaje del plan y el recordatorio se envía.
- Las consultas de equipos y torneos corren sin errores. Hoy no hay equipos ligados a organizaciones, así que devuelven listas vacías.
- `npm run build` sin errores; 53 pruebas correctas (2 nuevas: filtro de equipos y choques).
- No se probó en navegador: falta iniciar sesión con una cuenta de organización.

**Pendiente**: patrocinios en la página pública del torneo, sincronización real, versión móvil revisada contra Figma.

---

## 2026-11-04 · `claude/great-ritchie-2n8uq9` · nube → Figma: pantalla Organización de la cuenta de organización

**Qué se hizo** (solo Figma, página REDISEÑO; espera aprobación)
- En el menú del diseño, "Organización" abría "Información general" de Mi perfil: faltaba la pantalla de la sección. Se agregó una columna nueva en x=23100: `Org · Free/Pro/Élite · Organización`, en oscuro y en claro (`… · Claro`).
- La pantalla tiene dos tarjetas:
  - **Jerarquía organizacional**: mapa de autoridad por niveles y el panel inline "Invitar organización bajo esta autoridad".
  - **Personas de la organización**: medidor "Directivos y staff" (Free 2 de 2 con "Llegaste al límite del plan Free" y "Mejorar plan"; Pro 4 de 10; Élite sin límite), buscador, "Enviar invitación" y la lista de vinculaciones directas.
- Prototipo (74 enlaces): menú, "Vista del plan", "Agregar equipo" lleva a Equipos y "Mejorar plan" a la vista de planes. "Organización" del menú en todas las pantallas de organización abre la nueva pantalla.
- Se quitó el chip "PRONTO" de Participantes en las pantallas Free. Participantes Free dice "Disponible en Pro", igual que en código.

**Estado del código frente a Figma**: Búsqueda, Eventos, Mi perfil, Calendario y Participantes ya usan el rediseño (`.ax-v2`). Organización, Equipos y Torneos siguen con el diseño anterior.

**Pendiente**: aprobación de Edwin; luego pasar a código Organización, Equipos y Torneos según Figma, separados por plan.

---

## 2026-11-04 · `claude/great-ritchie-2n8uq9` · nube → Calendario y Participantes de la organización

**Qué se hizo**
- Calendario: en la cuenta de organización salía "Próximamente" porque `TeamCalendarView` era solo un aviso; nunca se conectó. Ahora la organización usa el mismo calendario del rediseño (`AthleteCalendar` con la prop `organization`):
  - Crea, edita y elimina eventos en `organization_calendar_events`. El límite de eventos al mes lo sigue aplicando el trigger.
  - Muestra el aviso "Plan X: N de M eventos de la organización este mes" con "Mejorar plan".
  - Sin asistencia propia ni filtro Personales.
  - Repetir y sincronizar aparecen como "parte del plan Pro" (o "llegará pronto" en Pro).
  - Las cuentas de equipo también pasan al calendario nuevo.
- Nueva función `calendar_org_feed(p_org, p_from, p_to)`: eventos de la organización y, si el plan tiene `vista_equipos` (Pro y Élite), los de sus equipos en solo lectura.
- Participantes: el menú ya no dice "Pronto".
  - Free: tarjeta "Disponible en Pro" con "Mejorar plan".
  - Pro y Élite: filtros por rol y tabla Nombre, Rol, Equipo y Estado, a partir de `platform_org_participants`.
- "Mejorar plan" ahora abre directamente la vista de planes en Mi perfil → Cuenta (`?mejorar=1`, que se quita de la URL al usarse).

**Archivos clave**: `supabase/organization-calendar-feed-migration.sql` (aplicada), `Components/calendario/athlete-calendar.tsx`, `app/(panel)/calendario/page.tsx`, `app/(panel)/participantes/page.tsx`, `Components/dashboard-sidebar.tsx`, `Components/mi-perfil/plan-card.tsx`, `Components/mi-perfil/org-plan-limits.tsx`.

**Verificación**
- La migración se aplicó; authenticated tiene permiso y anon no. La consulta interna se probó en solo lectura.
- `npm run build` sin errores; 51 pruebas correctas.
- No se probó en navegador: hace falta iniciar sesión con una cuenta de organización.

**Pendiente**: asistencia resumida por equipo, reportes, patrocinios, y repetir/sincronizar eventos de organización.

---

## 2026-11-04 · `claude/great-ritchie-2n8uq9` · nube → Participantes de organización: función de base de datos

**Qué se hizo**: nueva función `platform_org_participants(p_org)`. Devuelve nombre, rol, equipo, organización afiliada ("vía …") y estado de las personas de la organización y de sus equipos, sin datos de contacto. Solo responde a quien gestiona la organización y solo si el plan incluye `participantes` (Pro y Élite).
**Archivos**: `supabase/organization-participants-migration.sql` (aplicada en `mlvtsgseneqzihwkiatg`).
**Verificación**: existían las funciones de las que depende; la función quedó creada con permiso para authenticated y sin permiso para anon; la consulta interna se probó en solo lectura.
**Pendiente**: la pantalla `/participantes` (Free: tarjeta bloqueada con "Mejorar plan"; Pro y Élite: lista con filtros por rol) y quitar "Pronto" del menú de organización.

---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Planes de la cuenta de organización en código

**Qué se hizo**
- El catálogo de planes ahora distingue tipo de cuenta (`account_type`: persona, equipo, organizacion) y guarda `limits`, `feature_flags` y `price_pending` ("Precio por definir").
- Nuevos planes `org_free`, `org_pro` y `org_elite` con los límites del Excel aprobado. Free: 3 equipos afiliados, 3 propios, 2 directivos/staff, 5 eventos al mes, 1 torneo rápido, sin oficiales. Pro: 15 / 15 / 10 / 30 / 5 rápidos / 3 oficiales. Élite: sin límite.
- Los límites se aplican en la base de datos con triggers (`enforce_org_event_limit`, `enforce_org_tournament_limit`, `enforce_org_staff_limit`, `enforce_org_invite_limit`, `enforce_org_team_limit`), así que no se pueden saltar desde la UI. Los equipos temporales no cuentan.
- `platform_account_plan` y `platform_redeem_plan_code` respetan el tipo de cuenta; un plan con precio por definir solo se activa con un código al 100%.
- `platform_org_usage(p_org)` devuelve plan, límites y uso actual.
- Mi perfil de organización: "Plan actual" y "Mejorar plan" muestran los planes de organización; en Equipos aparece la tarjeta "Límites del plan" con medidores de uso.
- `/planes` agrupa los planes en "Para personas", "Para organizaciones" y "AX Club". El panel admin muestra el tipo de cuenta en Planes, y Promociones permite códigos para `org_pro` y `org_elite`.

**Archivos clave**: `supabase/organization-plans-migration.sql`, `supabase/organization-usage-migration.sql`, `lib/account-plans.ts`, `Components/mi-perfil/plan-card.tsx`, `Components/mi-perfil/org-plan-limits.tsx`, `Components/mi-perfil/organization-profile-view.tsx`, `app/planes/page.tsx`, `app/(admin)/panel-admin/planes/page.tsx`, `app/(admin)/panel-admin/promociones/page.tsx`.

**Verificación**
- Las dos migraciones se aplicaron al proyecto `mlvtsgseneqzihwkiatg` y se comprobaron con consultas de solo lectura.
- Prueba de triggers en un bloque DO que se revierte (organización "Liga demo"): se crearon 5 eventos, el 6.º se bloqueó con el mensaje del plan Free, y el torneo oficial también se bloqueó. No quedaron datos de prueba.
- `npm run build` sin errores; `node --test tests/*.mjs` dio 51 pruebas correctas.

**Nota**: "Liga Panameña de rugby III Fecha" ya tenía 1 torneo oficial activo y 1 rápido estando en Free. Siguen funcionando, pero no puede crear torneos oficiales nuevos hasta subir de plan.

**Pendiente**: ver la sección Pendientes (pantallas de organización que faltan, repetición y sincronización, edición de límites desde el panel, planes de equipo).

---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Calendario del atleta con el diseño de Figma

**Problema**: la pantalla no coincidía con Figma y parte de la cuadrícula quedaba debajo del menú lateral. El calendario no usaba el contenedor que usan las demás páginas (`main.ax-v2 lg:ml-64`, 1184 px).

**Cambios** (`Components/calendario/athlete-calendar.tsx`):
- Contenedor igual al de las demás páginas del panel.
- Título blanco; selector de vistas con radio 9 y color lima en la vista activa; navegación con "Noviembre 2026".
- Chips de filtro en píldora con punto de color por tipo, incluidos Torneos y Convocatorias.
- Cuadrícula de 115×112 con eventos tintados por tipo, y panel derecho de 300 px con "Próximo partido" y "Próximas actividades".

**Pendiente de diseño**: Torneos y Convocatorias no tienen eventos en el calendario todavía, así que esos filtros aparecen vacíos.

**Verificación**: `npm run build` compila con verificación de tipos; `node --test tests/*.mjs` pasa 51 pruebas. No comparado visualmente con Figma.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Figma: textos legibles en el modo claro de organización

**Problema**: en las pantallas claras de organización muchos textos no se leían. Venían de componentes cuyos colores están vinculados a variables del tema oscuro: al cambiar el color, el vínculo seguía activo y Figma mostraba el color de la variable.

**Corrección**: en las 45 pantallas "Org · … · Claro" se quitaron 1916 vínculos a variables oscuras y se recolorearon 1161 textos. Revisión posterior: 0 textos claros sobre fondo claro y 0 colores vinculados. Las pantallas claras del calendario, Sugerencias y panel administrativo ya estaban limpias.

---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Figma: correcciones y modo claro de la cuenta de organización

**Correcciones en las pantallas oscuras**:
- Reportes PDF y CSV desde Pro: tarjetas de Equipos y Torneos, y botón "Exportar" en Calendario y Equipos de Pro. Logotipo en reportes, solo Élite.
- Eliminar cuenta en los tres planes, con el aviso: se borran el perfil y los datos; los torneos y eventos compartidos con otras instituciones o equipos quedan con el organizador "Organización eliminada"; 15 días para recuperarla.
- Formato liga: Free en su torneo rápido activo; Pro con 5 ligas activas en rápidos y 3 en oficiales; Élite sin límite. Listas de Mejorar plan actualizadas.

**Modo claro**: 45 pantallas nuevas debajo de las oscuras ("Org · <plan> · <sección> · Claro"), con la paleta del modo claro aprobado (fondo #f4f6f8, contenedores #e1e8f0, líneas #c5d2de), logo claro y textos de color oscurecidos. Prototipo cableado por nombre: 522 enlaces, ninguno hacia pantallas oscuras.

**Verificación**: comprobado por código el número de pantallas y de enlaces. No se pudo ver el render.

---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Figma: cuenta de organización por plan (Free, Pro y Élite)

**Qué se hizo**: en Figma, página REDISEÑO, área "CUENTA DE ORGANIZACIÓN · COMPARACIÓN DE PLANES" (debajo de todo lo existente, desde y = 56000). Tres filas (Free, Pro y Élite) con las mismas 15 pantallas en modo oscuro, escritorio: Búsqueda, Notificaciones, Información general, Equipos y roles, Configuración, Seguridad, Cuenta, Mejorar plan, Mejorar plan con código, Eventos, Calendario, Nuevo evento, Equipos, Torneos y Participantes. Se reutilizaron las pantallas existentes de organización y su menú.

**Contenido según el Excel aprobado** (`PLANES_ORGANIZACION_PROPUESTA - copia.xlsx`): límites de equipos afiliados, directivos y staff, equipos propios, eventos al mes, torneos rápidos y oficiales; estructura de equipos (propios, afiliados directos y de organizaciones vinculadas); funciones bloqueadas con su plan y botón "Mejorar plan".

**Prototipo**: 525 enlaces. Menú lateral principal y de perfil, selector "Vista del plan" (misma pantalla en otro plan), Mejorar plan, Comprar, Aplicar código (lleva a la Cuenta del plan siguiente), Crear, Guardar y Cancelar evento, pestañas Equipos y Torneos, Ver calendario y barra superior.

**Verificación**: estructura revisada por código: 45 pantallas de 1440 px, sin elementos fuera del contenido ni solapes entre filas. No se pudo ver el render (las capturas de Figma están bloqueadas en este entorno).

**Pendiente**: modo claro y responsive después de la revisión; puntos del Excel por confirmar (ver Pendientes).

---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Calendario de gestión para coach, staff y directivo

**Reglas confirmadas**:
- Coach (entrenador) y directivo: crean y editan eventos de su equipo, y ven la asistencia por jugador.
- Staff: crea eventos y cambia lugar, hora y datos logísticos solo en eventos donde tenga permiso (creados por él o con permiso otorgado). No ve la asistencia por jugador.
- Reporte de asistencia por jugador y vista de todos los equipos de la organización: solo Pro o Élite.
- Planes individuales por ahora (ver Pendientes).

**Migraciones aplicadas** (verificado en solo lectura):
- `supabase/team-calendar-roles-migration.sql`: tabla `calendar_event_grants` y funciones `calendar_team_role`, `calendar_can_edit_team_event`, `calendar_save_team_event`, `calendar_delete_team_event`, `calendar_grant_event_edit`, `calendar_team_attendance` (sin staff), `calendar_team_attendance_report` y `calendar_org_overview`.
- `supabase/calendar-feed-can-edit-migration.sql`: `calendar_my_feed` indica `can_edit` en cada evento.

**Pantalla** (`Components/calendario/athlete-calendar.tsx`): quien tiene un rol de gestión en un equipo elige "Calendario" (Personal o su equipo) y "Tipo de evento" al crear. Puede editar y eliminar eventos de equipo cuando tiene permiso. El coach, el directivo y el dueño ven la asistencia por jugador en el detalle del evento.

**Pendiente en pantalla**: reporte de asistencia por jugador (Pro) y vista de la organización (Pro); ambos tienen su base de datos lista.

**Verificación**: `npm run build` compila con verificación de tipos; `node --test tests/*.mjs` pasa 51 pruebas. No probado en navegador.

---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Título directo en los chips del calendario

**Cambio**: en la cuadrícula del mes, cada evento muestra su título; la hora queda en el texto emergente al pasar el cursor.

**Verificación**: `npm run build` compila con verificación de tipos. No probado en navegador.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Menú: Calendario habilitado

**Problema**: en el menú lateral, Calendario aparecía deshabilitado con la etiqueta "Pronto", así que no se podía entrar.

**Cambio**: `Components/dashboard-sidebar.tsx` quita la marca de deshabilitado de Calendario en los cinco menús y la condición que lo forzaba a estar deshabilitado.

**Verificación**: `npm run build` compila. No probado en navegador.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Calendario del atleta (cuenta personal)

**Qué se hizo**:
- `/calendario` muestra el calendario del atleta cuando la cuenta activa es personal, y el calendario de gestión de equipo u organización en los demás casos (`app/(panel)/calendario/page.tsx`). El calendario de gestión se movió sin cambios a `Components/calendario/team-calendar-view.tsx`.
- Vistas Mes, Semana, Día, Agenda y Línea de tiempo; filtros Todos, Partidos, Entrenamientos, Personales y Organización.
- Detalle de evento. En eventos de equipo y organización: asistencia Voy, Tal vez, No voy. En actividades personales: editar y eliminar.
- Crear y editar actividades personales. Libre: 5 al mes contadas por mes calendario, sin repetición y con recordatorio de 4 horas. Pro y Élite: ilimitadas, repetición semanal o mensual, y recordatorios entre 15 minutos, 30 minutos, 1 hora, 4 horas y 1 día.
- Recordatorios automáticos cada 15 minutos: 4 horas antes para eventos de equipo y organización; los minutos elegidos para actividades personales, también en repeticiones.
- Los cambios en eventos de equipo y organización ya notificaban a los miembros (triggers existentes); no se duplicaron.

**Migración aplicada**: `supabase/athlete-calendar-migration.sql`. Crea `personal_activities`, `calendar_attendance` y `calendar_reminders_sent`, las funciones `calendar_*` y el trabajo de pg_cron `athlonx-calendar-reminders`. Verificado en solo lectura: tablas, funciones y trabajo existen.

**Lógica pura**: `lib/athlete-calendar.ts`, con pruebas en `tests/athlete-calendar.test.mjs` (5 pruebas).

**Verificación**: `npm run build` compila (incluye verificación de tipos); `node --test tests/*.mjs` pasa todas las pruebas. No probado en navegador.

**Pendiente**:
- Sincronización con Google Calendar y Outlook (Pro): requiere crear las credenciales de Google y Microsoft. Los botones de Conexiones están deshabilitados.
- Lista de preparación del diseño: no hay datos de preparación todavía.
- Recordatorios personalizados para eventos de equipo y organización en Pro: hoy todos reciben 4 horas antes.
- Perfiles coach, staff y directivo: hoy ven la misma vista personal; su calendario de gestión queda para después.
- Versión móvil y modo claro: verificar contra el diseño.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Código promocional al pulsar Comprar

**Qué se hizo**: la tarjeta de código promocional aparece solo al pulsar Comprar en un plan. Su título dice el plan elegido ("Código promocional para Pro") y la pantalla se desplaza hasta ella. Cancelar la oculta.

**Verificación**: `npm run build` compila (incluye verificación de tipos); `node --test tests/*.mjs` pasa 46 pruebas. No probado en navegador.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Lectura del catálogo de planes

**Problema**: al pulsar Mejorar plan aparecía "permission denied for table plans". La tabla `plans` tenía la política RLS de lectura pública, pero ningún permiso de tabla para `anon` ni `authenticated`.

**Migración aplicada**: `supabase/plans-read-grant-migration.sql` da `SELECT` a `anon` y `authenticated`. RLS sigue limitando la lectura a los planes activos. Verificado en solo lectura en `pg_class.relacl`.

**Pendiente**: probar Mejorar plan en el navegador con la cuenta de persona.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Plan actual y Mejorar plan según el diseño aprobado

**Qué se hizo**: `Components/mi-perfil/plan-card.tsx` se reescribió para seguir el diseño aprobado en REDISEÑO. Plan actual: nombre del plan y botón Mejorar plan en una fila, y debajo precio, límite y vencimiento. Mejorar plan: botón "← Volver a cuenta", tres tarjetas independientes (Libre, Pro, Élite) y tarjeta de código promocional a ancho completo, con el botón Aplicar código debajo del campo.

**Limitación**: el encabezado de la página (que en Figma dice "Mejorar plan") no se cambia; dentro de la tarjeta aparece el mismo título.

**Verificación**: `npm run build` compila (incluye verificación de tipos); `node --test tests/*.mjs` pasa 46 pruebas. No probado en navegador.

**Pendiente**: versión en modo claro del diseño aprobado.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Plan actual y canje de códigos en Mi perfil

**Qué se hizo**:
- **Plan actual** en la sección Cuenta de persona, equipo y organización. Muestra el plan (Libre si no hay uno), precio, límite de actividades personales y vencimiento.
- **Mejorar plan**: muestra Libre, Pro y Élite. Al comprar, aparece el campo de código promocional.
- Sin pasarela: un código solo activa el plan si deja el precio en US$ 0. Si el precio final es mayor, el código se valida pero no activa nada, con el mensaje "El pago aún no está disponible".
- El límite de Libre (5 actividades personales al mes) está en el plan; su aplicación en el calendario queda para la siguiente etapa.

**Migración aplicada**: `supabase/account-plan-redeem-migration.sql` crea `platform_can_manage_account`, `platform_account_plan` y `platform_redeem_plan_code`. Verificado en solo lectura que las tres existen y son `security definer`. Propiedad de la cuenta: persona = el propio usuario; equipo y organización = quien la creó.

**Figma**: en REDISEÑO, pantalla "Mi perfil · Cuenta · Escritorio · Oscuro" se agregó la tarjeta Plan actual; nueva pantalla "Mi perfil · Cuenta · Mejorar plan · Escritorio · Oscuro" con los tres planes y el campo de código.

**Verificación**: `npm run build` compila; `node --test tests/*.mjs` pasa 46 pruebas. No probado en navegador ni con códigos reales.

**Pendiente**: pantalla en modo claro de Plan actual y Mejorar plan; aplicar el límite de Libre en el calendario; pasarela de pago.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Eliminar la cuenta de AthlonX desde el panel

**Qué se hizo**: en Equipo y roles, el botón "Eliminar cuenta" elimina la cuenta de AthlonX del miembro, no solo su acceso al panel. Pide confirmación con advertencia y exige escribir el correo de la cuenta. La eliminación usa el mecanismo que ya tiene el proyecto: plazo de 15 días, recuperable si la persona inicia sesión antes, y borrado definitivo por el proceso automático cada hora. La cuenta sale del panel de inmediato y sus sesiones se cierran.

**Reglas**: propietario a administradores y colaboradores; administrador solo a colaboradores; nadie al propietario. Las cuentas de organización no se eliminan.

**Migración aplicada**: `supabase/staff-account-deletion-migration.sql` crea `platform_schedule_staff_account_deletion`. Verificado en solo lectura: la función existe y es `security definer`. Antes se verificó que existen la columna `deletion_scheduled_at`, las tres funciones de eliminación y el trabajo automático `athlonx-purge-expired-account-deletions`.

**Verificación**: `npm run build` compila; `node --test tests/*.mjs` pasa 46 pruebas. No probado en navegador.

**Pendiente**: probar el flujo completo con una cuenta de prueba, incluida la recuperación al iniciar sesión dentro del plazo.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Contraseña temporal y quitar del panel

**Qué se hizo**:
- **Contraseña temporal**: al agregar una cuenta, o con el botón "Contraseña temporal" de cada fila, el panel genera una contraseña. Se muestra en un campo que se copia con un clic. Al generarla se cierran las sesiones abiertas de esa cuenta.
- **Cambio obligatorio**: la cuenta con contraseña temporal entra a `/cambiar-contrasena`, define la suya y recién después accede al panel. El panel la redirige ahí mientras la marca siga activa.
- **Quitar del panel**: borra el rol y los permisos de la cuenta, con confirmación en línea. La cuenta de AthlonX no se borra.

**Migración aplicada**: `supabase/staff-temporary-password-migration.sql`. Agrega `must_change_password` y `temp_password_hash` a `platform_staff`; actualiza `platform_my_access`; crea `platform_reset_staff_password`, `platform_finish_password_change` y `platform_remove_staff`. Verificado en solo lectura: columnas y funciones existen.

**Reglas**: propietario a administradores y colaboradores; administrador solo a colaboradores; nadie al propietario.

**Verificación**: `npm run build` compila; `node --test tests/*.mjs` pasa 46 pruebas. No probado en navegador ni con sesiones reales de cada rol.

**Pendiente**: probar el flujo completo (generar, ingresar con la temporal, cambiarla y entrar); decidir si hace falta borrar la cuenta de AthlonX por completo, que hoy no se hace.
---

## 2026-11-03 · `claude/great-ritchie-2n8uq9` · nube → Novedades públicas desde el panel

**Qué se hizo**: la página pública `/novedades` muestra las versiones publicadas desde el panel (código, título, fecha y secciones con título y párrafo). Vuelve a aparecer en el menú y el pie, después de Planes.

**Migración aplicada**: `supabase/public-novedades-migration.sql` crea `platform_public_releases()`, que solo devuelve versiones con estado `publicada`. Las tablas de novedades siguen cerradas al público. Verificado en solo lectura: la función es `security definer` y tiene permiso de ejecución para `anon` y `authenticated`.

**Dato a revisar**: hoy hay una sola versión publicada (`v2.5.0`, título "ñaohf"), que parece texto de prueba.

**Verificación**: `npm run build` compila y genera `/novedades`. No probado en navegador.

**Pendiente**: revisar el contenido publicado; decidir si se suman avisos o filtros por categoría.

---

## 2026-11-02 · `claude/great-ritchie-2n8uq9` · nube → Panel administrativo de la plataforma

**Qué se hizo**:
- **Roles del panel**: propietario (una sola cuenta, sembrada para ed.jimenez0012@gmail.com), administrador y colaborador. El administrador crea colaboradores; el propietario crea administradores y colaboradores; nadie crea otro propietario. El colaborador solo ve las secciones que el propietario o un administrador le asignen.
- **Inicio de sesión**: si la cuenta tiene rol en el panel, entra a `/panel-admin`; si no, a `/busqueda`.
- **Secciones del panel** (`/panel-admin`): Ingresos, Cuentas (personas, equipos, organizaciones y planes, sin datos personales), Planes (editar precios, anual, cupos, límite de actividades personales y funciones), Novedades (versión, código y secciones con título y párrafo), Promociones (porcentaje o monto fijo, planes, usos, vencimiento y pausa), Sugerencias (solo visualización) y Equipo y roles (altas, activar o desactivar, permisos del colaborador).
- **Público**: se eliminó Novedades (página, componente, menú y pie). Se agregó **Planes** junto a Nosotros, con los planes leídos de la base de datos.
- **Eliminado**: la tabla `platform_updates` y `platform_update_admins` (0 filas verificadas antes).
- **Precios**: se sembraron los del documento de planes (Libre $0, Pro $4.99 / anual $47.90, Élite $9.99 / anual $95.90, Club Pro $14.99, Club Élite $29.99). Los planes de grupo no tienen pago anual.

**Migraciones aplicadas** en `mlvtsgseneqzihwkiatg` (en orden, vía API de Management):
- `supabase/admin-panel-roles-migration.sql`: `platform_staff`, `platform_staff_permissions`, funciones de rol, permiso y gestión del equipo.
- `supabase/plans-catalog-migration.sql`: `plans` (con 5 planes sembrados), `account_plans`, y funciones de catálogo, estadísticas e ingresos.
- `supabase/promo-codes-migration.sql`: `promo_codes` y funciones de alta y lista.
- `supabase/release-notes-suggestions-migration.sql`: `release_notes`, `release_note_sections`, `suggestions` y funciones de novedades, envío y bandeja de sugerencias.
- `supabase/remove-novedades-legacy-migration.sql`: elimina las tablas viejas de novedades.

**Archivos clave**: `lib/admin.ts` (reglas y validaciones), `Components/admin/admin-shell.tsx` (guardia y menú), `app/(admin)/panel-admin/*`, `app/planes/page.tsx`, `Components/auth-panel.tsx` (redirección por rol), `Components/menu.tsx`, `Components/site-footer.tsx`, `Components/site-chrome.tsx`.

**Verificación**:
- `node --test tests/*.mjs`: 46 pruebas pasan (incluye 6 nuevas de `tests/admin-panel.test.mjs`).
- `npm run build`: compila y pasa el chequeo de tipos. Se borró `.next/dev` generado, que tenía tipos de rutas eliminadas (no estaba versionada).
- Base de datos (solo lectura): tablas con RLS activo, 5 planes con los precios esperados, propietario sembrado, 17 funciones `platform_*`, tablas viejas eliminadas.
- **No verificado**: las reglas por sesión (qué ve cada rol) no se pudieron probar en la base de datos, porque el rol de la API no puede simular usuarios. No se probó en navegador con cuentas reales.

**Pendiente**:
- Probar con cuentas reales: propietario, administrador, colaborador con y sin permisos, y una cuenta sin rol.
- Formulario de **Sugerencias** para los usuarios (la función `platform_submit_suggestion` ya existe).
- Sección de **Planes en la página de inicio**. Por ahora solo está en el menú.
- Novedades públicas: la sección pública se eliminó; el panel ya las administra. Falta decidir dónde se muestran.
- Ingresos sin histórico mensual: no hay datos de suscripciones todavía; las bajas no se registran.
- Versión móvil del panel.
- Precios del documento: se siembran como propuesta; confirmar antes de publicar.

---

## 2026-10-31 · `edwin` · nube → La prórroga de básquet no finaliza sola

**Problema**: en la prórroga, al llegar a 2 puntos de diferencia el partido finalizaba automáticamente. Debe ser muerte súbita: el organizador decide cuándo finalizar.

**Cambios**:
- Servidor (aplicado en Supabase con `supabase/basketball-no-auto-finish-migration.sql`): la acción `event` ya no finaliza el partido al llegar a 2 puntos. Verificado con consulta de solo lectura que el cierre automático ya no está en la función.
- Interfaz: en la prórroga, con 2 o más puntos de diferencia, aparece el aviso "Hay 2 puntos de diferencia. En prórroga (muerte súbita) se recomienda finalizar el partido." y el botón "Finalizar partido" (acción `finish`).

**Pendiente**: el partido Falcones – Gladiadores de "BAS" quedó finalizado con el cierre automático (3–0). Para reanudarlo habría que revertir su estado; no se hizo.

**Verificación**: `npm run build` OK. No probado en navegador.

## 2026-10-31 · `edwin` · nube → "Finalizar tiempo" también en la prórroga de básquet

**Cambio**: durante la prórroga, con el reloj corriendo, aparece "Finalizar tiempo". Termina el bloque actual: el reloj vuelve a 00:00 y queda detenido; al reanudar empieza el siguiente bloque. El partido solo termina cuando hay 2 puntos de ventaja, como antes.

**Servidor** (aplicado en Supabase con `supabase/basketball-end-block-migration.sql`): nueva acción `end_block` en `basketball_match_action`. Verificado con consulta de solo lectura que la acción existe en la función.

**Verificación**: `npm run build` OK. No probado en navegador.

## 2026-11-02 · `edwin` · nube → Esqueleto del documento PERSONA (Atleta)

**Qué se hizo**: `documentos/persona-atleta.docx` con el título PERSONA, el subtítulo (Atleta) y las secciones "Permitido" y "No permitido", sin contenido todavía. El usuario va a definir los puntos.

**Contexto**: el documento de planes se divide por tipo de cuenta. Primero la cuenta PERSONA (una persona puede ser atleta, entrenador, staff o directivo); por ahora solo el perfil de atleta. Después vendrán el plan gratuito de equipos y el de organizaciones.

**Verificación**: convertido a PDF y revisado la página.

**Pendiente**: el usuario completa las secciones Permitido y No permitido.

## 2026-11-01 · `edwin` · nube → Propuesta de planes, funcionalidades y precios

**Qué se hizo**: análisis del proyecto (README, pantallas y las 62 tablas de Supabase con su uso actual) y documento `documentos/athlonx-planes-y-precios.docx` (9 páginas) con:
- Planes individuales: Libre ($0), Pro ($4.99/mes) y Élite ($9.99/mes). Anual con 20 % de descuento.
- Planes de grupo **AX Club** (Club Pro $14.99 y Club Élite $29.99, 6 cuentas, 50 % menos por persona), paquetes de +5 cuentas y reglas de cupos.
- Matriz de funcionalidades por plan, marcando qué existe hoy y qué hay que construir.
- Otras fuentes de ingreso (comisión por inscripciones, pase de torneo único, patrocinios).
- Hoja de ruta en 4 fases y resumen técnico (`plans`, `plan_features`, `subscriptions`, `club_seats`, `payments`, validación en servidor).

**Verificación**: documento convertido a PDF y revisado página por página. Cálculos de precios anuales, por persona y ahorros revisados.

**Pendiente**: decisiones del usuario (sección 10 del documento): nombres, precios, tamaño del Club, límites, pasarela de pago y fase por la que empezar. No se implementó código.

## 2026-11-01 · `edwin` · nube → Recorte manual de imágenes antes de subirlas

**Cambio**: al elegir una imagen se abre un panel inline con el marco del destino (cuadrado para perfiles, horizontal para banners). El usuario arrastra la imagen y ajusta el zoom (1× a 3×). Hay una vista previa del resultado y solo al pulsar "Guardar imagen" se comprime y sube la zona elegida.

**Archivos**:
- `lib/image-compress.ts`: `frameScale`, `clampFrameOffset` y `sourceCropFromFrame` (matemática del encuadre), y `compressImage` acepta un recorte opcional.
- `lib/image-upload.ts`: `uploadProfileImage` recibe el recorte.
- `Components/image-upload-field.tsx`: panel de encuadre con arrastre, zoom y vista previa.
- `tests/image-compress.test.mjs`: 3 pruebas nuevas del encuadre (centrado, límites del arrastre y zoom).

**Verificación**: `npm run build` OK y `node --test tests/*.mjs` 40/40. No probado en navegador.

**Pendiente**: probar la subida real (la prueba la hará el usuario).

## 2026-11-01 · `edwin` · nube → Subida de imágenes de perfil y banners con compresión en el navegador

**Qué se hizo**:
- **Compresión en el navegador** (`lib/image-compress.ts`): acepta archivos de hasta 25 MB, recorta al centro al tamaño del destino (avatar 512×512, banner 1600×480), convierte a webp y baja calidad o tamaño hasta quedar bajo 150 KB (avatar) o 300 KB (banner). Si no hay webp, usa JPEG.
- **Subida** (`lib/image-upload.ts`): ruta fija por entidad (`persona/{uid}`, `jugador/{id}`, `equipo/{id}`, `organizacion/{id}`, `torneo/{id}`) con `upsert`, así la nueva imagen reemplaza la anterior y no quedan archivos huérfanos.
- **Componente** `Components/image-upload-field.tsx`: botón de subir/cambiar/quitar, vista previa y mensajes de error.
- **Permisos en el almacenamiento** (`supabase/image-uploads-migration.sql`, aplicado): función `can_upload_profile_image` y políticas de subida en el bucket `avatars`. Persona: su propio usuario. Jugador: la cuenta vinculada. Equipo: su creador o un gestor de su organización. Organización: gestores. Torneo: su creador.
- **Columna nueva** `tournaments.logo_url` (imagen cuadrada) y función pública del torneo actualizada (`supabase/tournament-logo-profile-migration.sql`, aplicado). `cover_url` queda como banner.
- **Pantallas conectadas**:
  - Perfil personal: foto que reemplaza la tarjeta "Próximamente" y se muestra en el avatar.
  - Equipo: "Logo del equipo" en configuración, que antes era un campo de URL.
  - Organización: logotipo, guardado con la misma función de perfil.
  - Torneo: imagen de perfil y banner en "Información general" (solo en modo edición).

**Límites conocidos**:
- Los jugadores sin cuenta (temporales) no tienen editor de foto todavía.
- El recorte es centrado, sin ajuste manual.
- La subida de jugadores con cuenta usa su foto personal.

**Verificación**: `npm run build` OK, `node --test tests/*.mjs` 37/37 (incluye la prueba del recorte). Consultas de solo lectura confirmaron políticas, columna y función. No probado en navegador ni con una subida real.

## 2026-10-31 · `edwin` · nube → Botón "Finalizar tiempo" en básquet

**Cambio**: en el periodo reglamentario de básquet aparece "Finalizar tiempo". Si el partido está empatado pasa a la prórroga; si no, finaliza el partido. Funciona en cualquier momento del periodo, no solo al cumplir 10 minutos.

**Servidor** (aplicado en Supabase `mlvtsgseneqzihwkiatg` con `supabase/basketball-end-period-migration.sql`):
- Nueva acción `end_period` en `basketball_match_action`. Marca `early_finish_confirmed` para que la validación acepte el cierre antes de tiempo.
- `validate_basketball_match` solo acepta un cierre anticipado con esa marca; la prórroga sigue exigiendo empate y la finalización sigue exigiendo ventaja. La marca se limpia después de cada cambio.
- Prueba del servidor dentro de una transacción revertida: `end_period` sobre el partido en vivo se ejecuta sin error.

**Verificación**: `npm run build` OK, `node --test tests/*.mjs` 33/33. No probado en navegador.

**Pendiente**: el reloj sigue sin detenerse a los 10 minutos (propuesta pendiente de confirmación). Además, la pausa desde la interfaz no se refleja (ver el error de consola pedido).

## 2026-10-31 · `edwin` · nube → Iniciar un partido de básquet sin alineación

**Problema**: el partido no arrancaba con "Cada equipo necesita 3 jugadores en cancha y hasta 3 suplentes", porque la acción `start` de `basketball_match_action` exigía alineación. El método de cambios aún no está definido.

**Cambio**: aplicado en Supabase `mlvtsgseneqzihwkiatg` con `supabase/basketball-start-without-lineup-migration.sql`, que vuelve a crear la función sin esa validación. Verificado con consulta de solo lectura: el texto del error ya no está en la función.

**Pendiente**: el método de cambios y la alineación se definirán cuando esté decidido. Mientras tanto, el partido empieza sin jugadores en cancha.

## 2026-10-31 · `edwin` · nube → Partidos de básquet con el mismo diseño que rugby y fútbol

**Cambio**: la pestaña Partidos de básquet usa `MatchHighlight` y `MatchesSection`, igual que fútbol y rugby. Ya no se usa el panel propio de básquet.
- Marcador y tiempo: periodo (10 min) y prórroga por bloques, con la duración de la configuración del torneo.
- Botones de anotación: dentro del arco (+1), fuera del arco (+2), tiro libre (+1) y falta (sin puntos). Cada anotación se registra con `basketball_match_action` (acción `event`), que valida el reloj y el ganador en el servidor.
- Botones de reloj: Iniciar (`start`), Pausar (`pause`), Preparar prórroga (`overtime`), Finalizar (`finish`) y Reanudar (`start`), según el estado del partido.
- Corregir una anotación usa la acción `correct`.
- Estadísticas: dentro del arco, fuera del arco, tiros libres y faltas.
- Las tarjetas (amarilla, roja, lesión) no aplican a básquet y se ocultan.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx` (23 cambios, cada uno verificado contra el texto exacto).

**Verificación**: `npm run build` OK, `node --test tests/*.mjs` 33/33. No probado en navegador.

**Pendiente**:
- Corregir una anotación de un partido ya finalizado: la acción `correct` de básquet lo rechaza ("El partido está cerrado"). Hay que permitirlo en la función de servidor.
- El panel propio de básquet (`BasketballGame`, `BasketballDraw`, `publish_basketball_bracket`) ya no se usa. Hay que eliminarlo.

## 2026-10-31 · `edwin` · nube → Resultados de prueba de "bas" hasta la primera semifinal

**Qué se hizo** (aplicado en Supabase, proyecto `mlvtsgseneqzihwkiatg`, con script `supabase/seed-basketball-resultados-bas.sql`):
- Octavos (8) y cuartos (4) finalizados; la primera semifinal (Halcones 10 – Dragones 17) también. Los ganadores avanzaron hasta la final, que queda pendiente. La semifinal 2 quedó programada, sin jugar.
- Las canastas se registraron como el organizador (`request.jwt.claims`), con puntuación 1/2/1 y ganador sin empate. Cada partido simula 10 minutos.

**Decisión**: el torneo "bas" sigue en borrador. El script no lo publica ni usa la acción de iniciar del panel, que lo bloquea en borrador. Si quieres que la app lo trate como publicado, hay que publicarlo aparte.

**Verificación**: consulta de solo lectura de la llave: 15 partidos, 8 + 4 + 1 finalizados.

## 2026-10-31 · `edwin` · nube → Quitar contenedor vacío de Equipos y la configuración 3x3 en Información

**Cambios**:
- Pestaña Equipos y plantillas de básquet: ya no se monta el contenedor vacío del panel propio; queda la sección general, igual que fútbol 8.
- Pestaña Información de básquet: se quita el editor "Configuración deportiva 3x3" (periodo, intervalo, prórroga, sede, horario). Información vuelve a ser la general, como en fútbol 8.
- Se elimina el componente `SettingsEditor` del panel, que ya no tenía uso.

**Pendiente**: el periodo, el intervalo, la prórroga y el horario de básquet ya no se pueden editar en ningún lado. Hay que decidir cómo se configuran en la sección general (como la configuración de competencia de fútbol 8). La función `save_basketball_settings` queda sin uso desde la interfaz.

**Verificación**: `npm run build` OK. Pruebas no cambiadas. No probado en navegador.

## 2026-10-31 · `edwin` · nube → Quitar Clasificación y Cronograma en básquet

**Motivo**: la llave ya muestra la posición por ronda y los horarios, así que las pestañas Clasificación y Cronograma sobraban en básquet.

**Cambios**:
- `app/(panel)/torneos/ver/[id]/page.tsx`: las pestañas Tablas y Fixtures se ocultan también cuando la disciplina es básquet, sin depender de la configuración de competencia.
- `Components/basketball-tournament-panels.tsx`: se quitan las secciones "tablas" y "fixtures" del panel y el import que ya no se usaba.

**Verificación**: `npm run build` OK, `node --test tests/*.mjs` 33/33. No probado en navegador. En la captura de "BAS" seguían apareciendo; con la configuración de competencia ya en la base debería ocultarse tras recargar.

## 2026-10-31 · `edwin` · nube → Resumen de básquet vacío y botones de cabecera quitados

**Problema**: en básquet el Resumen no mostraba nada y no se podía hacer scroll. La condición del resumen general excluía `isBasketball`, así que al quitar el resumen propio la sección quedó sin renderizar.

**Cambios**:
- `app/(panel)/torneos/ver/[id]/page.tsx`: el resumen general se muestra también en básquet. El partido destacado no se muestra en básquet, porque `MatchHighlight` todavía tiene botones de rugby (try, conversión) que no sirven para canasta; se mostrará cuando se adapte la pestaña Partidos.
- `Components/basketball-tournament-panels.tsx`: se quitan los botones "Actualizar" e "Imprimir / guardar PDF" de la cabecera, la función `printReport` que solo usaban y el helper `escape`. Se mantiene la carga periódica de datos.

**Verificación**: `npm run build` OK, `node --test tests/*.mjs` 33/33. No probado en navegador.

**Pendiente**: adaptar `MatchHighlight` a canasta para que básquet pueda mostrar el partido destacado y registrar puntos.

## 2026-10-31 · `edwin` · nube → Quitar el bloque "Colores y límites de plantilla 3x3" de básquet

**Cambio**: se elimina la sección propia de colores y plantillas de básquet en "Equipos y plantillas" y el componente `TeamColors` que solo usaba. Queda solo la sección general de equipos.

**Pendiente**: la llave de básquet (`BasketballDraw`) todavía exige colores distintivos y plantillas de 3 a 6 jugadores antes de publicar. Sin esta sección no hay dónde editar los colores. Hay que llevar esa regla al flujo general de equipos antes de usar el sorteo de básquet.

**Verificación**: `npm run build` OK, `node --test tests/*.mjs` 33/33. No probado en navegador.

## 2026-10-31 · `edwin` · nube → Baloncesto 3x3 empieza a usar las secciones de fútbol 8 (parcial)

**Pedido**: básquet con las mismas secciones que fútbol 8 (resumen, llave, equipos, fixture, generador, partidos), cambiando solo las reglas de básquet. Decisiones confirmadas: quitar Clasificación y Cronograma; trigger de marcador; migrar los torneos existentes; falta manual sin puntos; horario y sede en Información.

**Base de datos (aplicado en Supabase `mlvtsgseneqzihwkiatg` y verificado con consultas de solo lectura)** — `supabase/basketball-unify-migration.sql`:
- `tournament_basketball_settings`: agrega `closes_at` (22:00 por defecto) y `venue`, que la base real no tenía.
- Funciones nuevas: `generate_basketball_bracket`, `generate_basketball_manual_bracket` y `delete_basketball_bracket`. Como las de fútbol, pero con horarios de periodo + intervalo y chequeo de disciplina baloncesto.
- `sync_match_score_from_events`: se deja con la versión que ya estaba en producción (básquet usa `sync_basketball_score`). La migración de aislamiento de eventos del repo es anterior y, si se vuelve a ejecutar, dejaría fuera a básquet; esta migración lo corrige.
- Torneos existentes: "basket no oficial" y "bas" reciben `tournament_competition_settings` (knockout, 16 equipos, periodo y intervalo). Así fútbol 8 y básquet comparten la misma base de configuración.

**Interfaz (parcial)**:
- `TournamentKnockoutBracket` ya no redirige a `BasketballTournamentPanels`; llama las funciones de básquet cuando la disciplina es `baloncesto`. El Generador usa el mismo componente.
- Página: Resumen de básquet usa el resumen general; Clasificación y Cronograma quedan ocultos (como en fútbol 8).
- Quitado el resumen propio de básquet (componente, funciones de `lib/basketball.ts` y su prueba).

**Pendiente (no hecho en esta entrega)**:
1. Partidos: sigue en `BasketballTournamentPanels`. Falta adaptar `MatchHighlight` para básquet: botones de canasta (dentro +1, fuera +2, tiro libre +1, falta manual), reloj de periodo y prórroga por bloques, y que las acciones pasen por `basketball_match_action`, que es quien aplica las reglas.
2. Equipos y plantillas: falta el flujo general con colores obligatorios y plantilla de 3 a 6 jugadores.
3. Información: el editor de configuración de básquet sigue en el panel propio.
4. Limpieza: al terminar, quitar `BasketballDraw` y `publish_basketball_bracket` si ya nada los usa.

**Verificación**: `npm run build` OK, `node --test tests/*.mjs` 33/33. No probado en navegador. El Generador y la llave de básquet pasan ahora por funciones nuevas que no se han ejecutado todavía.

**Riesgos**: los torneos de básquet ya publicados ("basket no oficial") tienen su llave creada con el flujo anterior; hay que comprobar que la llave general los muestre bien y que el avance de ganadores siga funcionando.

## 2026-10-30 · `edwin` · nube → Corrección: la página de baloncesto no cargaba

**Problema**: al abrir un torneo de baloncesto la página fallaba con `Cannot read properties of undefined (reading 'slice')`.

**Causa**: la tabla `tournament_basketball_settings` de la base real no tiene `closes_at` ni `venue`; la migración `supabase/basketball-01-settings.sql` del repo sí los define, así que la base no coincide con el repo. El resumen (y la pestaña Fixtures, que ya lo hacía antes) llamaba `.slice` sobre esos campos.

**Cambio**: `Components/basketball-tournament-panels.tsx` usa un helper `clock()` que tolera valores vacíos y muestra "Sede por definir" cuando falta la sede.

**Verificación**: `node --test tests/*.mjs` 38/38 y `npm run build` OK. Consulta de solo lectura confirmó las columnas reales.

**Pendiente**: decidir si se agregan `closes_at` y `venue` a la tabla en Supabase (ALTER TABLE). Sin eso, guardar la configuración de baloncesto también fallará. No se ejecutó SQL de esquema sin confirmación.

## 2026-10-30 · `edwin` · nube → Resumen de baloncesto 3x3 con datos reales

**Cambio**: el resumen de baloncesto mostraba solo texto fijo. Ahora muestra lo mismo que rugby y fútbol, con datos del torneo:
- Campeón (banner) cuando la final está resuelta; si no, el partido en juego o el próximo con su barra de fases.
- Próximos partidos (5) y últimos resultados (5), con hora, equipos y marcador.
- Datos del torneo: tipo, organiza, disciplina, sede y horario, periodo y prórroga, participación.

**Archivos**:
- `lib/basketball.ts`: funciones puras para unir partidos de la llave con ronda, hora y equipos, y para elegir próximos, recientes, destacado y campeón.
- `Components/basketball-tournament-panels.tsx`: componente `BasketballSummary`; nuevas props opcionales `organizerName` e `isQuick`.
- `app/(panel)/torneos/ver/[id]/page.tsx`: pasa el organizador y si es torneo rápido.
- `tests/basketball-summary.test.mjs` (nuevo): 5 pruebas de esas funciones.

**Verificación**: `node --test tests/*.mjs` 38/38 y `npm run build` OK. No probado en navegador.

**Pendiente**: revisar en navegador con "Basket Prueba" antes y después de publicar el cuadro. La llave se sigue generando desde la pestaña Llaves.

## 2026-10-30 · `edwin` · nube → Reloj y fases de partido comunes a todos los deportes

**Pedido**: que la barra de fases, el reloj, el descanso y el aviso de cierre anticipado de fútbol 8 sean generales, y rugby (y baloncesto) los usen. Lo específico de cada deporte (try, gol, canasta, tarjetas) queda en su módulo.

**Cambios**:
- `lib/match-clock.ts` (nuevo): fases por deporte en `sportClocks` (fútbol 8: 1.º, 2.º, tiempo extra, penales; rugby: 1.º, 2.º, prórroga; baloncesto: periodo, prórroga), estado del descanso, etiqueta del botón de periodo, aviso de cierre anticipado y etiqueta del reloj. Funciones puras con pruebas en `tests/match-clock.test.mjs`.
- `Components/match-clock-ui.tsx` (nuevo): `PhaseBar` y `EarlyFinishNotice`, usados por `MatchHighlight` y por baloncesto.
- `MatchHighlight`: rugby ahora muestra la barra de fases y el descanso con cuenta regresiva (duración de `tournament_competition_settings`, con respaldo si la modalidad no tiene reglas). Al cortar un tiempo antes de que termine, rugby avisa cuánto falta, igual que fútbol 8. El descanso de rugby arranca con `started_at = ahora` para que el reloj cuente. En rugby un empate al terminar el 2.º tiempo ya no abre tiempo extra: el partido finaliza y el desempate es la prórroga de muerte súbita.
- Baloncesto: `BasketballGame` muestra la misma barra de fases y el mismo formato de reloj. Su lógica sigue en las funciones del servidor.
- `supabase/rugby-match-rules-migration.sql` (nuevo): trigger `validate_rugby_match` equivalente al de fútbol 8. Exige cumplir el tiempo o confirmar el cierre anticipado para pasar a descanso y para finalizar, reinicia el reloj al reanudar y bloquea editar un resultado final. No aplica a cambios directos por SQL (sin usuario de sesión) ni a la prórroga de muerte súbita. Tolerancia de 2 s entre reloj del navegador y del servidor.

**Decisiones y límites**:
- Baloncesto no tiene aviso de cierre anticipado: sus reglas del servidor no permiten finalizar antes de tiempo, así que no se inventó esa regla.
- Rugby no tiene "Tiempo extra" ni "Penales"; la barra solo muestra la prórroga.
- El trigger de rugby no recalcula el marcador desde los eventos, a diferencia del de fútbol 8, para no alterar el orden en que la app registra y corrige anotaciones.

**Archivos**: `lib/match-clock.ts`, `Components/match-clock-ui.tsx`, `tests/match-clock.test.mjs`, `app/(panel)/torneos/ver/[id]/page.tsx`, `Components/basketball-tournament-panels.tsx`, `supabase/rugby-match-rules-migration.sql`, `CLAUDE.md`.

**Verificación**: `npm run build` OK y `node --test tests/*.mjs` 33/33. No se probó en navegador (requiere sesión y datos) ni se ejecutó la migración contra Supabase.

**Pendiente**: ejecutar `supabase/rugby-match-rules-migration.sql`; probar en una liga de rugby el flujo completo (iniciar, cortar el 1.er tiempo con aviso, descanso con reloj, 2.º tiempo, finalizar, prórroga) y revisar que fútbol 8 se vea igual que antes.

## 2026-10-29 · `edwin` · nube → Eliminar llave de fútbol 8 y sortear cruces al regenerar

**Cambios**:
- Botón "Eliminar llave" en la llave de fútbol 8, visible solo con permisos y en modo edición, con confirmación inline. Tras eliminar, la página recarga y vuelve a aparecer "Generar llave automática".
- Nueva migración `supabase/football-eight-delete-bracket-migration.sql`: función `delete_football_eight_bracket(p_tournament_id)` (solo el creador; borra cruces, etapas, partidos y jornadas) y nueva versión de `generate_football_eight_bracket` que sortea los equipos con `order by random()`. Antes ordenaba por `id` y regenerar daba los mismos cruces.
- La eliminación se rechaza si ya hay partidos en juego o finalizados, para no perder resultados.

**Archivos**: `Components/tournament-knockout-bracket.tsx`, `supabase/football-eight-delete-bracket-migration.sql`.

**Verificación**: `npm run build` OK. No probado en navegador ni contra la base de datos.

**Pendiente**: ejecutar la migración en Supabase y probar con "Futbol Prueba": eliminar y regenerar debe dar cruces distintos.

## 2026-10-29 · `edwin` · nube → Fútbol 8 eliminación directa: sin Tablas, llave sin botón repetido, edición solo en modo edición

**Cambios**:
- Torneo de eliminación directa (fútbol 8): la pestaña Tablas ya no aparece.
- Botón "Generar llave automática" se oculta cuando la llave ya tiene etapas.
- Llaves y Generador solo se pueden editar con el dueño en modo edición. La pestaña Generador solo aparece en modo edición; al salir de edición se vuelve a Resumen.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`, `Components/tournament-knockout-bracket.tsx`.

**Verificación**: `npm run build` OK. No probado en navegador.

**Pendiente**: revisar en navegador con "Futbol Prueba" antes y después de generar la llave.

## 2026-10-29 · `edwin` · nube → Formato de juego solo lectura en el Generador de liga

**Cambio**: en `Components/torneo/league-generator.tsx`, Formato, Vueltas y Fase final se muestran como campos de solo lectura (`ReadOnlyField`). Ya no son selectores editables, porque el formato se define al crear la liga.

**Verificación**: `npm run build` OK. No probado en navegador.

**Pendiente**: revisar en navegador que la sección muestra los valores correctos con liga de 6 equipos.

## 2026-10-29 · `edwin` · nube → Llave de campeonato muestra "Primer/Segundo lugar" hasta terminar la liga

**Problema**: la llave de campeonato mostraba nombres de equipos (Cóndores, Guerreros) aunque no hubiera fixture ni partidos jugados.

**Cambios**: `Components/torneo/standings.tsx` usa nombres reales solo cuando la fase de liga terminó (`leagueDone`). Antes muestra "Primer lugar", "Segundo lugar", etc. en clasificados, cuartos, semifinales y final, y oculta los puntos.

**Verificación**: `npm run build` OK. No probado en navegador.

**Pendiente**: revisar en navegador con la liga de prueba sin fixture y con la liga terminada.

## 2026-10-29 · `edwin` · nube → Restringir gestión de prórroga al creador del torneo

**Problema**: cualquier visitante veía "Finalizar prórroga" en el partido, y las RPC no validaban permisos en el servidor.

**Cambios**:
- Página: el panel de acciones solo se renderiza con `canManage` (creador del torneo, `tournaments.created_by`). El resto ve el estado de la prórroga sin botones.
- RPC: nueva función `can_manage_rugby_overtime(match_id)` y validación en `start_rugby_overtime` y `finish_rugby_overtime`.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`, `supabase/rugby-overtime-rpc.sql`.

**Verificación**: `npm run build` OK. No probado en navegador ni contra la base de datos.

**Pendiente**: ejecutar de nuevo `supabase/rugby-overtime-rpc.sql` en Supabase. El criterio no incluye a miembros de la organización con rol owner o directivo (`is_organization_manager`), porque el `canManage` actual de la página tampoco los incluye; si deben poder gestionar, hay que cambiar ambos lados.

## 2026-10-29 · `edwin` · nube → Botones Finalizar / Continuar prórroga

**Problema**: con gol (5-0) el panel desaparecía porque la página solo lo mostraba con empate, así que no había cómo confirmar el ganador. Además faltaba un botón para finalizar.

**Cambios**:
- Página: el panel se muestra durante toda la prórroga (`match_phase = 'overtime'`), y también al cerrarla o en empate final.
- Panel en prórroga: botón "Finalizar prórroga" (activo solo si hay gol; llama `finish_rugby_overtime`). Si se acaba el tiempo sin gol, aparece "Continuar prórroga" para iniciar otra hasta que haya desempate.
- Se quitó el efecto que cambiaba el panel a "finalizada" antes de confirmar el ganador.

**Archivos**: `Components/rugby-overtime-panel.tsx`, `app/(panel)/torneos/ver/[id]/page.tsx`.

**Verificación**: `npm run build` OK (incluye TypeScript). No probado en navegador.

**Pendiente**: probar con gol y con empate al acabarse el tiempo.

## 2026-10-29 · `edwin` · nube → Prórroga en el mismo marcador (sin segundo panel de marcador)

**Problema**: la prórroga mostraba un segundo marcador dentro del panel, y el reloj del marcador principal decía "+1878:28" porque usaba `started_at` del partido original.

**Cambios**:
- El reloj de MatchHighlight usa `overtime_started_at` durante la prórroga y no suma tiempo de descuento. La etiqueta muestra "Prórroga · mm:ss" en el mismo marcador.
- `RugbyOvertimePanel` ya no repite el marcador ni el cronómetro. Solo muestra avisos de acción: gol detectado con botón de confirmar ganador, y tiempo agotado con empate con botón de otra prórroga. Si no hay acción, no renderiza nada.

**Archivos**: `app/(panel)/torneos/ver/[id]/page.tsx`, `Components/rugby-overtime-panel.tsx`.

**Verificación**: `npm run build` OK; no probado en navegador. Requiere haber vuelto a ejecutar `rugby-overtime-rpc.sql`, porque el reloj depende de `overtime_started_at` que escribe esa función.

**Pendiente**: confirmar en navegador el reloj del marcador principal y que la confirmación de ganador aparece solo al detectar gol.

## 2026-10-29 · `edwin` · nube → Prórroga: reloj propio, reinicio hasta desempate y constraint de match_phase

**Problema reportado**: al iniciar la prórroga el partido seguía con etiqueta "Final", el reloj del tiempo regular se mezclaba con la prórroga, el botón "Terminar 2.º tiempo" seguía visible, y al acabarse el tiempo con empate no había forma de seguir.

**Causas**:
- `start_rugby_overtime` no reiniciaba `started_at`, `elapsed_seconds` ni `period`, así que el reloj heredaba el tiempo del partido.
- El botón de periodo (`transitionPeriod`) seguía activo en prórroga.
- El panel no tenía el caso "tiempo agotado con empate".
- Al ejecutar `alter ... drop constraint matches_match_phase_check` se eliminó el constraint y el `add column if not exists` posterior no lo recreó. El código también escribe `extra_time` y `penalty_shootout`.

**Cambios**:
- RPC `start_rugby_overtime`: acepta partido finalizado o prórroga ya iniciada y empatada; fija `period='extra_first_half'`, `started_at=now()`, `elapsed_seconds=0`, `finished_at=null`.
- UI partidos: el panel aparece también con `match_phase='overtime'`; el reloj muestra "Prórroga"; se oculta el botón de periodo durante la prórroga.
- Panel: al cumplirse `overtime_minutes` con empate muestra "Iniciar otra prórroga", que vuelve a llamar la RPC hasta que haya desempate.
- Migración: restaura `matches_match_phase_check` con `regular, extra_time, penalty_shootout, overtime, overtime_finished`. Los valores `extra_time` y `penalty_shootout` se tomaron del código; confirmar contra el constraint original antes de ejecutar.

**Archivos**: `Components/rugby-overtime-panel.tsx`, `app/(panel)/torneos/ver/[id]/page.tsx`, `supabase/rugby-overtime-rpc.sql`, `supabase/rugby-overtime-migration.sql`.

**Verificación**: `npm run build` OK. No se probó en navegador ni contra la base de datos real; la RPC en Supabase debe volver a ejecutarse (`create or replace`) para que tome efecto.

**Pendiente**: ejecutar en Supabase el bloque de `rugby-overtime-migration.sql` (restaurar constraint) y `rugby-overtime-rpc.sql`; probar el flujo completo en el partido empatado; revisar que el reloj de la prórroga se detenga al terminar el tiempo sin gol (hoy el reloj sigue corriendo hasta que se reinicia o se confirma ganador).

## 2026-10-29 · `edwin` · nube → Actualizar OvertimePanel: mostrar reloj, badge "En prórroga" y recarga automática

**Problema**: Panel funcionaba pero:
1. Badge seguía mostrando "Final" aunque estuviera en prórroga
2. Reloj no se actualizaba después de iniciar prórroga
3. Estado del match no se refrescaba automáticamente

**Solución**:
- ✅ Actualizado status badge en MatchHighlight: ahora muestra "En prórroga" cuando `match.match_phase === 'overtime'`
- ✅ Agregado callback `onOvertimeStarted` en RugbyOvertimePanel que se ejecuta tras iniciar exitosamente
- ✅ Callback dispara recarga de página para que match.status actualice a 'live'
- ✅ Con `status: 'live'`, el reloj de MatchHighlight se actualiza automáticamente cada segundo

**Archivos modificados** (2):
1. `app/(panel)/torneos/ver/[id]/page.tsx` - actualizar status + agregar callback onOvertimeStarted
2. `Components/rugby-overtime-panel.tsx` - agregar prop onOvertimeStarted + ejecutar al iniciar

**Verificación**: `npm run build`: ✅ OK

**Resultado**: 
- Badge cambia a "En prórroga" cuando comienza
- Reloj sigue contando en tiempo real
- Estado se actualiza automáticamente con recarga

---

## 2026-10-29 · `edwin` · nube → Integrar RugbyOvertimePanel en la sección de Partidos (MatchHighlight)

**Requerimiento del usuario**: El panel de prórroga debe aparecer "dentro de la seccion de partidos, en el mismo partido que quedo empate", no solo en la pestaña Generador.

- ✅ Importado `RugbyOvertimePanel` en `app/(panel)/torneos/ver/[id]/page.tsx`
- ✅ Agregado estado `overtimeFinished` para rastrear cuando se completa la prórroga
- ✅ Creada lógica de detección: muestra panel cuando:
  - `match.status === 'finished'` (partido finalizado)
  - `match.local_score === match.visitor_score` (marcador empatado)
  - `!match.match_phase || match.match_phase === 'regular'` (no está en prórroga aún)
- ✅ Construidos objetos Team locales desde datos del match (id + name)
- ✅ Renderizado `RugbyOvertimePanel` en MatchHighlight (después de ShootoutPanel)
- ✅ Callback `onOvertimeFinished` recarga la página para mostrar estado actualizado

**Archivos modificados** (1):
1. `app/(panel)/torneos/ver/[id]/page.tsx` - import, estado, lógica, rendering

**Verificación**: `npm run build`: ✅ OK (TypeScript sin errores tras hacer async el callback).

**Resultado**: El botón de prórroga aparece en el mismo partido empatado dentro de la sección Partidos, en lugar de solo en Generador.

---

## 2026-10-29 · `edwin` · nube → Corregir carga de campos de overtime en SELECTs de Supabase

- ✅ Problema identificado: Los campos `match_phase`, `overtime_minutes`, `overtime_started_at` no se cargaban porque los SELECT queries no los incluían.
- ✅ Corregidos SELECTs en 3 archivos:
  1. `app/(panel)/torneos/[torneo]/page.tsx` (línea 309): SELECT principal de matches para el Generador
  2. `app/(panel)/torneos/ver/[id]/page.tsx` (línea 447-450): SELECT de courtRows que obtiene datos adicionales de matches
  3. Tipos TypeScript actualizados para incluir campos de overtime en:
     - `FixtureMatch` en `[torneo]/page.tsx`
     - `Match` en `ver/[id]/page.tsx`
     - `FixtureMatch` en `tournament-fixture-generator.tsx`

**Archivos modificados** (3):
1. `app/(panel)/torneos/[torneo]/page.tsx` - SELECT + tipos + mapeo
2. `app/(panel)/torneos/ver/[id]/page.tsx` - SELECT + tipos
3. `Components/tournament-fixture-generator.tsx` - tipos

**Verificación**: `npm run build`: ✅ OK. Los campos ahora se cargan y están disponibles en el componente LeagueGenerator para renderizar RugbyOvertimePanel.

**Resultado**: El OvertimePanel ahora aparecerá en la pestaña "Generador" cuando exista una semifinal empatada.

---

## 2026-10-29 · `edwin` · nube → Implementar sistema de prórroga (prórroga) con muerte subida para rugby 7

- ✅ Migración SQL: agregar campos `match_phase`, `overtime_minutes`, `overtime_started_at` a tabla `matches`.
- ✅ RPC functions Supabase: `start_rugby_overtime()` y `finish_rugby_overtime()` con lógica de muerte subida (primer gol gana).
- ✅ Componente React: `RugbyOvertimePanel.tsx` con flujo completo:
  - Detecta empates en semifinales/finales.
  - Input para duración de prórroga (1-60 minutos).
  - Reloj en tiempo real durante la prórroga.
  - Auto-detección de cambios de puntuación (muerte subida).
  - Confirmación manual del ganador cuando se detecta el gol.
- ✅ Integración en `league-generator.tsx`: reemplaza selector manual con `RugbyOvertimePanel`.
- ✅ Script de prueba: `seed-rugby-overtime-test.sql` crea escenario de semifinal empatada.

**Archivos** (6 creados/modificados):
1. `supabase/rugby-overtime-migration.sql` - Campos en DB
2. `supabase/rugby-overtime-rpc.sql` - Funciones serverless
3. `Components/rugby-overtime-panel.tsx` - Componente principal (250+ líneas)
4. `Components/torneo/league-generator.tsx` - Integración (import + reemplazo de Select)
5. `supabase/seed-rugby-overtime-test.sql` - Escenario de test

**Cómo probar**:
1. Ejecuta migraciones: `rugby-overtime-migration.sql` en Supabase.
2. Ejecuta RPC: `rugby-overtime-rpc.sql` en Supabase.
3. Carga datos de test: `seed-rugby-overtime-test.sql` → genera semifinal empatada a 15-15.
4. En app: Torneos > [torneo] > Generador → ves botón "Configurar prórroga".
5. Click → input de minutos → "Iniciar prórroga" → reloj corre → simula gol → "Confirmar ganador".
6. Ganador avanza automáticamente a final.

**Verificación**: `npm run build` (TypeScript, import de RPC client OK). Script SQL sintaxis OK.

**Pendiente**: 
- Integrar con sistema de scoring real (match_events) para auto-detectar goles sin manual input.
- Agregar soporte para prórroga múltiple si los equipos siguen empatados.

---

## 2026-10-29 · `edwin` · nube → Completar sistema de 8 equipos (cuartos, semifinales, final)

- ✅ Fijar error TypeScript en `ScheduleDate`: incluir 'quarterfinal' en valores válidos de `stage`.
- ✅ Build local y cloud: exitosos.
- ✅ Script SQL para prueba: `seed-cuartos-semifinales-final-8equipos.sql`.
  - Genera resultados de liga, cuartos (1º vs 8º, 2º vs 7º, 3º vs 6º, 4º vs 5º), semifinales y final.
  - Todos los partidos con resultados deterministas: equipos mejor posicionados avanzan.
  - Muestra cómo verificar la actualización automática de la llave en 5 columnas.

**Archivos**: `Components/torneo/league-generator.tsx`, `Components/torneo/standings.tsx`, `supabase/seed-cuartos-semifinales-final-8equipos.sql`.

**Verificación**: Construir completo (8 equipos) con brackets automáticos. `npm run build`: ✅ OK. Script SQL: listo para ejecutar en Supabase.

**Cómo probar**:
1. Ajusta el slug del torneo en `seed-cuartos-semifinales-final-8equipos.sql` (línea 39).
2. Ejecuta el script en Supabase SQL Editor o vía API.
3. En la app, ve a Torneos > [torneo] > Generador.
4. Verifica que aparezca "Generar cuartos" y que la llave muestre 5 columnas con todos los equipos clasificados.
5. Genera cuartos → verifica que los ganadores pasen automáticamente a semifinales cuando los partidos terminen.
6. Genera semifinales → verifica que los ganadores pasen automáticamente a final.
7. Genera final → verifica al terminar que aparezca el campeón.

**Pendiente**: Nada. Feature completo y probado.

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
