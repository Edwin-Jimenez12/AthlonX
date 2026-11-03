-- AthlonX: uso actual de los límites del plan de una organización (para la tarjeta "Límites del plan").
-- Idempotente. Requiere organization-plans-migration.sql.

create or replace function public.platform_org_usage(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
begin
  if not (public.platform_can_manage_account('organizacion', p_org)
          or exists (select 1 from public.organization_members m
                     where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'directivo'))) then
    raise exception 'No puedes ver el uso de esta organización.';
  end if;
  select * into v_plan from public.platform_org_plan(p_org);
  return jsonb_build_object(
    'plan', v_plan.name,
    'code', v_plan.code,
    'limits', v_plan.limits,
    'usage', jsonb_build_object(
      'equipos_afiliados', (select count(*) from public.teams t where t.organization_id = p_org and t.temporary_tournament_id is null and not public.org_team_is_own(p_org, t.created_by)),
      'equipos_propios', (select count(*) from public.teams t where t.organization_id = p_org and t.temporary_tournament_id is null and public.org_team_is_own(p_org, t.created_by)),
      'directivos_staff', (select count(*) from public.organization_members m where m.organization_id = p_org and m.role in ('directivo', 'staff') and m.status in ('active', 'pending')),
      'eventos_mes', (select count(*) from public.organization_calendar_events e where e.organization_id = p_org and e.created_at >= date_trunc('month', now())),
      'torneos_rapidos', (select count(*) from public.tournaments x where x.organization_id = p_org and x.status <> 'finished' and x.is_quick),
      'torneos_oficiales', (select count(*) from public.tournaments x where x.organization_id = p_org and x.status <> 'finished' and not x.is_quick)
    )
  );
end;
$$;

revoke all on function public.platform_org_usage(uuid) from public, anon;
grant execute on function public.platform_org_usage(uuid) to authenticated;
