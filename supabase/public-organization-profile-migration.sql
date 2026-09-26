-- Perfil publico completo de organizaciones.
-- Ejecutar despues de public-entities-migration.sql y public-search-migration.sql.

alter table public.organizations
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists website_url text,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

update public.organizations
set contact_email = institutional_email
where contact_email is null
  and institutional_email is not null;

update public.organizations
set contact_phone = phone
where contact_phone is null
  and phone is not null;

create or replace function public.get_public_organization_profile(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'organization', (
      select jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'type', o.type,
        'country', o.country,
        'city', coalesce(o.city, o.province),
        'logo_url', o.logo_url,
        'description', o.description,
        'slug', o.slug,
        'athlonx_code', o.athlonx_code,
        'handle', o.handle,
        'contact_email', coalesce(o.contact_email, o.institutional_email),
        'contact_phone', o.contact_phone,
        'website_url', o.website_url,
        'social_links', coalesce(o.social_links, '{}'::jsonb)
      )
      from public.organizations o
      where o.id = p_organization_id
        and o.is_public = true
        and o.status = 'active'
    ),
    'disciplines', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'code', d.code, 'name', d.name) order by d.name)
      from public.organization_disciplines od
      join public.disciplines d on d.id = od.discipline_id
      where od.organization_id = p_organization_id
    ), '[]'::jsonb),
    'modalities', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'code', m.code, 'name', m.name, 'discipline_id', m.discipline_id) order by m.name)
      from public.organization_modalities om
      join public.sport_modalities m on m.id = om.modality_id
      where om.organization_id = p_organization_id
        and m.is_active = true
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'logo_url', t.logo_url,
        'country', t.country,
        'city', t.city,
        'discipline_id', d.id,
        'discipline_code', d.code,
        'discipline_name', d.name,
        'athlonx_code', t.athlonx_code,
        'handle', t.handle
      ) order by d.name, t.name)
      from public.teams t
      left join public.disciplines d on d.id = t.discipline_id
      where t.organization_id = p_organization_id
        and t.is_public = true
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'username', p.username,
        'role', m.role,
        'role_label', m.role_label,
        'team_names', coalesce((
          select array_agg(distinct member_team.name order by member_team.name)
          from public.team_user_memberships tum
          join public.teams member_team on member_team.id = tum.team_id
          where tum.user_id = m.user_id
            and tum.status = 'active'
            and member_team.organization_id = p_organization_id
        ), '{}'::text[])
      ) order by p.full_name)
      from public.organization_members m
      join public.profiles p on p.id = m.user_id
      where m.organization_id = p_organization_id
        and m.status = 'active'
        and p.is_searchable = true
    ), '[]'::jsonb),
    'direct_athletes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'username', p.username,
        'role', m.role,
        'role_label', m.role_label
      ) order by p.full_name)
      from public.organization_members m
      join public.profiles p on p.id = m.user_id
      where m.organization_id = p_organization_id
        and m.role = 'atleta'
        and m.status = 'active'
        and p.is_searchable = true
        and not exists (
          select 1
          from public.team_user_memberships tum
          join public.teams member_team on member_team.id = tum.team_id
          where tum.user_id = m.user_id
            and tum.status = 'active'
            and member_team.organization_id = p_organization_id
        )
    ), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', relation.id,
        'direction', relation.direction,
        'relationship_type', relation.relationship_type,
        'organization_id', relation.organization_id,
        'organization_name', relation.organization_name,
        'discipline_name', relation.discipline_name
      ) order by relation.direction, relation.organization_name)
      from (
        select r.id, 'subordinate'::text as direction, r.relationship_type, child.id as organization_id, child.name as organization_name, d.name as discipline_name
        from public.organization_relationships r
        join public.organizations child on child.id = r.subordinate_organization_id
        left join public.disciplines d on d.id = r.discipline_id
        where r.superior_organization_id = p_organization_id
          and r.status = 'active'
          and child.is_public = true
        union all
        select r.id, 'superior'::text as direction, r.relationship_type, parent.id, parent.name, d.name
        from public.organization_relationships r
        join public.organizations parent on parent.id = r.superior_organization_id
        left join public.disciplines d on d.id = r.discipline_id
        where r.subordinate_organization_id = p_organization_id
          and r.status = 'active'
          and parent.is_public = true
      ) relation
    ), '[]'::jsonb),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'name', item.name,
        'slug', item.slug,
        'season', item.season,
        'status', item.status,
        'location', item.location,
        'start_date', item.start_date,
        'end_date', item.end_date,
        'discipline_id', item.discipline_id,
        'discipline_name', item.discipline_name,
        'modality', item.modality,
        'participation_type', case
          when item.created_by_organization and coalesce(array_length(item.team_names, 1), 0) > 0 then 'created_and_participated'
          when item.created_by_organization then 'created'
          else 'participated'
        end,
        'participating_team_names', coalesce(item.team_names, '{}'::text[])
      ) order by coalesce(item.start_date, item.created_at) desc, item.name)
      from (
        select
          t.id,
          t.name,
          t.slug,
          t.season,
          t.status,
          t.location,
          t.start_date,
          t.end_date,
          t.created_at,
          t.discipline_id,
          d.name as discipline_name,
          case when sm.id is null then null else jsonb_build_object('id', sm.id, 'code', sm.code, 'name', sm.name) end as modality,
          bool_or(t.organization_id = p_organization_id) as created_by_organization,
          array_agg(distinct member_team.name) filter (where member_team.organization_id = p_organization_id) as team_names
        from public.tournaments t
        left join public.tournament_teams tt on tt.tournament_id = t.id
        left join public.teams member_team on member_team.id = tt.team_id
        left join public.disciplines d on d.id = t.discipline_id
        left join public.sport_modalities sm on sm.id = t.modality_id
        where t.is_public = true
          and t.status in ('published', 'in_progress', 'finished')
          and (t.organization_id = p_organization_id or member_team.organization_id = p_organization_id)
        group by t.id, t.name, t.slug, t.season, t.status, t.location, t.start_date, t.end_date, t.created_at, t.discipline_id, d.name, sm.id, sm.code, sm.name
      ) item
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_organization_profile(uuid) from public;
grant execute on function public.get_public_organization_profile(uuid) to authenticated;
