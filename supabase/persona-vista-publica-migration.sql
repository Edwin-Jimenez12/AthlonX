-- Vista pública de persona (VISTA PUBLICA - PERSONA).
-- Ejecutar en Supabase > SQL Editor después de profile-redesign-migration.sql.
-- Solo expone datos públicos: correo y teléfono únicamente si la persona los marcó como públicos,
-- edad solo si marcó "age" como pública, y torneos solo si los marcó como visibles.

-- 1. País de la persona (se muestra en la vista pública). Valor inicial: Panamá.
alter table public.profiles add column if not exists country text not null default 'Panamá';

-- 2. Payload del perfil público de persona.
--    Si el perfil no existe o no es buscable, devuelve { "profile": null } y nada más.
create or replace function public.get_public_persona_profile(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_profile_id and p.is_searchable = true
  ) then
    return jsonb_build_object('profile', null);
  end if;

  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'username', p.username,
        'athlonx_code', p.athlonx_code,
        'country', p.country
      )
      from public.profiles p
      where p.id = p_profile_id
    ),
    'public_age', public.profile_public_age(p_profile_id),
    'contact', jsonb_build_object(
      'email', case when exists (
        select 1 from public.profile_privacy_settings s
        where s.user_id = p_profile_id and s.field_key = 'email' and s.visibility = 'public'
      ) then (select u.email from auth.users u where u.id = p_profile_id) end,
      'phone', case when exists (
        select 1 from public.profile_privacy_settings s
        where s.user_id = p_profile_id and s.field_key = 'phone' and s.visibility = 'public'
      ) then (select nullif(trim(p.phone), '') from public.profiles p where p.id = p_profile_id) end
    ),
    'roles', coalesce((
      select jsonb_agg(distinct jsonb_build_object('role', r.role))
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
    'teams', coalesce((
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
      ) order by t.name, m.role)
      from public.team_user_memberships m
      join public.teams t on t.id = m.team_id and t.is_public = true
      left join public.organizations o on o.id = t.organization_id
      left join public.disciplines d on d.id = t.discipline_id
      where m.user_id = p_profile_id and m.status = 'active'
    ), '[]'::jsonb),
    'organizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'organization_id', org.id,
        'name', org.name,
        'athlonx_code', org.athlonx_code,
        'role', org.role
      ) order by org.name)
      from (
        select o.id, o.name, o.athlonx_code, min(m.role) as role
        from public.organization_members m
        join public.organizations o on o.id = m.organization_id and o.is_public = true and o.status = 'active'
        where m.user_id = p_profile_id and m.status = 'active'
        group by o.id, o.name, o.athlonx_code
      ) org
    ), '[]'::jsonb),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'athlonx_code', t.athlonx_code,
        'season', t.season,
        'status', t.status,
        'start_date', t.start_date,
        'end_date', t.end_date,
        'cover_url', t.cover_url,
        'discipline_name', d.name,
        'modality', case when sm.id is null then null else jsonb_build_object('id', sm.id, 'code', sm.code, 'name', sm.name) end,
        'created_by_profile', (t.created_by = p_profile_id)
      ) order by t.start_date desc nulls last, t.name)
      from public.profile_tournament_visibility v
      join public.tournaments t on t.id = v.tournament_id
      left join public.disciplines d on d.id = t.discipline_id
      left join public.sport_modalities sm on sm.id = t.modality_id
      where v.user_id = p_profile_id
        and v.is_visible = true
        and t.status in ('published', 'in_progress', 'finished')
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
        join public.teams t on t.id = m.team_id and t.is_public = true
        join public.disciplines d on d.id = t.discipline_id
        where m.user_id = p_profile_id and m.status = 'active'
        union
        select distinct d.id, d.code, d.name
        from public.organization_members m
        join public.organizations o on o.id = m.organization_id and o.is_public = true and o.status = 'active'
        join public.organization_disciplines od on od.organization_id = m.organization_id
        join public.disciplines d on d.id = od.discipline_id
        where m.user_id = p_profile_id and m.status = 'active'
      ) discipline
    ), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

revoke all on function public.get_public_persona_profile(uuid) from public;
grant execute on function public.get_public_persona_profile(uuid) to anon, authenticated;
