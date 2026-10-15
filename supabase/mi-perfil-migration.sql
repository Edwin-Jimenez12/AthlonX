-- Mi perfil (Persona, Equipo y Organización).
-- Ejecutar en Supabase > SQL Editor después de profile-redesign-migration.sql.
-- Es seguro ejecutarla más de una vez. No elimina datos existentes.

-- 1. Preferencias de cuenta: tema visual y avisos. Una fila por usuario.
create table if not exists public.account_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'oscuro' check (theme in ('oscuro', 'claro')),
  notices_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.account_preferences enable row level security;

drop policy if exists "account_preferences_owner_all" on public.account_preferences;
create policy "account_preferences_owner_all"
  on public.account_preferences
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.account_preferences to authenticated;

-- 2. Divisiones de equipo: atributos opcionales (idempotente; si ya existen no cambia nada).
alter table public.team_division_catalog
  add column if not exists level text,
  add column if not exists age_group text,
  add column if not exists gender text;

-- 3. Perfil de persona: el propio usuario puede leer y editar sus datos básicos.
--    (Las políticas de profiles ya existen en profile-redesign-migration.sql.)
grant select, update (first_name, last_name, full_name, phone, blood_type, allow_athlete_invitations)
  on public.profiles to authenticated;
