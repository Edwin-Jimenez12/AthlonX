-- AthlonX: modalidades competitivas para torneos.
-- Ejecutar despues de identity-affiliations-migration.sql y antes de probar la creacion de torneos.

insert into public.sport_modalities (discipline_id, code, name)
select d.id, seed.code, seed.name
from public.disciplines d
cross join (values
  ('rugby', 'seven', 'Rugby Sevens'),
  ('rugby', 'xv', 'Rugby 15s'),
  ('baloncesto', '5x5', 'Basketball 5x5'),
  ('baloncesto', '3x3', 'Basketball 3x3')
) as seed(discipline_code, code, name)
where d.code = seed.discipline_code
on conflict (discipline_id, code) do update set name = excluded.name;

alter table public.tournaments
  add column if not exists modality_id uuid references public.sport_modalities(id) on delete set null;

create index if not exists tournaments_modality_id_idx on public.tournaments(modality_id);

grant select, insert, update on public.tournaments to authenticated;
