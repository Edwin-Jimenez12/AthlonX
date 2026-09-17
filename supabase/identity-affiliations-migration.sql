-- AthlonX: roles normalizados, jerarquia institucional y afiliaciones aceptables.
-- Ejecutar despues de schema.sql, multidiscipline-migration.sql,
-- organization-access-migration.sql, organization-management-migration.sql,
-- organization-registration-fix-migration.sql y coach-team-access-migration.sql.

create extension if not exists pgcrypto;

-- Elimina los valores que ya no forman parte del producto.
alter table public.user_roles drop constraint if exists user_roles_role_check;
update public.user_roles set role = 'entrenador' where role = 'coach';
delete from public.user_roles where role = 'espectador';
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('atleta', 'entrenador', 'staff', 'directivo'));

update auth.users u
set raw_user_meta_data = jsonb_set(
  coalesce(u.raw_user_meta_data, '{}'::jsonb),
  '{roles}',
  coalesce((
    select jsonb_agg(normalized.role order by normalized.role)
    from (
      select distinct case when role_name = 'coach' then 'entrenador' else role_name end as role
      from jsonb_array_elements_text(coalesce(u.raw_user_meta_data -> 'roles', '[]'::jsonb)) as role_name
    ) normalized
    where normalized.role in ('atleta', 'entrenador', 'staff', 'directivo')
  ), '["atleta"]'::jsonb),
  true
)
where jsonb_typeof(coalesce(u.raw_user_meta_data -> 'roles', '[]'::jsonb)) = 'array';

alter table public.pending_profiles drop constraint if exists pending_profiles_participation_type_check;
update public.pending_profiles set participation_type = 'entrenador' where participation_type = 'coach';
alter table public.pending_profiles add constraint pending_profiles_participation_type_check
  check (participation_type in ('atleta', 'entrenador', 'staff', 'directivo'));

alter table public.team_members drop constraint if exists team_members_role_check;
update public.team_members set role = 'entrenador' where role = 'coach';
alter table public.team_members add constraint team_members_role_check
  check (role in ('atleta', 'entrenador', 'staff', 'directivo'));

update public.organization_members set role = 'entrenador' where role = 'coach';
update public.organization_members set role = 'staff' where role in ('arbitro', 'analista');
alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('owner', 'atleta', 'entrenador', 'staff', 'directivo'));

update public.organization_invites set role = 'entrenador' where role = 'coach';
update public.organization_invites set role = 'staff' where role in ('arbitro', 'analista');
alter table public.organization_invites drop constraint if exists organization_invites_role_check;
alter table public.organization_invites add constraint organization_invites_role_check
  check (role in ('atleta', 'entrenador', 'staff', 'directivo'));

-- Los perfiles de equipo se gestionan desde su propio registro, no como organizaciones.
update public.organizations set type = 'liga' where type = 'federacion_liga';
update public.organizations set type = 'organizacion_deportiva' where type in ('academia', 'equipo', 'club');
alter table public.organizations drop constraint if exists organizations_type_check;
alter table public.organizations add constraint organizations_type_check
  check (type in (
    'comite_olimpico', 'institucion_gubernamental', 'federacion', 'union',
    'liga', 'organizacion_deportiva', 'otro'
  ));

alter table public.organization_members
  add column if not exists role_label text;

alter table public.team_user_memberships
  add column if not exists role_label text;
alter table public.team_user_memberships drop constraint if exists team_user_memberships_role_check;
update public.team_user_memberships set role = 'entrenador' where role = 'coach';
alter table public.team_user_memberships add constraint team_user_memberships_role_check
  check (role in ('owner', 'atleta', 'entrenador', 'staff', 'directivo'));

-- Modalidades: una disciplina puede tener varias expresiones competitivas.
create table if not exists public.sport_modalities (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (discipline_id, code),
  unique (discipline_id, name)
);

insert into public.sport_modalities (discipline_id, code, name)
select d.id, seed.code, seed.name
from public.disciplines d
cross join (values
  ('rugby', 'seven', 'Rugby 7'),
  ('rugby', 'xv', 'Rugby XV'),
  ('baloncesto', '5x5', 'Baloncesto 5x5')
) as seed(discipline_code, code, name)
where d.code = seed.discipline_code
on conflict (discipline_id, code) do update set name = excluded.name;

create table if not exists public.organization_modalities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  modality_id uuid not null references public.sport_modalities(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, modality_id)
);

-- La relacion apunta siempre de la autoridad superior hacia la organizacion subordinada.
create table if not exists public.organization_relationships (
  id uuid primary key default gen_random_uuid(),
  superior_organization_id uuid not null references public.organizations(id) on delete cascade,
  subordinate_organization_id uuid not null references public.organizations(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('supervisa', 'reconoce', 'afiliada_a', 'avala', 'coordina')),
  discipline_id uuid references public.disciplines(id) on delete restrict,
  modality_id uuid references public.sport_modalities(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'revoked')),
  requested_by uuid not null references auth.users(id),
  responded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (superior_organization_id <> subordinate_organization_id)
);

create unique index if not exists organization_relationships_unique_active
  on public.organization_relationships (superior_organization_id, subordinate_organization_id, relationship_type, coalesce(discipline_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(modality_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status in ('pending', 'active');

-- Peticiones de afiliacion: una cuenta propone una vinculacion y el receptor la acepta.
create table if not exists public.affiliation_requests (
  id uuid primary key default gen_random_uuid(),
  source_organization_id uuid references public.organizations(id) on delete cascade,
  source_team_id uuid references public.teams(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  target_organization_id uuid references public.organizations(id) on delete cascade,
  role text check (role in ('atleta', 'entrenador', 'staff', 'directivo')),
  role_label text,
  relationship_type text check (relationship_type in ('supervisa', 'reconoce', 'afiliada_a', 'avala', 'coordina')),
  discipline_id uuid references public.disciplines(id) on delete restrict,
  modality_id uuid references public.sport_modalities(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'revoked')),
  created_by uuid not null references auth.users(id),
  responded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check ((source_organization_id is not null) <> (source_team_id is not null)),
  check ((target_user_id is not null) <> (target_organization_id is not null)),
  check ((target_user_id is null and role is null) or (target_user_id is not null and role is not null)),
  check ((target_organization_id is null and relationship_type is null) or (target_organization_id is not null and relationship_type is not null))
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  affiliation_request_id uuid references public.affiliation_requests(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sport_modalities enable row level security;
alter table public.organization_modalities enable row level security;
alter table public.organization_relationships enable row level security;
alter table public.affiliation_requests enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists "Authenticated users can view active modalities" on public.sport_modalities;
create policy "Authenticated users can view active modalities"
  on public.sport_modalities for select to authenticated using (is_active = true);

drop policy if exists "Authenticated users can view organization modalities" on public.organization_modalities;
create policy "Authenticated users can view organization modalities"
  on public.organization_modalities for select to authenticated using (true);
drop policy if exists "Organization managers can manage organization modalities" on public.organization_modalities;
create policy "Organization managers can manage organization modalities"
  on public.organization_modalities for all to authenticated
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

drop policy if exists "Users can view related organization relationships" on public.organization_relationships;
create policy "Users can view related organization relationships"
  on public.organization_relationships for select to authenticated
  using (
    exists (select 1 from public.organization_members m where m.organization_id in (superior_organization_id, subordinate_organization_id) and m.user_id = auth.uid())
    or status = 'active'
  );

drop policy if exists "Users can view their affiliation requests" on public.affiliation_requests;
create policy "Users can view their affiliation requests"
  on public.affiliation_requests for select to authenticated
  using (
    created_by = auth.uid()
    or target_user_id = auth.uid()
    or (target_organization_id is not null and public.is_organization_manager(target_organization_id))
  );

drop policy if exists "Users can view their notifications" on public.user_notifications;
create policy "Users can view their notifications"
  on public.user_notifications for select to authenticated using (recipient_user_id = auth.uid());
drop policy if exists "Users can update their notifications" on public.user_notifications;
create policy "Users can update their notifications"
  on public.user_notifications for update to authenticated
  using (recipient_user_id = auth.uid()) with check (recipient_user_id = auth.uid());

create or replace function public.notify_affiliation_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.target_user_id is not null then
    insert into public.user_notifications (recipient_user_id, affiliation_request_id, title, body)
    values (
      new.target_user_id,
      new.id,
      'Nueva vinculacion en AthlonX',
      coalesce(new.role_label, initcap(new.role)) || '. Revisa la solicitud para aceptarla o rechazarla.'
    );
  else
    insert into public.user_notifications (recipient_user_id, affiliation_request_id, title, body)
    select m.user_id, new.id, 'Nueva relacion institucional',
      'Una organizacion propone una relacion de ' || replace(new.relationship_type, '_', ' ') || '.'
    from public.organization_members m
    where m.organization_id = new.target_organization_id
      and m.role in ('owner', 'directivo')
      and m.status = 'active'
      and m.user_id is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_affiliation_request_created on public.affiliation_requests;
create trigger on_affiliation_request_created
  after insert on public.affiliation_requests
  for each row execute procedure public.notify_affiliation_request();

create or replace function public.create_affiliation_request(
  p_target_user_id uuid default null,
  p_target_organization_id uuid default null,
  p_source_organization_id uuid default null,
  p_source_team_id uuid default null,
  p_role text default null,
  p_role_label text default null,
  p_relationship_type text default null,
  p_discipline_id uuid default null,
  p_modality_id uuid default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if (p_source_organization_id is null) = (p_source_team_id is null) then
    raise exception 'Debes indicar una organizacion o un equipo de origen';
  end if;
  if (p_target_user_id is null) = (p_target_organization_id is null) then
    raise exception 'Debes indicar una persona o una organizacion de destino';
  end if;
  if p_source_organization_id is not null and not public.is_organization_manager(p_source_organization_id) then
    raise exception 'No tienes permisos para enviar solicitudes desde esta organizacion';
  end if;
  if p_source_team_id is not null and not exists (
    select 1 from public.team_user_memberships m
    where m.team_id = p_source_team_id and m.user_id = auth.uid()
      and m.role in ('owner', 'directivo') and m.status = 'active'
  ) then
    raise exception 'No tienes permisos para enviar solicitudes desde este equipo';
  end if;
  if p_target_user_id is not null and p_role not in ('atleta', 'entrenador', 'staff', 'directivo') then
    raise exception 'El rol de la persona no es valido';
  end if;
  if p_target_organization_id is not null and p_relationship_type not in ('supervisa', 'reconoce', 'afiliada_a', 'avala', 'coordina') then
    raise exception 'El tipo de relacion institucional no es valido';
  end if;

  insert into public.affiliation_requests (
    source_organization_id, source_team_id, target_user_id, target_organization_id,
    role, role_label, relationship_type, discipline_id, modality_id, created_by
  ) values (
    p_source_organization_id, p_source_team_id, p_target_user_id, p_target_organization_id,
    p_role, nullif(trim(p_role_label), ''), p_relationship_type, p_discipline_id, p_modality_id, auth.uid()
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.respond_affiliation_request(p_request_id uuid, p_decision text)
returns public.affiliation_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_request public.affiliation_requests%rowtype;
  v_can_respond boolean;
begin
  select * into v_request from public.affiliation_requests where id = p_request_id for update;
  if not found or v_request.status <> 'pending' then
    raise exception 'La solicitud ya no esta disponible';
  end if;
  v_can_respond := v_request.target_user_id = auth.uid()
    or (v_request.target_organization_id is not null and public.is_organization_manager(v_request.target_organization_id));
  if not v_can_respond then raise exception 'No puedes responder esta solicitud'; end if;
  if p_decision not in ('accepted', 'rejected') then raise exception 'Decision no valida'; end if;

  if p_decision = 'accepted' then
    if v_request.target_user_id is not null and v_request.source_organization_id is not null then
      insert into public.organization_members (organization_id, user_id, role, role_label, status)
      values (v_request.source_organization_id, v_request.target_user_id, v_request.role, v_request.role_label, 'active')
      on conflict (organization_id, user_id, role) do update set role_label = excluded.role_label, status = 'active';
    elsif v_request.target_user_id is not null and v_request.source_team_id is not null then
      insert into public.team_user_memberships (team_id, user_id, role, role_label, status)
      values (v_request.source_team_id, v_request.target_user_id, v_request.role, v_request.role_label, 'active')
      on conflict (team_id, user_id) do update set role = excluded.role, role_label = excluded.role_label, status = 'active';
    elsif v_request.target_organization_id is not null then
      insert into public.organization_relationships (superior_organization_id, subordinate_organization_id, relationship_type, discipline_id, modality_id, status, requested_by, responded_by, responded_at)
      values (v_request.source_organization_id, v_request.target_organization_id, v_request.relationship_type, v_request.discipline_id, v_request.modality_id, 'active', v_request.created_by, auth.uid(), now());
    end if;
  end if;

  update public.affiliation_requests
  set status = p_decision, responded_by = auth.uid(), responded_at = now()
  where id = v_request.id
  returning * into v_request;

  update public.user_notifications
  set read_at = now()
  where affiliation_request_id = p_request_id and recipient_user_id = auth.uid();
  return v_request;
end;
$$;

-- Vista publica segura: nunca expone correo, telefono ni datos sensibles.
create or replace view public.profile_directory as
select id, full_name, avatar_url
from public.profiles;

create or replace view public.profile_affiliation_labels as
select m.user_id, m.role, m.role_label, o.id as organization_id, o.name as organization_name, null::uuid as team_id, null::text as team_name
from public.organization_members m
join public.organizations o on o.id = m.organization_id
where m.status = 'active' and m.user_id is not null
union all
select m.user_id, m.role, m.role_label, null::uuid, null::text, t.id, t.name
from public.team_user_memberships m
join public.teams t on t.id = m.team_id
where m.status = 'active';

grant select on public.sport_modalities, public.organization_modalities, public.organization_relationships, public.affiliation_requests, public.user_notifications, public.profile_directory, public.profile_affiliation_labels to authenticated;
grant execute on function public.create_affiliation_request(uuid, uuid, uuid, uuid, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.respond_affiliation_request(uuid, text) to authenticated;

-- Reclama invitaciones de equipo usando el vocabulario canonico actual.
create or replace function public.claim_participation_invite(p_code text)
returns table (pending_profile_id uuid, full_name text, participation_type text, organization_id uuid, team_id uuid, division_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.organization_invites%rowtype;
begin
  select * into v_invite
  from public.organization_invites
  where code_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex')
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'El codigo es invalido o ya expiro';
  end if;

  update public.organization_invites
  set used_at = now(), used_by = auth.uid(), claimed_at = now(), status = 'claimed'
  where id = v_invite.id;

  update public.pending_profiles
  set status = 'claimed', claimed_user_id = auth.uid(), claimed_at = now()
  where id = v_invite.pending_profile_id;

  insert into public.organization_members (organization_id, user_id, pending_profile_id, role, status)
  values (v_invite.organization_id, auth.uid(), v_invite.pending_profile_id, v_invite.role, 'active')
  on conflict (organization_id, user_id, role) do update set status = 'active';

  if v_invite.team_id is not null
     and v_invite.role in ('directivo', 'entrenador', 'staff', 'atleta') then
    insert into public.team_user_memberships (team_id, user_id, role, status)
    values (v_invite.team_id, auth.uid(), v_invite.role, 'active')
    on conflict (team_id, user_id) do update set role = excluded.role, status = 'active';
  end if;

  return query
  select p.id, p.full_name, p.participation_type,
    v_invite.organization_id, v_invite.team_id, v_invite.division_id
  from public.pending_profiles p
  where p.id = v_invite.pending_profile_id;
end;
$$;

revoke all on function public.claim_participation_invite(text) from public;
grant execute on function public.claim_participation_invite(text) to authenticated;

-- Reemplaza los nombres antiguos en cuentas nuevas y conserva el alta automatica de organizaciones.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_organization_id uuid;
  v_organization_name text := trim(coalesce(new.raw_user_meta_data ->> 'organization_name', ''));
  v_organization_slug text;
begin
  insert into public.profiles (id, full_name, email_verified)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email_confirmed_at is not null)
  on conflict (id) do update set full_name = excluded.full_name, email_verified = excluded.email_verified, updated_at = now();

  insert into public.user_roles (user_id, role)
  select new.id, case when role_name = 'coach' then 'entrenador' else role_name end
  from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'roles', '["atleta"]'::jsonb)) as role_name
  where role_name in ('atleta', 'coach', 'entrenador', 'staff', 'directivo')
  on conflict (user_id, role) do nothing;

  if coalesce(new.raw_user_meta_data ->> 'account_type', 'persona') = 'organizacion' and v_organization_name <> '' then
    v_organization_slug := nullif(trim(both '-' from lower(regexp_replace(v_organization_name, '[^a-zA-Z0-9]+', '-', 'g'))), '');
    v_organization_slug := coalesce(v_organization_slug, 'organizacion') || '-' || substr(new.id::text, 1, 8);
    insert into public.organizations (name, type, city, institutional_email, slug, created_by)
    values (v_organization_name, case when new.raw_user_meta_data ->> 'organization_type' in ('academia', 'equipo') then 'organizacion_deportiva' else coalesce(new.raw_user_meta_data ->> 'organization_type', 'organizacion_deportiva') end, nullif(trim(new.raw_user_meta_data ->> 'organization_city'), ''), new.email, v_organization_slug, new.id)
    returning id into v_organization_id;
    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_organization_id, new.id, 'owner', 'active')
    on conflict (organization_id, user_id, role) do update set status = 'active';
    insert into public.organization_disciplines (organization_id, discipline_id)
    select v_organization_id, d.id
    from public.disciplines d
    join jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'organization_disciplines', '[]'::jsonb)) selected on selected.value = d.id::text
    where d.is_active = true
    on conflict (organization_id, discipline_id) do nothing;
    insert into public.organization_modalities (organization_id, modality_id)
    select v_organization_id, m.id
    from public.sport_modalities m
    join jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'organization_modalities', '[]'::jsonb)) selected on selected.value = m.id::text
    where m.is_active = true
    on conflict (organization_id, modality_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.create_affiliation_request(uuid, uuid, uuid, uuid, text, text, text, uuid, uuid) from public;
revoke all on function public.respond_affiliation_request(uuid, text) from public;
