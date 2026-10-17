# Baloncesto 3x3 en el gestor de AthlonX

La disciplina se selecciona desde **Eventos → Crear torneo**. El formulario actual
guarda la duración del periodo, el intervalo entre partidos y la duración de cada
bloque de prórroga. No hay duraciones deportivas predeterminadas en el módulo.
La sede inicial es UTP; el horario inicial es de 08:00 a 17:00 y se puede editar.

## Aplicación en Supabase

Sobre el esquema vigente de AthlonX, ejecutar en este orden:

1. `supabase/basketball-01-settings.sql`
2. `supabase/basketball-02-matches.sql`
3. `supabase/basketball-03-bracket.sql`

Las dependencias son las migraciones existentes de disciplinas y modalidades,
torneos rápidos, divisiones de equipo, fixture_players, orden de fixture, reloj,
tiempo extra, correcciones de eventos, llaves de fútbol 8 y aislamiento de eventos
de fútbol/rugby. Los tres archivos nuevos son transaccionales e idempotentes;
las semillas de catálogo usan `on conflict do nothing`. No recargan ni reparan
resultados históricos. No se deben volver a ejecutar las reparaciones históricas
de marcadores para instalar este módulo.

No se ejecutó SQL en un proyecto de Supabase desde esta tarea. El entorno local
no tiene `.env.local` con una conexión configurada. La validación real de RPC,
triggers, concurrencia y permisos queda pendiente en un entorno de pruebas.

## Datos compartidos y reglas separadas

Se reutilizan `tournaments`, `tournament_divisions`, `tournament_teams`, `teams`,
`players`, `team_players`, `fixtures`, `matches`, `fixture_players`,
`match_events`, `match_event_corrections`, `tournament_knockout_stages` y
`tournament_knockout_matches`. La incorporación de equipos mantiene el flujo
actual. No existen nuevas inscripciones, solicitudes, pagos ni comprobantes.

`lib/basketball.ts` contiene exclusivamente las reglas de básquet. Los tiempos
se guardan en `tournament_basketball_settings`. `basketball_colors` pertenece al
vínculo existente entre torneo y equipo. Los eventos de básquet tienen nombres
propios y se separan explícitamente de los eventos de fútbol y rugby. El módulo
`lib/football-eight.ts` conserva su contenido.

Las plantillas usan los jugadores existentes de la división correspondiente;
los vínculos sin división se incluyen, igual que en la vista de plantillas del
gestor. Publicar el cuadro requiere 16 equipos de una única división, colores
distintivos y entre 3 y 6 jugadores por equipo. El sorteo se prepara en pantalla
y admite intercambios manuales antes de publicar. La publicación persiste los
15 cruces y crea los ocho partidos iniciales en una transacción. Los siguientes
partidos se crean al conocerse sus dos participantes.

Al iniciar un partido se guarda su alineación en `fixture_players`: tres jugadores
en cancha, priorizando los marcados como titulares; los demás son suplentes.
Las sustituciones intercambian un titular y un suplente durante una pausa manual.
No se aplican sanciones automáticas por faltas.

## Decisiones de juego

- Canasta interior: 1 punto; exterior: 2; tiro libre: 1. El arco se define en la UI
  como la línea que separa la zona interior de la exterior. El tiro libre de un
  punto es el supuesto estándar autorizado por el usuario; el Word no lo contradice.
- Un periodo reglamentario. Si finaliza sin empate, el anotador confirma el
  resultado. Si termina empatado, prepara e inicia la prórroga.
- La prórroga termina automáticamente al alcanzar una ventaja de al menos dos
  puntos. Su duración configurada determina bloques repetidos: agotar un bloque
  sin esa ventaja no decide el ganador. El contador continúa con el siguiente.
- Los horarios reservan periodo e intervalo, sin sumar un intervalo después del
  último partido. Las pausas y prórrogas pueden retrasar los horarios estimados.
- El resultado final y sus eventos quedan bloqueados. Las correcciones anteriores
  al cierre conservan el evento original y exigen un motivo.
- Clasificación: 1 campeón, 2 finalista, 3 compartido para semifinalistas,
  5 compartido para cuartofinalistas y 9 compartido para eliminados en octavos.
  El orden alfabético dentro de una posición no representa un desempate deportivo.
- El reporte imprimible incluye equipos, colores, plantillas, fixture, resultados,
  clasificación y actividad de anotación. Se puede guardar como PDF desde imprimir.

## Comprobaciones

Ejecutar:

```powershell
npx tsc --noEmit -p .
node --test tests/football-eight.test.mjs tests/basketball.test.mjs tests/tournament-regression.test.mjs
```

En Supabase de pruebas, verificar además: creación con distintos tiempos;
rechazo del equipo 17 y de plantillas mayores de seis; publicación con menos de
16 equipos, colores ausentes o plantillas incompletas; cuadro repetido;
anotación cruzada entre deportes; eventos de jugadores ajenos o fuera de cancha;
reloj persistente al recargar; dos anotadores concurrentes; pausa y sustitución;
prórroga por ventaja de dos; bloqueo final; avance de las cuatro rondas;
15 partidos totales y clasificación compartida; acceso de organizador y visitante.
Comparar también los marcadores, tiempos, penales y resultados de fútbol 8 y rugby
antes y después de aplicar las migraciones, incluida su segunda ejecución.

El reglamento de faltas y sanciones sigue pendiente de la organización. El sistema
solo registra faltas manuales; no presupone sanciones ni tiempos de posesión.
La modalidad 5x5 no forma parte de esta fase.
