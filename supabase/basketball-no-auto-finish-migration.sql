-- Baloncesto: la prórroga no termina sola al llegar a 2 puntos; el organizador finaliza el partido con su botón.
-- Baloncesto: botón "Finalizar tiempo" en prórroga: termina el bloque actual (reloj a 00:00) y el siguiente empieza al reanudar.
-- Baloncesto: botón "Finalizar tiempo" para ir a la prórroga (si hay empate) o terminar el partido,
-- en cualquier momento del periodo reglamentario. Idempotente.
-- Reemplaza validate_basketball_match y basketball_match_action de los archivos anteriores.

begin;

create or replace function public.validate_basketball_match()
returns trigger language plpgsql security definer set search_path=public as $$
declare s tournament_basketball_settings%rowtype; sec integer; ls integer; vs integer;
begin
  select c.* into s from tournament_basketball_settings c join fixtures f on f.tournament_id=c.tournament_id where f.id=old.fixture_id;
  if not found then return new; end if;
  if old.status='finished' and new is distinct from old then raise exception 'El partido ya tiene un resultado bloqueado.'; end if;
  if (new.fixture_id,new.division_id,new.local_team_id,new.visitor_team_id,new.scheduled_time) is distinct from (old.fixture_id,old.division_id,old.local_team_id,old.visitor_team_id,old.scheduled_time) then raise exception 'Los cruces publicados de básquet no se pueden modificar.'; end if;
  if new.period not in('first_half','extra_first_half') or new.match_phase not in('regular','extra_time') then raise exception 'Básquet utiliza un periodo único y prórrogas, sin penales.'; end if;
  if old.match_phase='extra_time' and new.match_phase='regular' then raise exception 'No se puede volver al periodo reglamentario.'; end if;
  select coalesce(sum(points) filter(where team_id=new.local_team_id),0),coalesce(sum(points) filter(where team_id=new.visitor_team_id),0) into ls,vs
    from match_events where match_id=new.id and not is_corrected and event_type in('basket_inside','basket_outside','basket_free_throw');
  if new.local_score<>ls or new.visitor_score<>vs then raise exception 'El marcador debe coincidir con las canastas y tiros libres.'; end if;
  sec:=old.elapsed_seconds+case when old.status='live' and not old.is_paused and old.started_at is not null then greatest(0,floor(extract(epoch from(clock_timestamp()-old.started_at)))::integer) else 0 end;
  -- El cierre anticipado (early_finish_confirmed) solo se acepta si el organizador lo pidió con "Finalizar tiempo".
  if new.match_phase='extra_time' and old.match_phase='regular' and (ls<>vs or (sec<s.period_minutes*60 and not new.early_finish_confirmed)) then raise exception 'La prórroga requiere empate al finalizar el periodo.'; end if;
  if new.status='finished' and ((new.match_phase='regular' and (ls=vs or (sec<s.period_minutes*60 and not new.early_finish_confirmed))) or (new.match_phase='extra_time' and abs(ls-vs)<2)) then raise exception 'Falta completar el periodo o alcanzar la ventaja de 2 puntos en prórroga.'; end if;
  new.early_finish_confirmed:=false;
  new.basketball_version:=old.basketball_version+1;
  return new;
end $$;

create or replace function public.basketball_match_action(
  p_match_id uuid,p_version integer,p_action text,p_team_id uuid default null,p_event_type text default null,
  p_player_id uuid default null,p_event_id uuid default null,p_reason text default null,p_player_in uuid default null
) returns void language plpgsql security definer set search_path=public as $$
declare t tournaments%rowtype; m matches%rowtype; s tournament_basketball_settings%rowtype; sec integer; value integer;
begin
  select t0.* into t from tournaments t0 join fixtures f on f.tournament_id=t0.id join matches x on x.fixture_id=f.id
    join tournament_basketball_settings c on c.tournament_id=t0.id where x.id=p_match_id and t0.created_by=auth.uid() for update of t0;
  if not found then raise exception 'No autorizado.'; end if;
  select * into m from matches where id=p_match_id for update;
  select * into s from tournament_basketball_settings where tournament_id=t.id;
  if p_version is distinct from m.basketball_version then raise exception 'El partido cambió. Actualiza antes de repetir la acción.'; end if;
  if m.status in('finished','cancelled') then raise exception 'El partido está cerrado.'; end if;
  sec:=m.elapsed_seconds+case when m.status='live' and not m.is_paused and m.started_at is not null then greatest(0,floor(extract(epoch from(clock_timestamp()-m.started_at)))::integer) else 0 end;
  if p_action='start' then
    if t.status='draft' then raise exception 'Publica el torneo antes de iniciar partidos.'; end if;
    if (m.status='live' and not m.is_paused) or (m.match_phase='regular' and sec>=s.period_minutes*60) then raise exception 'El reloj no puede iniciarse en este estado.'; end if;
    if exists(select 1 from matches x join fixtures f on f.id=x.fixture_id where f.tournament_id=t.id and x.id<>m.id and x.status='live') then raise exception 'Ya hay un partido en curso en la única cancha.'; end if;
    if m.status='scheduled' then
      insert into fixture_players(fixture_id,team_id,player_id,shirt_number,is_substitute)
      select m.fixture_id,roster.team_id,roster.player_id,coalesce(p.shirt_number,0),roster.number>3 from (
        select team_id,r.player_id,row_number() over(partition by team_id order by r.is_substitute,r.player_id) as number
        from unnest(array[m.local_team_id,m.visitor_team_id]) team_id cross join lateral basketball_roster(t.id,team_id) r
      ) roster join players p on p.id=roster.player_id on conflict(fixture_id,player_id) do nothing;
    end if;
    update matches set status='live',is_paused=false,started_at=clock_timestamp() where id=m.id;
    update tournaments set status='in_progress' where id=t.id;
  elsif p_action='pause' then
    if m.status<>'live' or m.is_paused then raise exception 'El reloj ya está detenido.'; end if;
    update matches set is_paused=true,elapsed_seconds=sec,started_at=null where id=m.id;
  elsif p_action='end_period' then
    if m.status<>'live' or m.match_phase<>'regular' then raise exception 'Solo se puede finalizar el tiempo reglamentario en juego.'; end if;
    if m.local_score=m.visitor_score then
      update matches set match_phase='extra_time',period='extra_first_half',is_paused=true,elapsed_seconds=0,started_at=null,first_half_seconds=sec,early_finish_confirmed=true where id=m.id;
    else
      update matches set status='finished',is_paused=true,elapsed_seconds=sec,started_at=null,finished_at=clock_timestamp(),early_finish_confirmed=true where id=m.id;
    end if;
  elsif p_action='end_block' then
    if m.status<>'live' or m.match_phase<>'extra_time' or m.is_paused then raise exception 'Solo se puede finalizar un bloque de prórroga en juego.'; end if;
    update matches set is_paused=true,elapsed_seconds=0,started_at=null where id=m.id;
  elsif p_action='overtime' then
    if m.match_phase<>'regular' or sec<s.period_minutes*60 or m.local_score<>m.visitor_score then raise exception 'Se requiere empate al terminar el periodo.'; end if;
    update matches set match_phase='extra_time',period='extra_first_half',is_paused=true,elapsed_seconds=0,started_at=null,first_half_seconds=sec where id=m.id;
  elsif p_action='event' then
    value:=case p_event_type when 'basket_inside' then 1 when 'basket_outside' then 2 when 'basket_free_throw' then 1 when 'basket_foul' then 0 end;
    if value is null then raise exception 'Evento inválido.'; end if;
    insert into match_events(match_id,team_id,player_id,event_type,points,match_second,created_by)
      values(m.id,p_team_id,p_player_id,p_event_type,value,sec,auth.uid());
  elsif p_action='correct' then
    if nullif(trim(p_reason),'') is null then raise exception 'Indica el motivo.'; end if;
    insert into match_event_corrections(match_event_id,match_id,event_type,points_removed,corrected_by,reason)
      select id,match_id,event_type,points,auth.uid(),trim(p_reason) from match_events where id=p_event_id and match_id=m.id and not is_corrected;
    if not found then raise exception 'El evento no existe o ya fue corregido.'; end if;
    update match_events set is_corrected=true,correction_reason=trim(p_reason),corrected_by=auth.uid(),corrected_at=now() where id=p_event_id and match_id=m.id;
  elsif p_action='substitute' then
    if m.status<>'live' or not m.is_paused then raise exception 'Las sustituciones se realizan durante una pausa.'; end if;
    if p_team_id is null or p_team_id not in(m.local_team_id,m.visitor_team_id) or not exists(select 1 from fixture_players where fixture_id=m.fixture_id and team_id=p_team_id and player_id=p_player_id and not is_substitute)
      or not exists(select 1 from fixture_players where fixture_id=m.fixture_id and team_id=p_team_id and player_id=p_player_in and is_substitute) then raise exception 'Selecciona un jugador en cancha y un suplente del mismo equipo.'; end if;
    update fixture_players set is_substitute=true where fixture_id=m.fixture_id and team_id=p_team_id and player_id=p_player_id;
    update fixture_players set is_substitute=false where fixture_id=m.fixture_id and team_id=p_team_id and player_id=p_player_in;
    update matches set basketball_version=basketball_version+1 where id=m.id;
  elsif p_action='finish' then
    update matches set status='finished',is_paused=true,elapsed_seconds=sec,started_at=null,finished_at=clock_timestamp() where id=m.id;
  else raise exception 'Acción inválida.';
  end if;
end $$;
revoke all on function public.basketball_match_action(uuid,integer,text,uuid,text,uuid,uuid,text,uuid) from public,anon;
grant execute on function public.basketball_match_action(uuid,integer,text,uuid,text,uuid,uuid,text,uuid) to authenticated;

commit;
