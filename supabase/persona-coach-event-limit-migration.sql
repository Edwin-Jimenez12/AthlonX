-- Entrenador con plan Libre: 5 eventos de equipo al mes (creados por él, en todos sus equipos).
-- Cuenta solo las altas nuevas; editar un evento existente no consume cupo.
-- Idempotente: se puede volver a ejecutar.

create or replace function public.enforce_coach_event_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_code text;
  v_count integer;
  v_start timestamptz := date_trunc('month', now());
begin
  if new.created_by is null then return new; end if;

  -- Rol del creador en este equipo. Si además es directivo o dueño, no aplica el límite de entrenador.
  select m.role into v_role from public.team_user_memberships m
  where m.team_id = new.team_id and m.user_id = new.created_by and m.status = 'active'
  order by case m.role when 'owner' then 1 when 'directivo' then 2 when 'entrenador' then 3 when 'staff' then 4 else 5 end
  limit 1;
  if v_role is distinct from 'entrenador' then return new; end if;

  -- Plan de la persona (entrenador). Sin plan activo cuenta como Libre.
  select p.code into v_code from public.account_plans ap
  join public.plans p on p.code = ap.plan_code
  where ap.account_type = 'persona' and ap.account_id = new.created_by and (ap.ends_at is null or ap.ends_at > now())
  limit 1;
  if coalesce(v_code, 'libre') <> 'libre' then return new; end if;

  select count(*) into v_count from public.team_calendar_events e
  where e.created_by = new.created_by
    and e.created_at >= v_start and e.created_at < v_start + interval '1 month'
    and exists (select 1 from public.team_user_memberships m
                where m.team_id = e.team_id and m.user_id = new.created_by and m.status = 'active' and m.role = 'entrenador');
  if v_count >= 5 then
    raise exception 'Tu plan Libre permite 5 eventos de equipo al mes. Mejora a Pro para crear más.';
  end if;
  return new;
end;
$$;

drop trigger if exists team_calendar_events_coach_limit on public.team_calendar_events;
create trigger team_calendar_events_coach_limit
  before insert on public.team_calendar_events
  for each row execute function public.enforce_coach_event_limit();
