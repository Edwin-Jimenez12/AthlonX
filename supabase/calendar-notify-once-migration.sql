-- Notificaciones de actividades: una sola vez por evento (al crearlo).
-- Antes el aviso también se generaba en cada edición, y un evento repetido o editado varias veces avisaba de nuevo.
-- Idempotente: se puede volver a ejecutar.

drop trigger if exists on_team_calendar_event_changed on public.team_calendar_events;
drop trigger if exists on_team_calendar_event_created on public.team_calendar_events;
create trigger on_team_calendar_event_created
  after insert on public.team_calendar_events
  for each row execute procedure public.notify_team_calendar_event();

drop trigger if exists on_organization_calendar_event_changed on public.organization_calendar_events;
drop trigger if exists on_organization_calendar_event_created on public.organization_calendar_events;
create trigger on_organization_calendar_event_created
  after insert on public.organization_calendar_events
  for each row execute procedure public.notify_organization_calendar_event();
