-- AthlonX: permite que cada persona edite su propia fecha de nacimiento desde Mi perfil.
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.

-- 1. Privilegio de escritura sobre la columna (faltaba en las migraciones de perfil).
grant update (birth_date) on public.profiles to authenticated;

-- 2. Rango válido: no futura y no anterior a 1900.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_birth_date_range' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles
      add constraint profiles_birth_date_range
      check (birth_date is null or (birth_date >= date '1900-01-01' and birth_date <= current_date)) not valid;
  end if;
end $$;
