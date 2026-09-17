-- AthlonX: disciplinas visibles durante el registro publico.
-- Ejecutar despues de multidiscipline-migration.sql.

update public.disciplines
set name = 'Basketball'
where code = 'baloncesto';

update public.disciplines
set is_active = code in ('rugby', 'baloncesto');

alter table public.disciplines enable row level security;

drop policy if exists "Authenticated users can view disciplines" on public.disciplines;
drop policy if exists "Public can view registration disciplines" on public.disciplines;

create policy "Public can view registration disciplines"
  on public.disciplines for select
  to anon, authenticated
  using (is_active = true and code in ('rugby', 'baloncesto'));

grant select on public.disciplines to anon, authenticated;
