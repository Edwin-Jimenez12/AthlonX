-- AthlonX: calendario de la cuenta de organización.
-- Eventos de la organización (editables por quien la gestiona) y, si el plan incluye "vista_equipos" (Pro y Élite),
-- también los eventos de sus equipos, solo lectura. El límite de eventos al mes ya lo aplica enforce_org_event_limit.
-- Idempotente. Requiere organization-plans-migration.sql.

create or replace function public.calendar_org_feed(p_org uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_manager boolean := public.is_organization_manager(p_org);
  v_teams boolean := public.platform_org_feature(p_org, 'vista_equipos');
  v_result jsonb;
begin
  if not (v_manager or exists (select 1 from public.organization_members m
                               where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active')) then
    raise exception 'No puedes ver el calendario de esta organización.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at), '[]'::jsonb) into v_result
  from (
    select 'organization'::text as source, e.id, e.organization_id as owner_id, o.name as owner_name, e.title, e.description,
      e.location, e.event_type, e.starts_at, e.ends_at, e.all_day, 0 as occurrence, 'none'::text as repeat_rule,
      null::text as my_response, v_manager as can_edit
    from public.organization_calendar_events e
    join public.organizations o on o.id = e.organization_id
    where e.organization_id = p_org and e.starts_at < p_to and e.ends_at > p_from
    union all
    select 'team', e.id, e.team_id, t.name, e.title, e.description,
      e.location, e.event_type::text, e.starts_at, e.ends_at, e.all_day, 0, 'none', null::text, false
    from public.team_calendar_events e
    join public.teams t on t.id = e.team_id
    where v_teams and t.organization_id = p_org and t.temporary_tournament_id is null
      and e.starts_at < p_to and e.ends_at > p_from
  ) x;

  return v_result;
end;
$$;

revoke all on function public.calendar_org_feed(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.calendar_org_feed(uuid, timestamptz, timestamptz) to authenticated;
