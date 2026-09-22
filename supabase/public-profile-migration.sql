-- Datos publicos y seguros para abrir perfiles encontrados en el directorio.
-- Ejecutar despues de identity-affiliations-migration.sql y public-search-migration.sql.

create or replace function public.get_public_profile(p_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'username', p.username,
        'athlonx_code', p.athlonx_code
      )
      from public.profiles p
      where p.id = p_profile_id and p.is_searchable = true
    ),
    'roles', coalesce((
      select jsonb_agg(distinct jsonb_build_object('role', r.role) order by jsonb_build_object('role', r.role))
      from public.user_roles r
      where r.user_id = p_profile_id
        and r.role in ('atleta', 'entrenador', 'staff', 'directivo')
    ), '[]'::jsonb),
    'labels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', labels.role,
        'role_label', labels.role_label,
        'organization_id', labels.organization_id,
        'organization_name', labels.organization_name,
        'team_id', labels.team_id,
        'team_name', labels.team_name
      ) order by coalesce(labels.role_label, labels.role), coalesce(labels.team_name, labels.organization_name))
      from public.profile_affiliation_labels labels
      where labels.user_id = p_profile_id
    ), '[]'::jsonb),
    'team_affiliations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'team_id', t.id,
        'team_name', t.name,
        'team_city', t.city,
        'organization_id', t.organization_id,
        'organization_name', o.name,
        'discipline_id', d.id,
        'discipline_code', d.code,
        'discipline_name', d.name,
        'role', m.role,
        'role_label', m.role_label
      ) order by d.name, t.name)
      from public.team_user_memberships m
      join public.teams t on t.id = m.team_id
      left join public.organizations o on o.id = t.organization_id
      left join public.disciplines d on d.id = t.discipline_id
      where m.user_id = p_profile_id and m.status = 'active'
    ), '[]'::jsonb),
    'disciplines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', discipline.id,
        'code', discipline.code,
        'name', discipline.name
      ) order by discipline.name)
      from (
        select distinct d.id, d.code, d.name
        from public.team_user_memberships m
        join public.teams t on t.id = m.team_id
        join public.disciplines d on d.id = t.discipline_id
        where m.user_id = p_profile_id and m.status = 'active'
        union
        select distinct d.id, d.code, d.name
        from public.organization_members m
        join public.organization_disciplines od on od.organization_id = m.organization_id
        join public.disciplines d on d.id = od.discipline_id
        where m.user_id = p_profile_id and m.status = 'active'
      ) discipline
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to authenticated;
