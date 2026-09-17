-- Ejecuta este bloque en Supabase para sincronizar partidos en vivo entre cuentas.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_events'
  ) then
    alter publication supabase_realtime add table public.match_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'substitution_requests'
  ) then
    alter publication supabase_realtime add table public.substitution_requests;
  end if;
end;
$$;

alter table public.matches replica identity full;
alter table public.match_events replica identity full;
alter table public.substitution_requests replica identity full;
