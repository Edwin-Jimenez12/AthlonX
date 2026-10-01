-- AthlonX: recesos editables por fecha del fixture.
-- Ejecutar en Supabase si la tabla fixtures fue creada antes de sports-schema.sql.

alter table public.fixtures
  add column if not exists recesses jsonb not null default '[]'::jsonb;

update public.fixtures
set recesses = '[{"id":"recess-1","time":null}]'::jsonb
where recesses is null
   or jsonb_typeof(recesses) <> 'array'
   or jsonb_array_length(recesses) = 0;

grant select, insert, update, delete on public.fixtures to authenticated;
