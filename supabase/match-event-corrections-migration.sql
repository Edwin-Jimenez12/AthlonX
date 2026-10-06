-- Permite corregir eventos de puntuacion sin eliminar el registro original.

alter table public.match_events
  add column if not exists is_corrected boolean not null default false,
  add column if not exists correction_reason text,
  add column if not exists corrected_by uuid references auth.users(id),
  add column if not exists corrected_at timestamptz;

create table if not exists public.match_event_corrections (
  id uuid primary key default gen_random_uuid(),
  match_event_id uuid not null references public.match_events(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type text not null,
  points_removed integer not null default 0,
  corrected_by uuid not null references auth.users(id),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists match_event_corrections_match_idx
  on public.match_event_corrections(match_id, created_at desc);

alter table public.match_event_corrections enable row level security;

drop policy if exists "Authenticated users can view event corrections"
  on public.match_event_corrections;
create policy "Authenticated users can view event corrections"
  on public.match_event_corrections
  for select to authenticated using (true);

grant select on public.match_event_corrections to authenticated;

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
  v_event public.match_events%rowtype;
  v_match public.matches%rowtype;
  v_tournament_id uuid;
begin
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'El motivo de la correccion es obligatorio';
  end if;

  select event_row.*
    into v_event
  from public.match_events event_row
  where event_row.id = p_event_id;

  if v_event.id is null then
    raise exception 'El evento no existe';
  end if;

  if v_event.event_type not in ('try', 'conversion') then
    raise exception 'Solo se pueden corregir tries y conversiones';
  end if;

  if v_event.is_corrected then
    raise exception 'Este evento ya fue corregido';
  end if;

  select match_row.*
    into v_match
  from public.matches match_row
  where match_row.id = v_event.match_id;

  select fixture.tournament_id
    into v_tournament_id
  from public.fixtures fixture
  where fixture.id = v_match.fixture_id;

  if not exists (
    select 1
    from public.tournaments tournament_row
    where tournament_row.id = v_tournament_id
      and tournament_row.created_by = auth.uid()
  ) then
    raise exception 'No tienes permisos para corregir este evento';
  end if;

  insert into public.match_event_corrections (
    match_event_id,
    match_id,
    event_type,
    points_removed,
    corrected_by,
    reason
  )
  values (
    v_event.id,
    v_event.match_id,
    v_event.event_type,
    v_event.points,
    auth.uid(),
    trim(p_reason)
  );

  update public.match_events
  set is_corrected = true,
      correction_reason = trim(p_reason),
      corrected_by = auth.uid(),
      corrected_at = now()
  where id = v_event.id;

  update public.matches match_row
  set local_score = coalesce((
        select sum(event_row.points)
        from public.match_events event_row
        where event_row.match_id = match_row.id
          and event_row.team_id = match_row.local_team_id
          and event_row.event_type in ('try', 'conversion')
          and not event_row.is_corrected
      ), 0),
      visitor_score = coalesce((
        select sum(event_row.points)
        from public.match_events event_row
        where event_row.match_id = match_row.id
          and event_row.team_id = match_row.visitor_team_id
          and event_row.event_type in ('try', 'conversion')
          and not event_row.is_corrected
      ), 0)
  where match_row.id = v_match.id;
end;
$$;

grant execute on function public.correct_match_scoring_event(uuid, text)
  to authenticated;
