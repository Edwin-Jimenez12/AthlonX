-- AthlonX: un equipo puede tener varias divisiones propias.
-- Ejecutar después de sports-schema.sql, identity-affiliations-migration.sql
-- y las migraciones de registro de equipos.

create table if not exists public.team_division_catalog (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  discipline_id uuid references public.disciplines(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

alter table public.team_division_catalog enable row level security;

drop policy if exists "Authenticated users can view team division catalog" on public.team_division_catalog;
create policy "Authenticated users can view team division catalog"
  on public.team_division_catalog for select to authenticated using (true);

grant select on public.team_division_catalog to authenticated;

-- Recupera las divisiones que ya estaban guardadas como texto en las plantillas.
insert into public.team_division_catalog (team_id, name, discipline_id)
select distinct
  membership.team_id,
  trim(player.division),
  team.discipline_id
from public.team_players membership
join public.players player on player.id = membership.player_id
join public.teams team on team.id = membership.team_id
where nullif(trim(player.division), '') is not null
on conflict (team_id, name) do nothing;

-- Consolida equipos duplicados solo cuando comparten nombre, propietario,
-- organización y disciplina. No mezcla equipos homónimos de cuentas distintas.
do $$
declare
  team_group record;
  duplicate_team record;
begin
  for team_group in
    select
      lower(trim(team.name)) as normalized_name,
      team.organization_id,
      team.created_by,
      team.discipline_id,
      (array_agg(team.id order by team.created_at nulls last, team.id))[1] as canonical_id
    from public.teams team
    group by lower(trim(team.name)), team.organization_id, team.created_by, team.discipline_id
    having count(*) > 1
  loop
    for duplicate_team in
      select team.id
      from public.teams team
      where lower(trim(team.name)) = team_group.normalized_name
        and team.organization_id is not distinct from team_group.organization_id
        and team.created_by is not distinct from team_group.created_by
        and team.discipline_id is not distinct from team_group.discipline_id
        and team.id <> team_group.canonical_id
    loop
      delete from public.tournament_teams duplicate_link
      where duplicate_link.team_id = duplicate_team.id
        and exists (
          select 1
          from public.tournament_teams canonical_link
          where canonical_link.tournament_id = duplicate_link.tournament_id
            and canonical_link.division_id = duplicate_link.division_id
            and canonical_link.team_id = team_group.canonical_id
        );

      update public.tournament_teams
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      delete from public.team_players duplicate_membership
      where duplicate_membership.team_id = duplicate_team.id
        and exists (
          select 1
          from public.team_players canonical_membership
          where canonical_membership.team_id = team_group.canonical_id
            and canonical_membership.player_id = duplicate_membership.player_id
        );

      update public.team_players
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      delete from public.team_user_memberships duplicate_membership
      where duplicate_membership.team_id = duplicate_team.id
        and exists (
          select 1
          from public.team_user_memberships canonical_membership
          where canonical_membership.team_id = team_group.canonical_id
            and canonical_membership.user_id = duplicate_membership.user_id
            and canonical_membership.role = duplicate_membership.role
        );

      update public.team_user_memberships
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      delete from public.user_contexts duplicate_context
      where duplicate_context.team_id = duplicate_team.id
        and exists (
          select 1
          from public.user_contexts canonical_context
          where canonical_context.team_id = team_group.canonical_id
            and canonical_context.user_id = duplicate_context.user_id
            and canonical_context.role = duplicate_context.role
        );

      update public.user_contexts
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      update public.matches
      set local_team_id = team_group.canonical_id
      where local_team_id = duplicate_team.id;

      update public.matches
      set visitor_team_id = team_group.canonical_id
      where visitor_team_id = duplicate_team.id;

      update public.match_events
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      update public.substitution_requests
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      delete from public.fixture_players duplicate_fixture_player
      where duplicate_fixture_player.team_id = duplicate_team.id
        and exists (
          select 1
          from public.fixture_players canonical_fixture_player
          where canonical_fixture_player.fixture_id = duplicate_fixture_player.fixture_id
            and canonical_fixture_player.player_id = duplicate_fixture_player.player_id
        );

      update public.fixture_players
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      delete from public.player_number_change_requests duplicate_number_request
      where duplicate_number_request.team_id = duplicate_team.id
        and exists (
          select 1
          from public.player_number_change_requests canonical_number_request
          where canonical_number_request.team_id = team_group.canonical_id
            and canonical_number_request.player_id = duplicate_number_request.player_id
            and canonical_number_request.status = duplicate_number_request.status
        );

      update public.player_number_change_requests
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      delete from public.tournament_team_invitations duplicate_invitation
      where duplicate_invitation.team_id = duplicate_team.id
        and exists (
          select 1
          from public.tournament_team_invitations canonical_invitation
          where canonical_invitation.tournament_id = duplicate_invitation.tournament_id
            and canonical_invitation.team_id = team_group.canonical_id
        );

      update public.tournament_team_invitations
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      delete from public.team_division_catalog duplicate_division
      where duplicate_division.team_id = duplicate_team.id
        and exists (
          select 1
          from public.team_division_catalog canonical_division
          where canonical_division.team_id = team_group.canonical_id
            and lower(trim(canonical_division.name)) = lower(trim(duplicate_division.name))
        );

      update public.team_division_catalog
      set team_id = team_group.canonical_id
      where team_id = duplicate_team.id;

      update public.tournaments
      set organizer_team_id = team_group.canonical_id
      where organizer_team_id = duplicate_team.id;

      update public.affiliation_requests
      set source_team_id = team_group.canonical_id
      where source_team_id = duplicate_team.id;

      delete from public.teams
      where id = duplicate_team.id;
    end loop;
  end loop;
end;
$$;

create index if not exists team_division_catalog_team_idx
  on public.team_division_catalog(team_id);

-- Si el equipo tiene divisiones definidas, solo permite vincularlo a una
-- división del torneo con el mismo nombre.
create or replace function public.validate_tournament_team_division()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_division_name text;
begin
  select name
  into tournament_division_name
  from public.tournament_divisions
  where id = new.division_id
    and tournament_id = new.tournament_id;

  if tournament_division_name is null then
    raise exception 'La división no pertenece a este torneo';
  end if;

  if exists (
    select 1 from public.team_division_catalog
    where team_id = new.team_id
  ) and not exists (
    select 1
    from public.team_division_catalog team_division
    where team_division.team_id = new.team_id
      and lower(trim(team_division.name)) = lower(trim(tournament_division_name))
  ) then
    raise exception 'El equipo no tiene registrada la división seleccionada';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_tournament_team_division_before_write on public.tournament_teams;
create trigger validate_tournament_team_division_before_write
  before insert or update of team_id, division_id on public.tournament_teams
  for each row execute function public.validate_tournament_team_division();

revoke all on function public.validate_tournament_team_division() from public;
grant execute on function public.validate_tournament_team_division() to authenticated;
