-- AthlonX: permite que cada usuario actualice únicamente su propio perfil.
-- Ejecutar despues de schema.sql y de cualquier migracion que agregue
-- allow_athlete_invitations a public.profiles.

alter table public.profiles enable row level security;

-- PostgREST necesita privilegios de tabla ademas de la politica RLS.
grant select on table public.profiles to authenticated;
grant update (full_name, phone, allow_athlete_invitations)
  on table public.profiles to authenticated;

drop policy if exists "Users can view their profile" on public.profiles;
drop policy if exists "Users can update their profile" on public.profiles;

create policy "Users can view their profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
