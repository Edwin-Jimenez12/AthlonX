-- Ejecutar después de todas las migraciones de acciones y correcciones.
-- Mantiene los eventos y marcadores de fútbol separados de rugby.

begin;

alter table public.match_events
  add column if not exists is_corrected boolean not null default false,
  add column if not exists correction_reason text,
  add column if not exists corrected_by uuid references auth.users(id),
  add column if not exists corrected_at timestamptz;

alter table public.match_events
  drop constraint if exists match_events_event_type_check;

alter table public.match_events
  add constraint match_events_event_type_check
  check (event_type in (
    'try', 'conversion', 'penalty', 'goal', 'penalty_kick',
    'yellow_card', 'red_card', 'injured', 'concussion'
  ));

-- Recalcula el marcador usando únicamente los eventos de la disciplina.
create or replace function public.sync_match_score_from_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_id_value uuid;
  local_team_value uuid;
  visitor_team_value uuid;
  discipline_code_value text;
begin
  match_id_value := case when tg_op = 'DELETE' then old.match_id else new.match_id end;

  select match_row.local_team_id,
    match_row.visitor_team_id,
    discipline.code
    into local_team_value, visitor_team_value, discipline_code_value
  from public.matches match_row
  join public.fixtures fixture on fixture.id = match_row.fixture_id
  join public.tournaments tournament on tournament.id = fixture.tournament_id
  join public.disciplines discipline on discipline.id = tournament.discipline_id
  where match_row.id = match_id_value;

  if local_team_value is null or visitor_team_value is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  update public.matches match_row
  set local_score = coalesce((
        select sum(event_row.points)
        from public.match_events event_row
        where event_row.match_id = match_id_value
          and event_row.team_id = local_team_value
          and not event_row.is_corrected
          and (
            (discipline_code_value = 'futbol'
              and event_row.event_type in ('goal', 'penalty_kick'))
            or (discipline_code_value <> 'futbol'
              and event_row.event_type in ('try', 'conversion', 'penalty'))
          )
      ), 0),
      visitor_score = coalesce((
        select sum(event_row.points)
        from public.match_events event_row
        where event_row.match_id = match_id_value
          and event_row.team_id = visitor_team_value
          and not event_row.is_corrected
          and (
            (discipline_code_value = 'futbol'
              and event_row.event_type in ('goal', 'penalty_kick'))
            or (discipline_code_value <> 'futbol'
              and event_row.event_type in ('try', 'conversion', 'penalty'))
          )
      ), 0)
  where match_row.id = match_id_value;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_match_score_from_events_trigger on public.match_events;
create trigger sync_match_score_from_events_trigger
after insert or update of team_id, event_type, points, is_corrected or delete
on public.match_events
for each row execute function public.sync_match_score_from_events();

-- Repara los marcadores existentes después de instalar la separación.
update public.matches match_row
set local_score = coalesce((
      select sum(event_row.points)
      from public.match_events event_row
      where event_row.match_id = match_row.id
        and event_row.team_id = match_row.local_team_id
        and not event_row.is_corrected
        and (
          (discipline.code = 'futbol'
            and event_row.event_type in ('goal', 'penalty_kick'))
          or (discipline.code <> 'futbol'
            and event_row.event_type in ('try', 'conversion', 'penalty'))
        )
    ), 0),
    visitor_score = coalesce((
      select sum(event_row.points)
      from public.match_events event_row
      where event_row.match_id = match_row.id
        and event_row.team_id = match_row.visitor_team_id
        and not event_row.is_corrected
        and (
          (discipline.code = 'futbol'
            and event_row.event_type in ('goal', 'penalty_kick'))
          or (discipline.code <> 'futbol'
            and event_row.event_type in ('try', 'conversion', 'penalty'))
        )
    ), 0)
from public.fixtures fixture
join public.tournaments tournament on tournament.id = fixture.tournament_id
join public.disciplines discipline on discipline.id = tournament.discipline_id
where fixture.id = match_row.fixture_id;

-- Permite corregir la puntuación propia de cada disciplina.
create or replace function public.correct_match_scoring_event(
  p_event_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.match_events%rowtype;
  match_row public.matches%rowtype;
  tournament_id_value uuid;
  discipline_code_value text;
begin
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'El motivo de la corrección es obligatorio';
  end if;

  select source_event.* into event_row
  from public.match_events source_event
  where source_event.id = p_event_id;

  if event_row.id is null then
    raise exception 'El evento no existe';
  end if;

  select source_match.* into match_row
  from public.matches source_match
  where source_match.id = event_row.match_id;

  select fixture.tournament_id, discipline.code
    into tournament_id_value, discipline_code_value
  from public.fixtures fixture
  join public.tournaments tournament on tournament.id = fixture.tournament_id
  join public.disciplines discipline on discipline.id = tournament.discipline_id
  where fixture.id = match_row.fixture_id;

  if discipline_code_value = 'futbol'
    and event_row.event_type not in ('goal', 'penalty_kick') then
    raise exception 'Este evento no pertenece a la puntuación de fútbol';
  end if;

  if discipline_code_value <> 'futbol'
    and event_row.event_type not in ('try', 'conversion', 'penalty') then
    raise exception 'Este evento no pertenece a la puntuación de rugby';
  end if;

  if event_row.is_corrected then
    raise exception 'Este evento ya fue corregido';
  end if;

  if not exists (
    select 1
    from public.tournaments tournament
    where tournament.id = tournament_id_value
      and tournament.created_by = auth.uid()
  ) then
    raise exception 'No tienes permisos para corregir este evento';
  end if;

  insert into public.match_event_corrections (
    match_event_id, match_id, event_type, points_removed, corrected_by, reason
  ) values (
    event_row.id, event_row.match_id, event_row.event_type,
    event_row.points, auth.uid(), trim(p_reason)
  );

  update public.match_events
  set is_corrected = true,
    correction_reason = trim(p_reason),
    corrected_by = auth.uid(),
    corrected_at = now()
  where id = event_row.id;
end;
$$;

grant execute on function public.sync_match_score_from_events() to authenticated;
grant execute on function public.correct_match_scoring_event(uuid, text)
  to authenticated;

commit;
