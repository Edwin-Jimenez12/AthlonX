-- Ejecutar después de las migraciones vigentes de modalidades, equipos, reloj,
-- correcciones, football-eight-knockout y football-rugby-event-isolation.
-- 1/3: catálogo y configuración 3x3. No contiene pagos ni inscripciones.
begin;
insert into public.disciplines(code,name,is_active) values('baloncesto','Baloncesto',true) on conflict(code) do nothing;
insert into public.sport_modalities(discipline_id,code,name,is_active)
select id,'3x3','Baloncesto 3x3',true from public.disciplines where code='baloncesto'
on conflict(discipline_id,code) do nothing;

create table if not exists public.tournament_basketball_settings (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  period_minutes integer not null check(period_minutes between 1 and 120),
  interval_minutes integer not null check(interval_minutes between 0 and 120),
  overtime_minutes integer not null check(overtime_minutes between 1 and 120),
  opens_at time not null, closes_at time not null, venue text not null check(length(trim(venue))>0),
  check(closes_at>opens_at),
  check(extract(epoch from(closes_at-opens_at))/60 >= 15*period_minutes+14*interval_minutes)
);
alter table public.tournament_teams add column if not exists basketball_colors text;
alter table public.matches add column if not exists basketball_version integer not null default 0;
alter table public.tournament_basketball_settings enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='tournament_basketball_settings' and policyname='basketball_settings_read') then
    create policy basketball_settings_read on public.tournament_basketball_settings for select using(exists(
      select 1 from public.tournaments t where t.id=tournament_id and (t.created_by=auth.uid() or (t.is_public and t.status in('published','in_progress','finished')))
    ));
  end if;
end $$;
grant select on public.tournament_basketball_settings to anon,authenticated;

create or replace function public.basketball_roster(p_tournament_id uuid,p_team_id uuid)
returns table(player_id uuid,full_name text,is_substitute boolean)
language sql volatile security definer set search_path=public as $$
  select distinct p.id,p.full_name,tp.is_substitute
  from public.tournament_teams tt join public.tournament_divisions td on td.id=tt.division_id
  join public.team_players tp on tp.team_id=tt.team_id join public.players p on p.id=tp.player_id
  left join public.team_division_catalog dc on dc.id=tp.division_id
  join public.tournaments t on t.id=tt.tournament_id
  where tt.tournament_id=p_tournament_id and tt.team_id=p_team_id
    and (tp.division_id is null or lower(trim(dc.name))=lower(trim(td.name)))
    and (t.created_by=auth.uid() or (t.is_public and t.status in('published','in_progress','finished')));
$$;

create or replace function public.save_basketball_settings(p_tournament_id uuid,p_settings jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform 1 from tournaments t join disciplines d on d.id=t.discipline_id join sport_modalities m on m.id=t.modality_id
    where t.id=p_tournament_id and t.created_by=auth.uid() and d.code='baloncesto' and m.code='3x3' for update of t;
  if not found then raise exception 'No puedes configurar este torneo 3x3.'; end if;
  if exists(select 1 from tournament_knockout_stages where tournament_id=p_tournament_id) then raise exception 'La configuración está cerrada: el cuadro ya está publicado.'; end if;
  insert into tournament_basketball_settings(tournament_id,period_minutes,interval_minutes,overtime_minutes,opens_at,closes_at,venue)
    values(p_tournament_id,(p_settings->>'period_minutes')::integer,(p_settings->>'interval_minutes')::integer,
      (p_settings->>'overtime_minutes')::integer,(p_settings->>'opens_at')::time,(p_settings->>'closes_at')::time,trim(p_settings->>'venue'))
    on conflict(tournament_id) do update set period_minutes=excluded.period_minutes,interval_minutes=excluded.interval_minutes,
      overtime_minutes=excluded.overtime_minutes,opens_at=excluded.opens_at,closes_at=excluded.closes_at,venue=excluded.venue;
  update tournaments set location=trim(p_settings->>'venue') where id=p_tournament_id;
end $$;

create or replace function public.create_basketball_tournament(p_values jsonb,p_settings jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tid uuid; did uuid; mid uuid; oid uuid:=(p_values->>'organization_id')::uuid; teamid uuid:=(p_values->>'organizer_team_id')::uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if (oid is null)=(teamid is null) then raise exception 'Selecciona un perfil organizador.'; end if;
  if oid is not null and not exists(select 1 from organizations o where o.id=oid and (o.created_by=auth.uid() or exists(
    select 1 from organization_members x where x.organization_id=o.id and x.user_id=auth.uid() and x.status='active' and x.role in('owner','directivo')
  ))) then raise exception 'No puedes administrar esta organización.'; end if;
  if teamid is not null and not exists(select 1 from teams x where x.id=teamid and (x.created_by=auth.uid() or exists(
    select 1 from team_user_memberships tm where tm.team_id=x.id and tm.user_id=auth.uid() and tm.status='active' and tm.role in('owner','directivo')
  ))) then raise exception 'No puedes administrar este equipo.'; end if;
  if nullif(trim(p_values->>'name'),'') is null or nullif(p_values->>'start_date','') is null or nullif(p_values->>'end_date','') is null then raise exception 'Completa el nombre y las fechas.'; end if;
  if (p_values->>'end_date')::date<(p_values->>'start_date')::date then raise exception 'Revisa las fechas del torneo.'; end if;
  select id into did from disciplines where code='baloncesto' and is_active;
  select id into mid from sport_modalities where discipline_id=did and code='3x3' and is_active;
  if mid is null then raise exception 'Baloncesto 3x3 no está disponible.'; end if;
  insert into tournaments(name,slug,season,start_date,end_date,country,location,status,is_quick,created_by,organization_id,organizer_team_id,discipline_id,modality_id)
    values(trim(p_values->>'name'),'basket-3x3-'||gen_random_uuid(),extract(year from(p_values->>'start_date')::date)::text,
      (p_values->>'start_date')::date,(p_values->>'end_date')::date,'Panamá',trim(p_settings->>'venue'),'draft',coalesce((p_values->>'is_quick')::boolean,false),auth.uid(),oid,teamid,did,mid) returning id into tid;
  insert into tournament_divisions(tournament_id,name,sort_order) values(tid,'Primera división',0);
  perform save_basketball_settings(tid,p_settings);
  return (select jsonb_build_object('id',id,'slug',slug) from tournaments where id=tid);
end $$;

create or replace function public.set_basketball_team_colors(p_tournament_id uuid,p_team_id uuid,p_colors text)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform 1 from tournaments t join tournament_basketball_settings s on s.tournament_id=t.id
    where t.id=p_tournament_id and t.created_by=auth.uid() for update of t;
  if not found then raise exception 'No autorizado.'; end if;
  if nullif(trim(p_colors),'') is null or length(p_colors)>80 then raise exception 'Indica los colores distintivos del equipo (máximo 80 caracteres).'; end if;
  update tournament_teams set basketball_colors=trim(p_colors) where tournament_id=p_tournament_id and team_id=p_team_id;
  if not found then raise exception 'El equipo no pertenece al torneo.'; end if;
end $$;
revoke all on function public.create_basketball_tournament(jsonb,jsonb),public.save_basketball_settings(uuid,jsonb),public.set_basketball_team_colors(uuid,uuid,text) from public,anon;
grant execute on function public.create_basketball_tournament(jsonb,jsonb),public.save_basketball_settings(uuid,jsonb),public.set_basketball_team_colors(uuid,uuid,text) to authenticated;
revoke all on function public.basketball_roster(uuid,uuid) from public;
grant execute on function public.basketball_roster(uuid,uuid) to anon,authenticated;
commit;
