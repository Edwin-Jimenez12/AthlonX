-- 3/3: publicación del cuadro, avance, plantillas y lectura del torneo.
-- Requiere basketball-01-settings.sql y basketball-02-matches.sql.
begin;
create or replace function public.publish_basketball_bracket(p_tournament_id uuid,p_team_ids uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare t tournaments%rowtype; s tournament_basketball_settings%rowtype; sid uuid; fid uuid; mid uuid; r integer; pos integer; slot integer:=0; base integer; divid uuid; n integer; entry record;
begin
  select * into t from tournaments where id=p_tournament_id and created_by=auth.uid() for update;
  if not found then raise exception 'No autorizado.'; end if;
  select * into s from tournament_basketball_settings where tournament_id=t.id;
  if not found or t.start_date is null then raise exception 'Completa la configuración y la fecha del torneo.'; end if;
  if exists(select 1 from tournament_knockout_stages where tournament_id=t.id) or exists(select 1 from fixtures where tournament_id=t.id) then raise exception 'Ya existe un cuadro o fixture. No se reemplazarán datos.'; end if;
  if coalesce(cardinality(p_team_ids),0)<>16 or (select count(distinct x) from unnest(p_team_ids) x)<>16
    or (select count(*) from tournament_teams where tournament_id=t.id)<>16
    or exists(select 1 from unnest(p_team_ids) x where not exists(select 1 from tournament_teams tt where tt.tournament_id=t.id and tt.team_id=x)) then raise exception 'Cada uno de los 16 equipos debe aparecer exactamente una vez.'; end if;
  if (select count(distinct division_id) from tournament_teams where tournament_id=t.id)<>1 then raise exception 'El cuadro 3x3 utiliza una sola división de 16 equipos.'; end if;
  select division_id into divid from tournament_teams where tournament_id=t.id limit 1;
  for entry in select tt.*,x.name,x.discipline_id from tournament_teams tt join teams x on x.id=tt.team_id where tt.tournament_id=t.id loop
    if entry.discipline_id is distinct from t.discipline_id then raise exception 'El equipo % no pertenece a baloncesto.',entry.name; end if;
    if nullif(trim(entry.basketball_colors),'') is null then raise exception 'Faltan colores distintivos de %.',entry.name; end if;
    select count(*) into n from basketball_roster(t.id,entry.team_id);
    if n not between 3 and 6 then raise exception '% necesita una plantilla de 3 a 6 jugadores.',entry.name; end if;
  end loop;
  for r in 1..4 loop
    insert into tournament_knockout_stages(tournament_id,division_id,name,round_number,bracket_size)
      values(t.id,divid,(array['Octavos de final','Cuartos de final','Semifinales','Final'])[r],r,16/(2^(r-1))::integer) returning id into sid;
    insert into fixtures(tournament_id,date_number,calendar_date,is_locked) values(t.id,r,t.start_date,true) returning id into fid;
    for pos in 1..(8/(2^(r-1))::integer) loop
      mid:=null;
      if r=1 then
        insert into matches(fixture_id,division_id,local_team_id,visitor_team_id,court_number,scheduled_time,fixture_order)
          values(fid,divid,p_team_ids[pos*2-1],p_team_ids[pos*2],1,s.opens_at+make_interval(mins=>slot*(s.period_minutes+s.interval_minutes)),slot) returning id into mid;
      end if;
      insert into tournament_knockout_matches(stage_id,position,local_team_id,visitor_team_id,local_source,visitor_source,source_match_id,status)
        values(sid,pos,case when r=1 then p_team_ids[pos*2-1] end,case when r=1 then p_team_ids[pos*2] end,
          case when r>1 then 'Ganador cruce '||(pos*2-1) end,case when r>1 then 'Ganador cruce '||(pos*2) end,mid,case when r=1 then 'scheduled' else 'pending' end);
      slot:=slot+1;
    end loop;
  end loop;
end $$;

create or replace function public.advance_basketball_winner()
returns trigger language plpgsql security definer set search_path=public as $$
declare b tournament_knockout_matches%rowtype; st tournament_knockout_stages%rowtype; nxt tournament_knockout_matches%rowtype; s tournament_basketball_settings%rowtype; win uuid; fid uuid; mid uuid; slot integer;
begin
  if new.status<>'finished' or old.status='finished' then return new; end if;
  select c.* into s from tournament_basketball_settings c join fixtures f on f.tournament_id=c.tournament_id where f.id=new.fixture_id;
  if not found then return new; end if;
  perform 1 from tournaments where id=s.tournament_id for update;
  select * into b from tournament_knockout_matches where source_match_id=new.id for update;
  if not found then raise exception 'El partido no pertenece al cuadro de básquet.'; end if;
  select * into st from tournament_knockout_stages where id=b.stage_id;
  win:=case when new.local_score>new.visitor_score then new.local_team_id else new.visitor_team_id end;
  update tournament_knockout_matches set winner_team_id=win,status='finished' where id=b.id;
  if not exists(select 1 from tournament_knockout_matches where stage_id=st.id and status<>'finished') then update tournament_knockout_stages set status='finished' where id=st.id; end if;
  if st.round_number=4 then update tournaments set status='finished' where id=s.tournament_id; return new; end if;
  select x.* into nxt from tournament_knockout_matches x join tournament_knockout_stages y on y.id=x.stage_id
    where y.tournament_id=s.tournament_id and y.round_number=st.round_number+1 and x.position=(b.position+1)/2 for update of x;
  if b.position%2=1 then nxt.local_team_id:=win; else nxt.visitor_team_id:=win; end if;
  if nxt.local_team_id is not null and nxt.visitor_team_id is not null and nxt.source_match_id is null then
    select id into fid from fixtures where tournament_id=s.tournament_id and date_number=st.round_number+1;
    slot:=case st.round_number when 1 then 8 when 2 then 12 else 14 end+nxt.position-1;
    insert into matches(fixture_id,division_id,local_team_id,visitor_team_id,court_number,scheduled_time,fixture_order)
      values(fid,st.division_id,nxt.local_team_id,nxt.visitor_team_id,1,s.opens_at+make_interval(mins=>slot*(s.period_minutes+s.interval_minutes)),slot) returning id into mid;
    nxt.source_match_id:=mid;
  end if;
  update tournament_knockout_matches set local_team_id=nxt.local_team_id,visitor_team_id=nxt.visitor_team_id,source_match_id=nxt.source_match_id,
    status=case when nxt.source_match_id is null then 'pending' else 'scheduled' end where id=nxt.id;
  return new;
end $$;
drop trigger if exists advance_basketball_winner_trigger on public.matches;
create trigger advance_basketball_winner_trigger after update on public.matches for each row execute function public.advance_basketball_winner();

create or replace function public.guard_basketball_teams()
returns trigger language plpgsql security definer set search_path=public as $$
declare tid uuid; cid uuid;
begin
  if tg_op='UPDATE' and new.tournament_id<>old.tournament_id and exists(select 1 from tournament_basketball_settings where tournament_id=old.tournament_id)
    and exists(select 1 from tournament_knockout_stages where tournament_id=old.tournament_id) then raise exception 'Los equipos del cuadro publicado no se pueden trasladar a otro torneo.'; end if;
  tid:=case when tg_op='DELETE' then old.tournament_id else new.tournament_id end;
  select t.id into cid from tournaments t join disciplines d on d.id=t.discipline_id join sport_modalities m on m.id=t.modality_id
    where t.id=tid and d.code='baloncesto' and m.code='3x3' for update of t;
  if cid is null then if tg_op='DELETE' then return old; end if; return new; end if;
  if tg_op='UPDATE' and (new.tournament_id,new.division_id,new.team_id) is not distinct from(old.tournament_id,old.division_id,old.team_id) then return new; end if;
  if exists(select 1 from tournament_knockout_stages where tournament_id=tid) then raise exception 'Los equipos del cuadro publicado están bloqueados.'; end if;
  if tg_op<>'DELETE' and (select count(*) from tournament_teams where tournament_id=tid and id is distinct from new.id)>=16 then raise exception 'Baloncesto 3x3 admite 16 equipos.'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists guard_basketball_teams_trigger on public.tournament_teams;
create trigger guard_basketball_teams_trigger before insert or update or delete on public.tournament_teams for each row execute function public.guard_basketball_teams();

create or replace function public.guard_basketball_roster()
returns trigger language plpgsql security definer set search_path=public as $$
declare tid uuid; teamid uuid; row_t record; n integer;
begin
  if tg_op='UPDATE' and (new.team_id,new.player_id,new.division_id) is not distinct from(old.team_id,old.player_id,old.division_id) then return new; end if;
  for row_t in select distinct t.id,tt.team_id from tournaments t join tournament_teams tt on tt.tournament_id=t.id
    join tournament_basketball_settings s on s.tournament_id=t.id
    where t.status<>'finished' and (tt.team_id=case when tg_op='INSERT' then new.team_id else old.team_id end
      or tt.team_id=case when tg_op='DELETE' then old.team_id else new.team_id end) order by t.id loop
    perform 1 from tournaments where id=row_t.id for update;
    if exists(select 1 from tournament_knockout_stages where tournament_id=row_t.id) then raise exception 'Las plantillas del cuadro publicado están bloqueadas.'; end if;
    select count(*) into n from basketball_roster(row_t.id,row_t.team_id);
    if n>6 then raise exception 'La plantilla 3x3 admite como máximo 6 jugadores.'; end if;
  end loop;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists guard_basketball_roster_trigger on public.team_players;
create trigger guard_basketball_roster_trigger after insert or update or delete on public.team_players for each row execute function public.guard_basketball_roster();

-- Un resultado no puede desaparecer por una eliminación directa del partido.
create or replace function public.guard_basketball_match_delete()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from fixtures f join tournament_basketball_settings s on s.tournament_id=f.tournament_id where f.id=old.fixture_id)
    and exists(select 1 from tournament_knockout_matches where source_match_id=old.id) then raise exception 'Los partidos de un cuadro publicado están bloqueados.'; end if;
  return old;
end $$;
drop trigger if exists guard_basketball_match_delete_trigger on public.matches;
create trigger guard_basketball_match_delete_trigger before delete on public.matches for each row execute function public.guard_basketball_match_delete();

create or replace function public.guard_basketball_tournament()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from tournament_basketball_settings where tournament_id=old.id) then return new; end if;
  if (new.discipline_id,new.modality_id) is distinct from(old.discipline_id,old.modality_id) then raise exception 'Este torneo tiene reglas propias de baloncesto 3x3; conserva su disciplina y modalidad.'; end if;
  if exists(select 1 from tournament_knockout_stages where tournament_id=old.id) and (new.start_date,new.end_date) is distinct from(old.start_date,old.end_date) then raise exception 'Las fechas quedaron bloqueadas al publicar el cuadro.'; end if;
  if new.status='finished' and old.status<>'finished' and not exists(select 1 from tournament_knockout_matches b join tournament_knockout_stages s on s.id=b.stage_id where s.tournament_id=old.id and s.round_number=4 and b.winner_team_id is not null) then raise exception 'La liga finaliza al confirmar el ganador de la final.'; end if;
  return new;
end $$;
drop trigger if exists guard_basketball_tournament_trigger on public.tournaments;
create trigger guard_basketball_tournament_trigger before update on public.tournaments for each row execute function public.guard_basketball_tournament();

create or replace function public.guard_basketball_lineup()
returns trigger language plpgsql security definer set search_path=public as $$
declare fid uuid; tid uuid; teamid uuid; n integer;
begin
  if tg_op='UPDATE' and (new.fixture_id,new.team_id,new.player_id) is distinct from(old.fixture_id,old.team_id,old.player_id)
    and exists(select 1 from fixtures f join tournament_basketball_settings s on s.tournament_id=f.tournament_id where f.id in(old.fixture_id,new.fixture_id)) then raise exception 'No se puede trasladar una alineación de básquet a otro partido o equipo.'; end if;
  fid:=case when tg_op='DELETE' then old.fixture_id else new.fixture_id end;
  teamid:=case when tg_op='DELETE' then old.team_id else new.team_id end;
  select f.tournament_id into tid from fixtures f join tournament_basketball_settings s on s.tournament_id=f.tournament_id where f.id=fid;
  if tid is null then if tg_op='DELETE' then return old; end if; return new; end if;
  if exists(select 1 from matches m where m.fixture_id=fid and (m.local_team_id=teamid or m.visitor_team_id=teamid) and m.status='finished') then raise exception 'La alineación del resultado final está bloqueada.'; end if;
  if exists(select 1 from matches m where m.fixture_id=fid and (m.local_team_id=teamid or m.visitor_team_id=teamid) and m.status='live' and not m.is_paused) then raise exception 'Pausa el reloj antes de modificar la alineación.'; end if;
  if tg_op<>'DELETE' then
    if not exists(select 1 from basketball_roster(tid,new.team_id) r where r.player_id=new.player_id) then raise exception 'El jugador no pertenece a la plantilla 3x3.'; end if;
    if (select count(*) from fixture_players where fixture_id=fid and team_id=new.team_id)>6
      or (select count(*) from fixture_players where fixture_id=fid and team_id=new.team_id and not is_substitute)>3 then raise exception 'La alineación admite 3 jugadores en cancha y hasta 3 suplentes.'; end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists guard_basketball_lineup_trigger on public.fixture_players;
create trigger guard_basketball_lineup_trigger after insert or update or delete on public.fixture_players for each row execute function public.guard_basketball_lineup();

create or replace function public.guard_basketball_bracket()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if pg_trigger_depth()=1 and exists(select 1 from tournament_knockout_stages st join tournament_basketball_settings s on s.tournament_id=st.tournament_id where st.id=old.stage_id) then
    raise exception 'El cuadro publicado solo cambia mediante el avance automático del ganador.';
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists guard_basketball_bracket_trigger on public.tournament_knockout_matches;
create trigger guard_basketball_bracket_trigger before update or delete on public.tournament_knockout_matches for each row execute function public.guard_basketball_bracket();

create or replace function public.guard_basketball_stages()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if pg_trigger_depth()=1 and exists(select 1 from tournament_basketball_settings where tournament_id=old.tournament_id) then raise exception 'Las rondas del cuadro publicado están bloqueadas.'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists guard_basketball_stages_trigger on public.tournament_knockout_stages;
create trigger guard_basketball_stages_trigger before update or delete on public.tournament_knockout_stages for each row execute function public.guard_basketball_stages();

create or replace function public.get_basketball_tournament(p_tournament_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare t tournaments%rowtype; result jsonb;
begin
  select * into t from tournaments where id=p_tournament_id and (created_by=auth.uid() or(is_public and status in('published','in_progress','finished')));
  if not found then raise exception 'Este torneo no está disponible.'; end if;
  select jsonb_build_object('settings',to_jsonb(s),'can_manage',coalesce(t.created_by=auth.uid(),false),
    'stages',coalesce((select jsonb_agg(to_jsonb(st) order by st.round_number) from tournament_knockout_stages st where st.tournament_id=t.id),'[]'::jsonb),
    'bracket',coalesce((select jsonb_agg(to_jsonb(b) order by st.round_number,b.position) from tournament_knockout_matches b join tournament_knockout_stages st on st.id=b.stage_id where st.tournament_id=t.id),'[]'::jsonb),
    'matches',coalesce((select jsonb_agg(to_jsonb(m) order by m.fixture_order,m.scheduled_time) from matches m join fixtures f on f.id=m.fixture_id where f.tournament_id=t.id),'[]'::jsonb),
    'teams',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'division_id',tt.division_id,'colors',tt.basketball_colors,
      'roster',coalesce((select jsonb_agg(to_jsonb(r)) from basketball_roster(t.id,x.id) r),'[]'::jsonb)) order by x.name) from tournament_teams tt join teams x on x.id=tt.team_id where tt.tournament_id=t.id),'[]'::jsonb),
    'lineups',coalesce((select jsonb_agg(to_jsonb(fp)) from fixture_players fp join fixtures f on f.id=fp.fixture_id where f.tournament_id=t.id),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'match_id',e.match_id,'team_id',e.team_id,'player_id',e.player_id,'event_type',e.event_type,'points',e.points,'match_second',e.match_second,'is_corrected',e.is_corrected,'correction_reason',e.correction_reason) order by e.created_at desc)
      from match_events e join matches m on m.id=e.match_id join fixtures f on f.id=m.fixture_id where f.tournament_id=t.id),'[]'::jsonb)
  ) into result from tournament_basketball_settings s where s.tournament_id=t.id;
  if result is null then raise exception 'Falta configurar el torneo 3x3.'; end if;
  return result;
end $$;
revoke all on function public.publish_basketball_bracket(uuid,uuid[]) from public,anon;
grant execute on function public.publish_basketball_bracket(uuid,uuid[]) to authenticated;
revoke all on function public.get_basketball_tournament(uuid) from public;
grant execute on function public.get_basketball_tournament(uuid) to anon,authenticated;
commit;
