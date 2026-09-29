-- AthlonX: informacion personal editable desde Configuracion.
-- Ejecutar despues de schema.sql y antes de usar los nuevos campos en la interfaz.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birth_date date,
  add column if not exists blood_type text;

alter table public.profiles
  drop constraint if exists profiles_blood_type_check;

alter table public.profiles
  add constraint profiles_blood_type_check
  check (blood_type is null or blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

-- Conserva los nombres existentes y los separa para que puedan editarse.
update public.profiles
set first_name = nullif(split_part(trim(full_name), ' ', 1), ''),
    last_name = nullif(trim(substr(trim(full_name), length(split_part(trim(full_name), ' ', 1)) + 1)), '')
where coalesce(trim(full_name), '') <> ''
  and first_name is null
  and last_name is null;

grant select on table public.profiles to authenticated;
grant update (full_name, first_name, last_name, birth_date, blood_type, phone, allow_athlete_invitations)
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
