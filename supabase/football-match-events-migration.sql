-- Eventos específicos de fútbol, separados de try y conversión de rugby.
alter table public.match_events
  drop constraint if exists match_events_event_type_check;

alter table public.match_events
  add constraint match_events_event_type_check
  check (event_type in (
    'try', 'conversion', 'penalty', 'goal', 'penalty_kick',
    'yellow_card', 'red_card', 'injured', 'concussion'
  ));
