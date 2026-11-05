-- Estadísticas por año (año calendario, del 1 de enero al 31 de diciembre) para todas las cuentas.
-- Se quita la temporada personalizada: team_season() siempre devuelve el año en curso.
-- Free ve el año actual; Pro (plan con comparar_temporadas en equipos, o plan Pro/Élite en personas) ve años anteriores.
-- Idempotente: se puede volver a ejecutar.

-- 1) Temporada = año calendario.
create or replace function public.team_season(p_team uuid)
returns table (starts_on date, ends_on date)
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc('year', current_date)::date,
         (date_trunc('year', current_date) + interval '1 year - 1 day')::date
  from public.teams t where t.id = p_team;
$$;

-- 2) Estadísticas del equipo por rango de fechas. Ya no reemplaza el rango por la temporada.
create or replace function public.team_season_stats(p_team uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.calendar_team_role(p_team) is null and not public.platform_can_manage_account('equipo', p_team) then
    raise exception 'No puedes ver las estadísticas de este equipo.';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'El rango de fechas no es válido.';
  end if;
  if (extract(year from p_from) <> extract(year from current_date) or extract(year from p_to) <> extract(year from current_date))
     and not public.platform_team_feature(p_team, 'comparar_temporadas') then
    raise exception 'Tu plan permite ver solo el año actual.';
  end if;
  return jsonb_build_object(
    'from', p_from, 'to', p_to,
    'summary', (select jsonb_build_object(
        'jugados', count(*),
        'ganados', count(*) filter (where (m.local_team_id = p_team and m.local_score > m.visitor_score) or (m.visitor_team_id = p_team and m.visitor_score > m.local_score)),
        'empatados', count(*) filter (where m.local_score = m.visitor_score),
        'perdidos', count(*) filter (where (m.local_team_id = p_team and m.local_score < m.visitor_score) or (m.visitor_team_id = p_team and m.visitor_score < m.local_score)))
      from public.matches m
      where m.status = 'finished' and (m.local_team_id = p_team or m.visitor_team_id = p_team)
        and coalesce(m.finished_at, m.started_at)::date between p_from and p_to),
    'players', coalesce((select jsonb_agg(row_to_json(z) order by z.puntos desc, z.nombre) from (
        select pl.full_name as nombre, coalesce(pl.position, '—') as posicion,
          count(distinct e.match_id) as partidos,
          count(*) filter (where e.event_type in ('try', 'goal', 'basket_inside', 'basket_outside', 'basket_free_throw')) as anotaciones,
          coalesce(sum(e.points), 0) as puntos,
          count(*) filter (where e.event_type in ('yellow_card', 'red_card')) as tarjetas
        from public.match_events e
        join public.matches m on m.id = e.match_id
        join public.players pl on pl.id = e.player_id
        where e.team_id = p_team and not coalesce(e.is_corrected, false) and m.status = 'finished'
          and coalesce(m.finished_at, m.started_at)::date between p_from and p_to
        group by pl.id, pl.full_name, pl.position) z), '[]'::jsonb)
  );
end;
$$;

-- 3) Estadísticas propias de la persona (atleta o entrenador), en todos sus equipos.
-- Usa players.user_id, así no depende de coincidir por nombre. Free: año actual; Pro: años anteriores.
create or replace function public.persona_personal_stats(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan jsonb;
  v_pro boolean;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_from is null or p_to is null or p_from > p_to then raise exception 'El rango de fechas no es válido.'; end if;
  v_plan := public.platform_account_plan('persona', v_uid);
  v_pro := coalesce(v_plan ->> 'code', 'libre') <> 'libre';
  if not v_pro and (extract(year from p_from) <> extract(year from current_date) or extract(year from p_to) <> extract(year from current_date)) then
    raise exception 'Tu plan permite ver solo el año actual.';
  end if;
  return jsonb_build_object(
    'from', p_from, 'to', p_to, 'plan', coalesce(v_plan ->> 'code', 'libre'),
    'teams', coalesce((select jsonb_agg(row_to_json(z) order by z.equipo) from (
        select e.team_id, t.name as equipo,
          count(distinct e.match_id) as partidos,
          count(*) filter (where e.event_type in ('try', 'goal', 'basket_inside', 'basket_outside', 'basket_free_throw')) as anotaciones,
          coalesce(sum(e.points), 0) as puntos,
          count(*) filter (where e.event_type in ('yellow_card', 'red_card')) as tarjetas
        from public.players pl
        join public.match_events e on e.player_id = pl.id
        join public.matches m on m.id = e.match_id
        join public.teams t on t.id = e.team_id
        where pl.user_id = v_uid and not coalesce(e.is_corrected, false) and m.status = 'finished'
          and coalesce(m.finished_at, m.started_at)::date between p_from and p_to
        group by e.team_id, t.name) z), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.team_season_stats(uuid, date, date) from public, anon;
revoke all on function public.persona_personal_stats(date, date) from public, anon;
grant execute on function public.team_season_stats(uuid, date, date) to authenticated;
grant execute on function public.persona_personal_stats(date, date) to authenticated;
