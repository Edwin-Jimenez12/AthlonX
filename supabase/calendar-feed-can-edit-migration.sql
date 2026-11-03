-- AthlonX: el calendario indica qué eventos puede editar cada persona (can_edit).
-- Idempotente. Requiere team-calendar-roles-migration.sql.

create or replace function public.calendar_my_feed(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para ver tu calendario.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at), '[]'::jsonb) into v_result
  from (
    select 'team'::text as source, e.id, e.team_id as owner_id, t.name as owner_name, e.title, e.description,
      e.location, e.event_type::text as event_type, e.starts_at, e.ends_at, e.all_day, 0 as occurrence,
      'none'::text as repeat_rule, a.response as my_response, public.calendar_can_edit_team_event(e.id) as can_edit
    from public.team_calendar_events e
    join public.teams t on t.id = e.team_id
    left join public.calendar_attendance a on a.source = 'team' and a.event_id = e.id and a.user_id = auth.uid()
    where e.starts_at < p_to and e.ends_at > p_from
      and exists (select 1 from public.team_user_memberships m
                  where m.team_id = e.team_id and m.user_id = auth.uid() and m.status = 'active')
    union all
    select 'organization', e.id, e.organization_id, o.name, e.title, e.description,
      e.location, e.event_type::text, e.starts_at, e.ends_at, e.all_day, 0,
      'none', a.response, false
    from public.organization_calendar_events e
    join public.organizations o on o.id = e.organization_id
    left join public.calendar_attendance a on a.source = 'organization' and a.event_id = e.id and a.user_id = auth.uid()
    where e.starts_at < p_to and e.ends_at > p_from
      and exists (select 1 from public.organization_members m
                  where m.organization_id = e.organization_id and m.user_id = auth.uid() and m.status = 'active')
    union all
    select 'personal', pa.id, pa.user_id, null::text, pa.title, pa.description, pa.location, pa.event_type,
      pa.starts_at + occ.shift, pa.ends_at + occ.shift, pa.all_day, occ.n, pa.repeat_rule, null::text, true
    from public.personal_activities pa
    cross join lateral (
      select n, case pa.repeat_rule
        when 'weekly' then make_interval(weeks => n)
        when 'monthly' then make_interval(months => n)
        else make_interval() end as shift
      from generate_series(0, 300) as n
      where pa.repeat_rule <> 'none' or n = 0
    ) occ
    where pa.user_id = auth.uid()
      and (pa.repeat_until is null or pa.starts_at + occ.shift <= pa.repeat_until)
      and pa.starts_at + occ.shift < p_to and pa.ends_at + occ.shift > p_from
  ) x;

  return v_result;
end;
$$;

revoke all on function public.calendar_my_feed(timestamptz, timestamptz) from public, anon;
grant execute on function public.calendar_my_feed(timestamptz, timestamptz) to authenticated;
