-- AthlonX: disciplinas visibles durante el registro publico.
-- Ejecutar despues de multidiscipline-migration.sql.

insert into public.disciplines (code, name, is_active)
values
  ('rugby', 'Rugby', true),
  ('baloncesto', 'Baloncesto', true),
  ('futbol', 'Fútbol', true)
on conflict (code) do update
set name = excluded.name,
    is_active = excluded.is_active;

update public.disciplines
set name = 'Baloncesto'
where code = 'baloncesto';

update public.disciplines
set is_active = code in ('rugby', 'baloncesto', 'futbol');

alter table public.disciplines enable row level security;

drop policy if exists "Authenticated users can view disciplines" on public.disciplines;
drop policy if exists "Public can view registration disciplines" on public.disciplines;

create policy "Public can view registration disciplines"
  on public.disciplines for select
  to anon, authenticated
  using (is_active = true);

grant select on public.disciplines to anon, authenticated;
