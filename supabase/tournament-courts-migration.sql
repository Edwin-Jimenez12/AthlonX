-- Canchas disponibles por torneo.
create table if not exists public.tournament_courts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  court_number integer not null check (court_number > 0),
  name text not null,
  created_at timestamptz not null default now(),
  unique (tournament_id, court_number),
  unique (id, tournament_id)
);

-- La cancha queda asociada al partido y no al fixture completo.
alter table public.matches
  add column if not exists court_id uuid;

alter table public.matches
  add column if not exists court_number integer check (court_number > 0);

alter table public.matches
  drop constraint if exists matches_court_id_fkey;

alter table public.matches
  add constraint matches_court_id_fkey
  foreign key (court_id) references public.tournament_courts(id) on delete set null;

create index if not exists matches_court_schedule_idx
  on public.matches(court_id, scheduled_time);

alter table public.tournament_courts enable row level security;

drop policy if exists "Authenticated users can view tournament courts"
  on public.tournament_courts;

create policy "Authenticated users can view tournament courts"
  on public.tournament_courts for select to authenticated
  using (true);

drop policy if exists "Tournament owners manage courts" on public.tournament_courts;

create policy "Tournament owners manage courts"
  on public.tournament_courts for all to authenticated
  using (
    exists (
      select 1
      from public.tournaments tournament
      where tournament.id = tournament_courts.tournament_id
        and tournament.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tournaments tournament
      where tournament.id = tournament_courts.tournament_id
        and tournament.created_by = auth.uid()
    )
  );

grant select, insert, update, delete on public.tournament_courts to authenticated;

-- Evita dos partidos simultáneos en la misma cancha dentro de una fecha.
create or replace function public.validate_match_court_schedule()
returns trigger
language plpgsql
as $$
begin
  if new.court_number is not null and new.scheduled_time is not null
     and exists (
       select 1
       from public.matches other_match
       where other_match.id <> new.id
         and other_match.fixture_id = new.fixture_id
         and other_match.court_number = new.court_number
         and other_match.scheduled_time = new.scheduled_time
     ) then
    raise exception 'La cancha % ya está ocupada a esa hora.', new.court_number;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_match_court_schedule on public.matches;
create trigger validate_match_court_schedule
before insert or update of fixture_id, scheduled_time, court_number
on public.matches
for each row execute function public.validate_match_court_schedule();
