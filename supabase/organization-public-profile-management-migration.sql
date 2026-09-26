-- Edicion protegida del perfil publico de organizaciones.
-- Ejecutar despues de public-organization-profile-migration.sql
-- y organization-access-migration.sql.

create table if not exists public.organization_profile_edit_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  changed_by uuid not null references auth.users(id),
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.organization_profile_edit_history enable row level security;

drop policy if exists "Organization managers can view profile edit history" on public.organization_profile_edit_history;
create policy "Organization managers can view profile edit history"
  on public.organization_profile_edit_history for select to authenticated
  using (public.is_organization_manager(organization_id));

create or replace function public.update_organization_public_profile(
  p_organization_id uuid,
  p_profile jsonb,
  p_discipline_ids uuid[] default '{}',
  p_modality_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_history_id uuid;
begin
  if not public.is_organization_manager(p_organization_id) then
    raise exception 'No tienes permisos para editar esta organización';
  end if;

  select jsonb_build_object(
    'name', o.name,
    'type', o.type,
    'handle', o.handle,
    'country', o.country,
    'city', o.city,
    'description', o.description,
    'logo_url', o.logo_url,
    'contact_email', coalesce(o.contact_email, o.institutional_email),
    'contact_phone', coalesce(o.contact_phone, o.phone),
    'website_url', o.website_url,
    'social_links', coalesce(o.social_links, '{}'::jsonb),
    'is_public', o.is_public
  )
  into v_before
  from public.organizations o
  where o.id = p_organization_id
  for update;

  if v_before is null then
    raise exception 'La organización no existe';
  end if;

  update public.organizations
  set name = coalesce(nullif(trim(p_profile ->> 'name'), ''), name),
      type = coalesce(nullif(trim(p_profile ->> 'type'), ''), type),
      handle = nullif(trim(both '@' from lower(trim(p_profile ->> 'handle'))), ''),
      country = coalesce(nullif(trim(p_profile ->> 'country'), ''), country),
      city = nullif(trim(p_profile ->> 'city'), ''),
      description = nullif(trim(p_profile ->> 'description'), ''),
      logo_url = nullif(trim(p_profile ->> 'logo_url'), ''),
      contact_email = nullif(trim(p_profile ->> 'contact_email'), ''),
      institutional_email = nullif(trim(p_profile ->> 'contact_email'), ''),
      contact_phone = nullif(trim(p_profile ->> 'contact_phone'), ''),
      phone = nullif(trim(p_profile ->> 'contact_phone'), ''),
      website_url = nullif(trim(p_profile ->> 'website_url'), ''),
      social_links = coalesce(p_profile -> 'social_links', '{}'::jsonb),
      is_public = coalesce((p_profile ->> 'is_public')::boolean, is_public),
      updated_at = now()
  where id = p_organization_id;

  delete from public.organization_disciplines
  where organization_id = p_organization_id;

  insert into public.organization_disciplines (organization_id, discipline_id)
  select p_organization_id, selected.discipline_id
  from unnest(coalesce(p_discipline_ids, '{}'::uuid[])) as selected(discipline_id)
  join public.disciplines d on d.id = selected.discipline_id and d.is_active = true
  on conflict (organization_id, discipline_id) do nothing;

  delete from public.organization_modalities
  where organization_id = p_organization_id;

  insert into public.organization_modalities (organization_id, modality_id)
  select p_organization_id, selected.modality_id
  from unnest(coalesce(p_modality_ids, '{}'::uuid[])) as selected(modality_id)
  join public.sport_modalities m on m.id = selected.modality_id and m.is_active = true
  on conflict (organization_id, modality_id) do nothing;

  select jsonb_build_object(
    'name', o.name,
    'type', o.type,
    'handle', o.handle,
    'country', o.country,
    'city', o.city,
    'description', o.description,
    'logo_url', o.logo_url,
    'contact_email', coalesce(o.contact_email, o.institutional_email),
    'contact_phone', coalesce(o.contact_phone, o.phone),
    'website_url', o.website_url,
    'social_links', coalesce(o.social_links, '{}'::jsonb),
    'is_public', o.is_public,
    'discipline_ids', coalesce((select jsonb_agg(od.discipline_id order by od.discipline_id) from public.organization_disciplines od where od.organization_id = o.id), '[]'::jsonb),
    'modality_ids', coalesce((select jsonb_agg(om.modality_id order by om.modality_id) from public.organization_modalities om where om.organization_id = o.id), '[]'::jsonb)
  )
  into v_after
  from public.organizations o
  where o.id = p_organization_id;

  insert into public.organization_profile_edit_history (organization_id, changed_by, changes)
  values (p_organization_id, auth.uid(), jsonb_build_object('before', v_before, 'after', v_after))
  returning id into v_history_id;

  return jsonb_build_object('organization_id', p_organization_id, 'history_id', v_history_id, 'profile', v_after);
end;
$$;

revoke all on function public.update_organization_public_profile(uuid, jsonb, uuid[], uuid[]) from public;
grant execute on function public.update_organization_public_profile(uuid, jsonb, uuid[], uuid[]) to authenticated;
grant select on public.organization_profile_edit_history to authenticated;
