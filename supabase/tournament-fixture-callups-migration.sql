-- AthlonX: convocatorias por fecha/jornada y equipo.
-- Ejecutar despues de tournament-callups-migration.sql.

alter table public.fixtures
  add column if not exists callup_deadline_at timestamptz;

create index if not exists fixtures_callup_deadline_idx
  on public.fixtures(tournament_id, callup_deadline_at);

create table if not exists public.tournament_fixture_callups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  division_id uuid not null references public.tournament_divisions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'editing', 'submitted', 'locked', 'reopened')),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  locked_at timestamptz,
  non_participant_player_id uuid references public.players(id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references auth.users(id),
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fixture_id, team_id, division_id)
);

create table if not exists public.tournament_fixture_callup_players (
  callup_id uuid not null references public.tournament_fixture_callups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  state text not null default 'convocado' check (state in ('convocado', 'no_participante', 'no_convocado')),
  shirt_number integer,
  created_at timestamptz not null default now(),
  primary key (callup_id, player_id)
);

alter table public.tournament_fixture_callup_players
  add column if not exists shirt_number integer;

alter table public.tournament_fixture_callup_players
  drop constraint if exists tournament_fixture_callup_players_shirt_number_check;

alter table public.tournament_fixture_callup_players
  add constraint tournament_fixture_callup_players_shirt_number_check
  check (shirt_number is null or shirt_number between 0 and 99);

create table if not exists public.tournament_fixture_callup_audit (
  id uuid primary key default gen_random_uuid(),
  callup_id uuid not null references public.tournament_fixture_callups(id) on delete cascade,
  action text not null check (action in ('created', 'edited', 'submitted', 'locked', 'reopened', 'marked_inactive')),
  performed_by uuid not null references auth.users(id),
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tournament_fixture_callups_tournament_idx
  on public.tournament_fixture_callups(tournament_id, fixture_id);
create index if not exists tournament_fixture_callups_team_idx
  on public.tournament_fixture_callups(team_id, status);
create index if not exists tournament_fixture_callup_players_player_idx
  on public.tournament_fixture_callup_players(player_id);

alter table public.tournament_fixture_callups
  drop constraint if exists tournament_fixture_callups_fixture_id_team_id_key,
  drop constraint if exists tournament_fixture_callups_fixture_team_division_key;

alter table public.tournament_fixture_callups
  add constraint tournament_fixture_callups_fixture_team_division_key unique (fixture_id, team_id, division_id);

-- Conserva la ultima lista guardada de cada equipo dentro de cada fecha.
insert into public.tournament_fixture_callups (
  tournament_id, fixture_id, team_id, division_id, status, deadline_at, submitted_at,
  submitted_by, locked_at, non_participant_player_id, reopened_at, reopened_by,
  reopen_reason, created_at, updated_at
)
select distinct on (match.fixture_id, old_callup.team_id, old_callup.division_id)
  old_callup.tournament_id,
  match.fixture_id,
  old_callup.team_id,
  old_callup.division_id,
  old_callup.status,
  old_callup.deadline_at,
  old_callup.submitted_at,
  old_callup.submitted_by,
  old_callup.locked_at,
  old_callup.non_participant_player_id,
  old_callup.reopened_at,
  old_callup.reopened_by,
  old_callup.reopen_reason,
  old_callup.created_at,
  old_callup.updated_at
from public.tournament_callups old_callup
join public.matches match on match.id = old_callup.match_id
order by match.fixture_id, old_callup.team_id, old_callup.division_id, old_callup.updated_at desc
on conflict (fixture_id, team_id, division_id) do nothing;

insert into public.tournament_fixture_callup_players (callup_id, player_id, state, created_at)
select fixture_callup.id, old_player.player_id, old_player.state, old_player.created_at
from public.tournament_callup_players old_player
join public.tournament_callups old_callup on old_callup.id = old_player.callup_id
join public.matches match on match.id = old_callup.match_id
join public.tournament_fixture_callups fixture_callup
  on fixture_callup.fixture_id = match.fixture_id
 and fixture_callup.team_id = old_callup.team_id
 and fixture_callup.division_id = old_callup.division_id
on conflict (callup_id, player_id) do nothing;

alter table public.tournament_fixture_callups enable row level security;
alter table public.tournament_fixture_callup_players enable row level security;
alter table public.tournament_fixture_callup_audit enable row level security;

drop policy if exists "Users can view fixture callups" on public.tournament_fixture_callups;
create policy "Users can view fixture callups"
  on public.tournament_fixture_callups for select to authenticated
  using (
    public.can_manage_tournament_callup(tournament_id, team_id)
    or exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = tournament_fixture_callups.team_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists "Users can view fixture callup players" on public.tournament_fixture_callup_players;
create policy "Users can view fixture callup players"
  on public.tournament_fixture_callup_players for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_fixture_callups callup
      where callup.id = tournament_fixture_callup_players.callup_id
        and (
          public.can_manage_tournament_callup(callup.tournament_id, callup.team_id)
          or exists (
            select 1
            from public.team_user_memberships membership
            where membership.team_id = callup.team_id
              and membership.user_id = auth.uid()
              and membership.status = 'active'
          )
        )
    )
  );

drop function if exists public.save_tournament_fixture_callup(uuid, uuid, uuid, uuid, uuid[], boolean);

create or replace function public.save_tournament_fixture_callup(
  p_tournament_id uuid,
  p_fixture_id uuid,
  p_team_id uuid,
  p_division_id uuid,
  p_player_ids uuid[] default '{}'::uuid[],
  p_submit boolean default false,
  p_player_shirt_numbers jsonb default '{}'::jsonb
)
returns public.tournament_fixture_callups
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_fixture_callups;
  rule public.tournament_callup_rules;
  tournament_row public.tournaments;
  fixture_date date;
  first_match_time time;
  explicit_deadline timestamptz;
  deadline timestamptz;
  selected_count integer := coalesce(array_length(p_player_ids, 1), 0);
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion'; end if;
  if not public.can_manage_tournament_callup(p_tournament_id, p_team_id) then
    raise exception 'No tienes permisos para gestionar esta convocatoria';
  end if;

  select * into tournament_row from public.tournaments where id = p_tournament_id;
  if not found then raise exception 'El torneo no existe'; end if;

  select fixture.calendar_date, fixture.callup_deadline_at, min(match.scheduled_time)
    into fixture_date, explicit_deadline, first_match_time
  from public.fixtures fixture
  left join public.matches match on match.fixture_id = fixture.id
  where fixture.id = p_fixture_id and fixture.tournament_id = p_tournament_id
  group by fixture.id, fixture.calendar_date;
  if not found then raise exception 'La fecha no corresponde al torneo'; end if;
  if not exists (
    select 1
    from public.matches match
    where match.fixture_id = p_fixture_id
      and match.division_id = p_division_id
      and (match.local_team_id = p_team_id or match.visitor_team_id = p_team_id)
  ) then
    raise exception 'El equipo no participa en esta division durante la fecha seleccionada';
  end if;
  if not exists (
    select 1
    from public.tournament_teams tournament_team
    where tournament_team.tournament_id = p_tournament_id
      and tournament_team.team_id = p_team_id
      and tournament_team.division_id = p_division_id
  ) then
    raise exception 'El equipo no participa en esta division del torneo';
  end if;

  select * into rule from public.tournament_callup_rules where tournament_id = p_tournament_id;
  if not found then
    insert into public.tournament_callup_rules (tournament_id, created_by, updated_by)
    values (p_tournament_id, tournament_row.created_by, tournament_row.created_by)
    returning * into rule;
  end if;

  deadline := coalesce(
    explicit_deadline,
    ((coalesce(fixture_date, tournament_row.start_date, current_date)::timestamp + coalesce(first_match_time, time '23:59:59')) at time zone 'America/Panama') - make_interval(hours => rule.lock_hours_before)
  );
  if now() >= deadline
    and not exists (select 1 from public.tournament_fixture_callups where fixture_id = p_fixture_id and team_id = p_team_id and division_id = p_division_id and status = 'reopened') then
    raise exception 'La convocatoria esta bloqueada desde %', deadline;
  end if;
  if selected_count > rule.max_players then raise exception 'La convocatoria permite como maximo % jugadores', rule.max_players; end if;
  if p_submit and selected_count < 5 then raise exception 'Debes seleccionar al menos 5 jugadores para enviar la convocatoria'; end if;
  if exists (
    select 1
    from jsonb_each_text(coalesce(p_player_shirt_numbers, '{}'::jsonb)) as shirt_numbers(player_id, shirt_number)
    where shirt_number !~ '^[0-9]{1,2}$' or shirt_number::integer > 99
  ) then
    raise exception 'El numero de camiseta debe estar entre 0 y 99';
  end if;
  if exists (
    select 1 from unnest(p_player_ids) selected_player
    where not exists (
      select 1
      from public.team_players team_player
      where team_player.team_id = p_team_id
        and team_player.player_id = selected_player
        and (
          team_player.division_id = p_division_id
          or exists (
            select 1
            from public.team_division_catalog team_division
            join public.tournament_divisions tournament_division
              on translate(lower(trim(team_division.name)), 'áéíóúüñ', 'aeiouun') = translate(lower(trim(tournament_division.name)), 'áéíóúüñ', 'aeiouun')
            where team_division.id = team_player.division_id
              and team_division.team_id = p_team_id
              and tournament_division.id = p_division_id
          )
        )
    )
  ) then raise exception 'Todos los jugadores deben pertenecer a la plantilla del equipo'; end if;

  insert into public.tournament_fixture_callups (
    tournament_id, fixture_id, team_id, division_id, status, deadline_at, submitted_at, submitted_by, locked_at, updated_at
  ) values (
    p_tournament_id, p_fixture_id, p_team_id, p_division_id,
    case when p_submit then 'submitted' else 'editing' end,
    deadline,
    case when p_submit then now() else null end,
    case when p_submit then auth.uid() else null end,
    null,
    now()
  )
  on conflict (fixture_id, team_id, division_id) do update set
    division_id = excluded.division_id,
    status = case
      when p_submit then 'submitted'
      when tournament_fixture_callups.status = 'reopened' then 'reopened'
      else 'editing'
    end,
    deadline_at = excluded.deadline_at,
    submitted_at = case when p_submit then now() else tournament_fixture_callups.submitted_at end,
    submitted_by = case when p_submit then auth.uid() else tournament_fixture_callups.submitted_by end,
    reopened_at = null,
    reopened_by = null,
    reopen_reason = null,
    updated_at = now()
  returning * into result;

  delete from public.tournament_fixture_callup_players where callup_id = result.id;
  insert into public.tournament_fixture_callup_players (callup_id, player_id, state, shirt_number)
  select result.id, selected_player, 'convocado', nullif(p_player_shirt_numbers ->> selected_player::text, '')::integer
  from unnest(p_player_ids) selected_player;

  insert into public.tournament_fixture_callup_audit (callup_id, action, performed_by, details)
  values (result.id, case when p_submit then 'submitted' else 'edited' end, auth.uid(), jsonb_build_object('selected_count', selected_count, 'deadline_at', deadline));

  return result;
end;
$$;

create or replace function public.set_tournament_fixture_callup_deadline(
  p_tournament_id uuid,
  p_fixture_id uuid,
  p_deadline_at timestamptz
)
returns public.fixtures
language plpgsql
security definer
set search_path = public
as $$
declare
  fixture_row public.fixtures;
  first_match_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion'; end if;
  if not public.is_tournament_owner(p_tournament_id) then
    raise exception 'Solo el creador del torneo puede configurar el cierre de convocatorias';
  end if;
  if p_deadline_at is null then
    raise exception 'Debes indicar la fecha y hora de cierre';
  end if;

  select fixture.* into fixture_row
  from public.fixtures fixture
  where fixture.id = p_fixture_id
    and fixture.tournament_id = p_tournament_id
  for update;
  if not found then raise exception 'La fecha no corresponde al torneo'; end if;

  select min(
    (coalesce(fixture_row.calendar_date, current_date)::date + coalesce(match.scheduled_time, time '23:59:59')) at time zone 'America/Panama'
  ) into first_match_at
  from public.matches match
  where match.fixture_id = p_fixture_id;

  if first_match_at is not null and p_deadline_at >= first_match_at then
    raise exception 'El cierre debe ser anterior al primer partido de la fecha';
  end if;

  update public.fixtures
  set callup_deadline_at = p_deadline_at
  where id = p_fixture_id
  returning * into fixture_row;

  update public.tournament_fixture_callups
  set deadline_at = p_deadline_at,
      updated_at = now()
  where tournament_id = p_tournament_id
    and fixture_id = p_fixture_id
    and status <> 'locked';

  return fixture_row;
end;
$$;

create or replace function public.mark_tournament_fixture_callup_non_participant(
  p_callup_id uuid,
  p_player_id uuid
)
returns public.tournament_fixture_callups
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_fixture_callups;
begin
  select callup.* into result from public.tournament_fixture_callups callup where callup.id = p_callup_id for update;
  if not found then raise exception 'La convocatoria no existe'; end if;
  if not public.can_manage_tournament_callup(result.tournament_id, result.team_id) then raise exception 'No tienes permisos para cerrar esta convocatoria'; end if;
  if not public.is_tournament_owner(result.tournament_id)
     and not exists (
       select 1 from public.team_user_memberships membership
       where membership.team_id = result.team_id and membership.user_id = auth.uid() and membership.role = 'staff' and membership.status = 'active'
     ) then raise exception 'Solo el organizador o el staff autorizado puede marcar al jugador 13'; end if;
  if now() < result.deadline_at and not public.is_tournament_owner(result.tournament_id) then raise exception 'El jugador 13 solo puede definirse al cerrar la convocatoria'; end if;
  if not exists (select 1 from public.tournament_fixture_callup_players where callup_id = result.id and player_id = p_player_id) then raise exception 'El jugador seleccionado no pertenece a esta convocatoria'; end if;

  update public.tournament_fixture_callup_players
  set state = case when player_id = p_player_id then 'no_participante' else 'convocado' end
  where callup_id = result.id;
  update public.tournament_fixture_callups
  set status = 'locked', locked_at = now(), non_participant_player_id = p_player_id, updated_at = now()
  where id = result.id
  returning * into result;
  insert into public.tournament_fixture_callup_audit (callup_id, action, performed_by, details)
  values (result.id, 'marked_inactive', auth.uid(), jsonb_build_object('player_id', p_player_id));
  return result;
end;
$$;

create or replace function public.reopen_tournament_fixture_callup(
  p_callup_id uuid,
  p_reason text
)
returns public.tournament_fixture_callups
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_fixture_callups;
  reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select callup.* into result from public.tournament_fixture_callups callup where callup.id = p_callup_id for update;
  if not found then raise exception 'La convocatoria no existe'; end if;
  if not public.is_tournament_owner(result.tournament_id) then raise exception 'Solo el organizador puede reabrir una convocatoria'; end if;
  if reason is null then raise exception 'Debes registrar el motivo de la reapertura'; end if;
  update public.tournament_fixture_callups
  set status = 'reopened', reopened_at = now(), reopened_by = auth.uid(), reopen_reason = reason, locked_at = null, updated_at = now()
  where id = result.id
  returning * into result;
  insert into public.tournament_fixture_callup_audit (callup_id, action, performed_by, reason)
  values (result.id, 'reopened', auth.uid(), reason);
  return result;
end;
$$;

revoke all on function public.save_tournament_fixture_callup(uuid, uuid, uuid, uuid, uuid[], boolean, jsonb) from public;
revoke all on function public.mark_tournament_fixture_callup_non_participant(uuid, uuid) from public;
revoke all on function public.reopen_tournament_fixture_callup(uuid, text) from public;
grant execute on function public.save_tournament_fixture_callup(uuid, uuid, uuid, uuid, uuid[], boolean, jsonb) to authenticated;
grant execute on function public.mark_tournament_fixture_callup_non_participant(uuid, uuid) to authenticated;
grant execute on function public.reopen_tournament_fixture_callup(uuid, text) to authenticated;
grant execute on function public.set_tournament_fixture_callup_deadline(uuid, uuid, timestamptz) to authenticated;

grant select on public.tournament_fixture_callups, public.tournament_fixture_callup_players, public.tournament_fixture_callup_audit to authenticated;
