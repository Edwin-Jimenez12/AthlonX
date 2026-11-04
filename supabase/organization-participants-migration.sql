-- AthlonX: lista de participantes de la organización (Pro y Élite, función "participantes").
-- Solo devuelve nombre, rol, equipo y estado: nunca datos de contacto.
-- Idempotente. Requiere organization-plans-migration.sql.

create or replace function public.platform_org_participants(p_org uuid)
returns table (person_name text, role text, team_name text, via_organization text, status text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.platform_can_manage_account('organizacion', p_org)
          or exists (select 1 from public.organization_members m
                     where m.organization_id = p_org and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'directivo'))) then
    raise exception 'No puedes ver los participantes de esta organización.';
  end if;
  if not public.platform_org_feature(p_org, 'participantes') then
    raise exception 'Participantes está disponible desde el plan Pro de organización.';
  end if;

  return query
  with org_teams as (
    -- Equipos de la organización y de las organizaciones afiliadas a ella.
    select t.id, t.name, null::text as via
    from public.teams t
    where t.organization_id = p_org and t.temporary_tournament_id is null
    union
    select t.id, t.name, o.name
    from public.organization_relationships r
    join public.organizations o on o.id = r.subordinate_organization_id
    join public.teams t on t.organization_id = r.subordinate_organization_id and t.temporary_tournament_id is null
    where r.superior_organization_id = p_org and r.status in ('active', 'accepted', 'approved')
  )
  select coalesce(nullif(trim(p.full_name), ''), 'Sin nombre'),
         case m.role when 'owner' then 'Directivo' when 'directivo' then 'Directivo' when 'staff' then 'Staff' else initcap(m.role) end,
         null::text, null::text,
         case m.status when 'active' then 'Activo' else 'Pendiente' end
  from public.organization_members m
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = p_org and m.status in ('active', 'pending')
  union all
  select coalesce(nullif(trim(p.full_name), ''), 'Sin nombre'),
         case u.role when 'entrenador' then 'Entrenador' when 'staff' then 'Staff' when 'atleta' then 'Atleta' else 'Directivo' end,
         ot.name, ot.via,
         case u.status when 'active' then 'Activo' else 'Pendiente' end
  from public.team_user_memberships u
  join org_teams ot on ot.id = u.team_id
  left join public.profiles p on p.id = u.user_id
  where u.status in ('active', 'pending')
  order by 1;
end;
$$;

revoke all on function public.platform_org_participants(uuid) from public, anon;
grant execute on function public.platform_org_participants(uuid) to authenticated;
