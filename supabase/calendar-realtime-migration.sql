-- Calendario en tiempo real: publica las tablas del calendario en Supabase Realtime.
-- Realtime respeta RLS: cada sesión solo recibe los cambios que puede leer. Idempotente.

do $$
declare
  t text;
begin
  foreach t in array array['personal_activities', 'team_calendar_events', 'organization_calendar_events', 'calendar_attendance'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
