-- AthlonX: contextos de trabajo para usuarios con multiples roles.
-- Ejecutar despues de las migraciones de identidades, equipos y organizaciones.

create extension if not exists pgcrypto;

-- Un usuario puede tener mas de un rol dentro del mismo equipo.
alter table public.team_user_memberships
  drop constraint if exists team_user_memberships_team_id_user_id_key;

create unique index if not exists team_user_memberships_user_team_role_key
  on public.team_user_memberships (team_id, user_id, role);

create table if not exists public.user_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  context_type text not null check (context_type in ('personal', 'team', 'organization')),
  team_id uuid references public.teams(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  role text not null check (role in ('atleta', 'entrenador', 'staff', 'directivo')),
  role_label text,
  status text not null default 'active' check (status in ('active', 'pending', 'revoked')),
  created_at timestamptz not null default now(),
  check (
    (context_type = 'personal' and team_id is null and organization_id is null)
    or (context_type = 'team' and team_id is not null and organization_id is null)
    or (context_type = 'organization' and team_id is null and organization_id is not null)
  )
);

create unique index if not exists user_contexts_personal_role_key
  on public.user_contexts (user_id, role)
  where context_type = 'personal';

create unique index if not exists user_contexts_team_role_key
  on public.user_contexts (user_id, team_id, role)
  where context_type = 'team';

create unique index if not exists user_contexts_organization_role_key
  on public.user_contexts (user_id, organization_id, role)
  where context_type = 'organization';

create or replace function public.sync_user_context_from_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role in ('atleta', 'entrenador', 'staff', 'directivo') then
    insert into public.user_contexts (user_id, context_type, role, status)
    values (new.user_id, 'personal', new.role, 'active')
    on conflict (user_id, role) where context_type = 'personal'
    do update set status = 'active';
  end if;
  return new;
end;
$$;

create or replace function public.sync_user_context_from_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if new.user_id is null then
    return new;
  end if;

  v_role := case when new.role = 'owner' then 'directivo' else new.role end;
  if v_role not in ('atleta', 'entrenador', 'staff', 'directivo') then
    return new;
  end if;

  insert into public.user_contexts (user_id, context_type, organization_id, role, role_label, status)
  values (new.user_id, 'organization', new.organization_id, v_role, new.role_label, new.status)
  on conflict (user_id, organization_id, role) where context_type = 'organization'
  do update set role_label = excluded.role_label, status = excluded.status;
  return new;
end;
$$;

create or replace function public.sync_user_context_from_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := case when new.role = 'owner' then 'directivo' else new.role end;
  if v_role not in ('atleta', 'entrenador', 'staff', 'directivo') then
    return new;
  end if;

  insert into public.user_contexts (user_id, context_type, team_id, role, role_label, status)
  values (new.user_id, 'team', new.team_id, v_role, new.role_label, new.status)
  on conflict (user_id, team_id, role) where context_type = 'team'
  do update set role_label = excluded.role_label, status = excluded.status;
  return new;
end;
$$;

drop trigger if exists on_user_role_context_created on public.user_roles;
create trigger on_user_role_context_created
after insert or update on public.user_roles
for each row execute function public.sync_user_context_from_role();

drop trigger if exists on_organization_member_context_changed on public.organization_members;
create trigger on_organization_member_context_changed
after insert or update on public.organization_members
for each row execute function public.sync_user_context_from_organization();

drop trigger if exists on_team_membership_context_changed on public.team_user_memberships;
create trigger on_team_membership_context_changed
after insert or update on public.team_user_memberships
for each row execute function public.sync_user_context_from_team();

-- Sincroniza los registros que ya existian antes de esta migracion.
insert into public.user_contexts (user_id, context_type, role, status)
select user_id, 'personal', role, 'active'
from public.user_roles
where role in ('atleta', 'entrenador', 'staff', 'directivo')
on conflict (user_id, role) where context_type = 'personal' do update set status = 'active';

insert into public.user_contexts (user_id, context_type, organization_id, role, role_label, status)
select user_id,
  'organization',
  organization_id,
  case when role = 'owner' then 'directivo' else role end,
  role_label,
  status
from public.organization_members
where user_id is not null
  and case when role = 'owner' then 'directivo' else role end in ('atleta', 'entrenador', 'staff', 'directivo')
on conflict (user_id, organization_id, role) where context_type = 'organization'
do update set role_label = excluded.role_label, status = excluded.status;

insert into public.user_contexts (user_id, context_type, team_id, role, role_label, status)
select user_id,
  'team',
  team_id,
  case when role = 'owner' then 'directivo' else role end,
  role_label,
  status
from public.team_user_memberships
where case when role = 'owner' then 'directivo' else role end in ('atleta', 'entrenador', 'staff', 'directivo')
on conflict (user_id, team_id, role) where context_type = 'team'
do update set role_label = excluded.role_label, status = excluded.status;

alter table public.user_contexts enable row level security;

drop policy if exists "Users can view their active contexts" on public.user_contexts;
create policy "Users can view their active contexts"
on public.user_contexts
for select to authenticated
using (user_id = auth.uid());

grant select on public.user_contexts to authenticated;

-- Mantiene la aceptacion de invitaciones compatible con multiples roles por equipo.
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
    raise exception 'El código es inválido o ya expiró';
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
    on conflict (team_id, user_id, role) do update set status = 'active';
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
