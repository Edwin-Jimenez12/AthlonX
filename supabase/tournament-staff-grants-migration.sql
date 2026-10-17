-- AthlonX: permisos temporales de árbitro / juez por liga (torneo).
-- El dueño de la liga otorga el permiso con una vigencia y puede revocarlo en cualquier momento.
-- Ejecutar en el SQL Editor de Supabase después de sports-schema.sql y tournament-callups-migration.sql.

create table if not exists public.tournament_staff_grants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  staff_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'arbitro' check (role in ('arbitro')),
  granted_by uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tournament_staff_grants_valid_period check (ends_at > starts_at)
);

create index if not exists tournament_staff_grants_staff_idx
  on public.tournament_staff_grants (staff_user_id)
  where revoked_at is null;

create index if not exists tournament_staff_grants_tournament_idx
  on public.tournament_staff_grants (tournament_id);

alter table public.tournament_staff_grants enable row level security;

drop policy if exists "tournament_staff_grants_select" on public.tournament_staff_grants;
create policy "tournament_staff_grants_select"
  on public.tournament_staff_grants
  for select
  to authenticated
  using (
    staff_user_id = auth.uid()
    or granted_by = auth.uid()
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_staff_grants.tournament_id
        and t.created_by = auth.uid()
    )
  );

-- Las escrituras solo se hacen con las funciones de abajo, nunca con inserts directos desde el cliente.
revoke insert, update, delete on public.tournament_staff_grants from anon, authenticated;

create or replace function public.grant_tournament_staff(
  p_tournament_id uuid,
  p_staff_user_id uuid,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if not exists (
    select 1 from public.tournaments t
    where t.id = p_tournament_id and t.created_by = auth.uid()
  ) then
    raise exception 'Solo el dueño de la liga puede otorgar permisos.';
  end if;
  if p_ends_at <= now() then
    raise exception 'La vigencia debe terminar en el futuro.';
  end if;

  insert into public.tournament_staff_grants (tournament_id, staff_user_id, role, granted_by, ends_at)
  values (p_tournament_id, p_staff_user_id, 'arbitro', auth.uid(), p_ends_at)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.revoke_tournament_staff_grant(p_grant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  update public.tournament_staff_grants g
  set revoked_at = now()
  where g.id = p_grant_id
    and g.revoked_at is null
    and (
      g.granted_by = auth.uid()
      or exists (
        select 1 from public.tournaments t
        where t.id = g.tournament_id and t.created_by = auth.uid()
      )
    );

  if not found then
    raise exception 'No se encontró un permiso activo que puedas revocar.';
  end if;
end;
$$;

revoke all on function public.grant_tournament_staff(uuid, uuid, timestamptz) from public;
revoke all on function public.revoke_tournament_staff_grant(uuid) from public;
grant execute on function public.grant_tournament_staff(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.revoke_tournament_staff_grant(uuid) to authenticated;
