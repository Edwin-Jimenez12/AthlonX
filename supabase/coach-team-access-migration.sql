-- AthlonX: acceso de entrenadores y equipos administrables por usuario.
-- Ejecutar despues de schema.sql, sports-schema.sql y organization-access-migration.sql.

alter table public.teams
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists discipline_id uuid references public.disciplines(id) on delete restrict,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

create table if not exists public.team_user_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'directivo', 'entrenador', 'staff', 'atleta')),
  status text not null default 'active' check (status in ('active', 'pending', 'revoked')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

alter table public.team_user_memberships enable row level security;

drop policy if exists "Users can view their team memberships" on public.team_user_memberships;
create policy "Users can view their team memberships"
  on public.team_user_memberships for select to authenticated
  using (user_id = auth.uid());

grant select on public.team_user_memberships to authenticated;

-- Repara cuentas antiguas cuyo rol estaba en los metadatos pero no en user_roles.
insert into public.user_roles (user_id, role)
select u.id, 'entrenador'
from auth.users u
where u.raw_user_meta_data -> 'roles' ? 'entrenador'
  and not exists (
    select 1 from public.user_roles r
    where r.user_id = u.id and r.role = 'entrenador'
  )
on conflict (user_id, role) do nothing;

create or replace function public.handle_new_team_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_team_name text := trim(coalesce(new.raw_user_meta_data ->> 'team_name', ''));
  v_team_city text := nullif(trim(new.raw_user_meta_data ->> 'team_city'), '');
  v_discipline_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', 'persona') <> 'equipo'
     or v_team_name = '' then
    return new;
  end if;

  select d.id into v_discipline_id
  from public.disciplines d
  where d.id::text = new.raw_user_meta_data ->> 'team_discipline'
    and d.is_active = true
    and d.code in ('rugby', 'baloncesto');

  insert into public.teams (name, city, created_by, discipline_id)
  values (v_team_name, v_team_city, new.id, v_discipline_id)
  returning id into v_team_id;

  insert into public.team_user_memberships (team_id, user_id, role, status)
  values (v_team_id, new.id, 'owner', 'active')
  on conflict (team_id, user_id) do update set status = 'active';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_team_account on auth.users;
create trigger on_auth_user_created_team_account
  after insert on auth.users
  for each row execute procedure public.handle_new_team_account();

-- Vincula invitaciones de equipo con la cuenta del entrenador al reclamarlas.
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
