-- AthlonX: minimum 5 players per callup and shirt number per fixture date.
-- Execute after tournament-fixture-callups-migration.sql.

alter table public.tournament_fixture_callup_players
  add column if not exists shirt_number integer;

alter table public.tournament_fixture_callup_players
  drop constraint if exists tournament_fixture_callup_players_shirt_number_check;

alter table public.tournament_fixture_callup_players
  add constraint tournament_fixture_callup_players_shirt_number_check
  check (shirt_number is null or shirt_number between 0 and 99);

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
    and not exists (
      select 1
      from public.tournament_fixture_callups
      where fixture_id = p_fixture_id
        and team_id = p_team_id
        and division_id = p_division_id
        and status = 'reopened'
    ) then
    raise exception 'La convocatoria esta bloqueada desde %', deadline;
  end if;

  if selected_count > rule.max_players then
    raise exception 'La convocatoria permite como maximo % jugadores', rule.max_players;
  end if;
  if p_submit and selected_count < 5 then
    raise exception 'Debes seleccionar al menos 5 jugadores para enviar la convocatoria';
  end if;
  if exists (
    select 1
    from jsonb_each_text(coalesce(p_player_shirt_numbers, '{}'::jsonb)) as shirt_numbers(player_id, shirt_number)
    where shirt_number !~ '^[0-9]{1,2}$' or shirt_number::integer > 99
  ) then
    raise exception 'El numero de camiseta debe estar entre 0 y 99';
  end if;
  if exists (
    select 1
    from unnest(p_player_ids) selected_player
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
  ) then
    raise exception 'Todos los jugadores deben pertenecer a la plantilla del equipo';
  end if;

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
  values (
    result.id,
    case when p_submit then 'submitted' else 'edited' end,
    auth.uid(),
    jsonb_build_object('selected_count', selected_count, 'deadline_at', deadline)
  );

  return result;
end;
$$;

revoke all on function public.save_tournament_fixture_callup(uuid, uuid, uuid, uuid, uuid[], boolean, jsonb) from public;
grant execute on function public.save_tournament_fixture_callup(uuid, uuid, uuid, uuid, uuid[], boolean, jsonb) to authenticated;
