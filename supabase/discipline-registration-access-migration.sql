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

insert into public.sport_modalities (discipline_id, code, name, is_active)
select discipline.id, modality.code, modality.name, true
from public.disciplines discipline
cross join (
  values
    ('rugby', 'seven', 'Rugby Sevens'),
    ('rugby', 'xv', 'Rugby 15s'),
    ('baloncesto', '5x5', 'Baloncesto 5x5'),
    ('baloncesto', '3x3', 'Baloncesto 3x3'),
    ('futbol', 'futbol-5', 'Fútbol 5 vs 5'),
    ('futbol', 'futbol-7', 'Fútbol 7 vs 7'),
    ('futbol', 'futbol-8', 'Fútbol 8 vs 8'),
    ('futbol', 'futbol-11', 'Fútbol 11 vs 11')
) as modality(discipline_code, code, name)
where discipline.code = modality.discipline_code
on conflict (discipline_id, code) do update
set name = excluded.name,
    is_active = true;

alter table public.sport_modalities enable row level security;

drop policy if exists "Authenticated users can view active modalities" on public.sport_modalities;
drop policy if exists "Public can view active modalities" on public.sport_modalities;

create policy "Public can view active modalities"
  on public.sport_modalities
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.sport_modalities to anon, authenticated;
