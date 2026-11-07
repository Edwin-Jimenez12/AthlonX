-- Permite borrar cuentas que anotaron eventos de básquet en partidos ya cerrados.
-- Al borrar la cuenta, Postgres pone en null created_by/corrected_by de match_events; el bloqueo de partidos cerrados lo impedía
-- ("El resultado y sus eventos ya están bloqueados."). Solo se deja pasar ese cambio; el resto del bloqueo sigue igual.
-- Idempotente: se puede volver a ejecutar.

CREATE OR REPLACE FUNCTION public.validate_basketball_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m matches%rowtype; sport text; expected integer; seconds integer; config tournament_basketball_settings%rowtype;
begin
  -- Borrar una cuenta pone en null el autor del evento (created_by/corrected_by). Ese cambio no toca el resultado y se permite aunque el partido esté cerrado.
  if tg_op='UPDATE' and (to_jsonb(new) - 'created_by' - 'corrected_by') = (to_jsonb(old) - 'created_by' - 'corrected_by') then return new; end if;
  select m0.* into m from matches m0 join fixtures f on f.id=m0.fixture_id join tournaments t on t.id=f.tournament_id join disciplines d on d.id=t.discipline_id
    where m0.id=case when tg_op='DELETE' then old.match_id else new.match_id end;
  -- La consulta de disciplina se mantiene independiente del registro de matches.
  select d.code into sport from matches m0 join fixtures f on f.id=m0.fixture_id join tournaments t on t.id=f.tournament_id join disciplines d on d.id=t.discipline_id
    where m0.id=case when tg_op='DELETE' then old.match_id else new.match_id end;
  if sport is distinct from 'baloncesto' then
    if tg_op<>'DELETE' and new.event_type like 'basket_%' then raise exception 'El evento no pertenece a este deporte.'; end if;
    if tg_op='DELETE' then return old; end if; return new;
  end if;
  if m.status='finished' then raise exception 'El resultado y sus eventos ya están bloqueados.'; end if;
  if not exists(select 1 from tournaments t join fixtures f on f.tournament_id=t.id where f.id=m.fixture_id and t.created_by=auth.uid()) then raise exception 'Solo el organizador puede anotar este partido.'; end if;
  if tg_op='DELETE' then raise exception 'Usa una corrección con motivo; los eventos de básquet conservan su historial.'; end if;
  if tg_op='UPDATE' and (new.match_id,new.team_id,new.player_id,new.event_type,new.points,new.match_second) is distinct from (old.match_id,old.team_id,old.player_id,old.event_type,old.points,old.match_second) then raise exception 'Corrige el evento original y registra uno nuevo.'; end if;
  expected:=case new.event_type when 'basket_inside' then 1 when 'basket_outside' then 2 when 'basket_free_throw' then 1 when 'basket_foul' then 0 end;
  if expected is null or new.points is distinct from expected then raise exception 'Tipo de evento o puntuación de básquet inválidos.'; end if;
  if new.team_id not in(m.local_team_id,m.visitor_team_id) then raise exception 'El equipo no pertenece al partido.'; end if;
  if tg_op='INSERT' then
    select s.* into config from tournament_basketball_settings s join fixtures f on f.tournament_id=s.tournament_id where f.id=m.fixture_id;
    seconds:=m.elapsed_seconds+case when m.started_at is not null and not m.is_paused then greatest(0,floor(extract(epoch from(clock_timestamp()-m.started_at)))::integer) else 0 end;
    if m.status<>'live' or m.is_paused or (m.match_phase='regular' and seconds>=config.period_minutes*60) then raise exception 'El reloj debe estar en marcha y dentro del periodo de juego.'; end if;
    if new.player_id is not null and not exists(select 1 from fixture_players fp where fp.fixture_id=m.fixture_id and fp.team_id=new.team_id and fp.player_id=new.player_id and (new.event_type='basket_foul' or not fp.is_substitute)) then raise exception 'El jugador debe pertenecer a la alineación correspondiente.'; end if;
    new.match_second:=seconds;
  elsif new.is_corrected and nullif(trim(new.correction_reason),'') is null then raise exception 'Indica el motivo de la corrección.';
  end if;
  return new;
end $function$;
