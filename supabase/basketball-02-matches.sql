-- 2/3: eventos y reloj de básquet en las tablas compartidas. Requiere basketball-01-settings.sql.
begin;
alter table public.match_events drop constraint if exists match_events_event_type_check;
alter table public.match_events add constraint match_events_event_type_check check(event_type in(
  'try','conversion','penalty','goal','penalty_kick','yellow_card','red_card','injured','concussion',
  'basket_inside','basket_outside','basket_free_throw','basket_foul'
));

create or replace function public.sync_basketball_score(p_match_id uuid)
returns void language sql security definer set search_path=public as $$
  update matches m set
    local_score=coalesce((select sum(points) from match_events e where e.match_id=m.id and e.team_id=m.local_team_id and not e.is_corrected and e.event_type in('basket_inside','basket_outside','basket_free_throw')),0),
    visitor_score=coalesce((select sum(points) from match_events e where e.match_id=m.id and e.team_id=m.visitor_team_id and not e.is_corrected and e.event_type in('basket_inside','basket_outside','basket_free_throw')),0)
  where m.id=p_match_id;
$$;
revoke all on function public.sync_basketball_score(uuid) from public,anon,authenticated;

-- La lógica de fútbol y rugby se conserva; básquet sale por su rama explícita.
create or replace function public.sync_match_score_from_events()
returns trigger language plpgsql security definer set search_path=public as $$
declare mid uuid; lid uuid; vid uuid; sport text;
begin
  mid:=case when tg_op='DELETE' then old.match_id else new.match_id end;
  select m.local_team_id,m.visitor_team_id,d.code into lid,vid,sport from matches m
    join fixtures f on f.id=m.fixture_id join tournaments t on t.id=f.tournament_id join disciplines d on d.id=t.discipline_id where m.id=mid;
  if sport='baloncesto' then
    perform sync_basketball_score(mid);
  elsif sport in('futbol','rugby') then
    update matches m set
      local_score=coalesce((select sum(e.points) from match_events e where e.match_id=mid and e.team_id=lid and not e.is_corrected
        and ((sport='futbol' and e.event_type in('goal','penalty_kick')) or (sport='rugby' and e.event_type in('try','conversion','penalty')))),0),
      visitor_score=coalesce((select sum(e.points) from match_events e where e.match_id=mid and e.team_id=vid and not e.is_corrected
        and ((sport='futbol' and e.event_type in('goal','penalty_kick')) or (sport='rugby' and e.event_type in('try','conversion','penalty')))),0)
    where m.id=mid;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;

create or replace function public.validate_basketball_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare m matches%rowtype; sport text; expected integer; seconds integer; config tournament_basketball_settings%rowtype;
begin
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
end $$;
drop trigger if exists validate_basketball_event_trigger on public.match_events;
create trigger validate_basketball_event_trigger before insert or update or delete on public.match_events for each row execute function public.validate_basketball_event();

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
  if new.match_phase='extra_time' and old.match_phase='regular' and (sec<s.period_minutes*60 or ls<>vs) then raise exception 'La prórroga requiere empate al finalizar el periodo.'; end if;
  if new.status='finished' and ((new.match_phase='regular' and (sec<s.period_minutes*60 or ls=vs)) or (new.match_phase='extra_time' and abs(ls-vs)<2)) then raise exception 'Falta completar el periodo o alcanzar la ventaja de 2 puntos en prórroga.'; end if;
  new.basketball_version:=old.basketball_version+1;
  return new;
end $$;
drop trigger if exists validate_basketball_match_trigger on public.matches;
create trigger validate_basketball_match_trigger before update on public.matches for each row execute function public.validate_basketball_match();

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
    if exists(select 1 from unnest(array[m.local_team_id,m.visitor_team_id]) team_id where
      (select count(*) from fixture_players fp where fp.fixture_id=m.fixture_id and fp.team_id=team_id and not fp.is_substitute)<>3
      or (select count(*) from fixture_players fp where fp.fixture_id=m.fixture_id and fp.team_id=team_id) not between 3 and 6) then raise exception 'Cada equipo necesita 3 jugadores en cancha y hasta 3 suplentes.'; end if;
    update matches set status='live',is_paused=false,started_at=clock_timestamp() where id=m.id;
    update tournaments set status='in_progress' where id=t.id;
  elsif p_action='pause' then
    if m.status<>'live' or m.is_paused then raise exception 'El reloj ya está detenido.'; end if;
    update matches set is_paused=true,elapsed_seconds=sec,started_at=null where id=m.id;
  elsif p_action='overtime' then
    if m.match_phase<>'regular' or sec<s.period_minutes*60 or m.local_score<>m.visitor_score then raise exception 'Se requiere empate al terminar el periodo.'; end if;
    update matches set match_phase='extra_time',period='extra_first_half',is_paused=true,elapsed_seconds=0,started_at=null,first_half_seconds=sec where id=m.id;
  elsif p_action='event' then
    value:=case p_event_type when 'basket_inside' then 1 when 'basket_outside' then 2 when 'basket_free_throw' then 1 when 'basket_foul' then 0 end;
    if value is null then raise exception 'Evento inválido.'; end if;
    insert into match_events(match_id,team_id,player_id,event_type,points,match_second,created_by)
      values(m.id,p_team_id,p_player_id,p_event_type,value,sec,auth.uid());
    select * into m from matches where id=p_match_id;
    if m.match_phase='extra_time' and abs(m.local_score-m.visitor_score)>=2 then
      update matches set status='finished',is_paused=true,elapsed_seconds=sec,started_at=null,finished_at=clock_timestamp() where id=m.id;
    end if;
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
