-- AthlonX: torneos rapidos, equipos/jugadores temporales y reclamacion de perfiles.
-- Ejecutar despues de sports-schema.sql, public-search-migration.sql,
-- event-management-migration.sql, team-player-management-migration.sql,
-- team-division-normalization-migration.sql, fixture-players-migration.sql
-- y player-number-change-requests-migration.sql.

alter table public.tournaments
  add column if not exists is_quick boolean not null default false;

alter table public.teams
  add column if not exists is_official boolean not null default true,
  add column if not exists temporary_tournament_id uuid references public.tournaments(id) on delete cascade;

alter table public.players
  add column if not exists is_official boolean not null default true,
  add column if not exists temporary_tournament_id uuid references public.tournaments(id) on delete cascade,
  add column if not exists claimed_player_id uuid references public.players(id) on delete set null,
  add column if not exists claimed_by uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at timestamptz;

create index if not exists teams_temporary_tournament_id_idx
  on public.teams(temporary_tournament_id)
  where temporary_tournament_id is not null;

create index if not exists players_temporary_tournament_id_idx
  on public.players(temporary_tournament_id)
  where temporary_tournament_id is not null;

create unique index if not exists players_claimed_player_id_unique
  on public.players(claimed_player_id)
  where claimed_player_id is not null;

alter table public.teams enable row level security;
alter table public.players enable row level security;

grant select, insert, delete on public.teams to authenticated;
grant select, insert, update, delete on public.players to authenticated;

drop policy if exists "Quick tournament owners can create temporary teams" on public.teams;
create policy "Quick tournament owners can create temporary teams"
  on public.teams for insert to authenticated
  with check (
    is_official = false
    and temporary_tournament_id is not null
    and exists (
      select 1
      from public.tournaments tournament
      where tournament.id = teams.temporary_tournament_id
        and tournament.is_quick = true
        and tournament.created_by = auth.uid()
    )
  );

drop policy if exists "Quick tournament owners can create temporary players" on public.players;
create policy "Quick tournament owners can create temporary players"
  on public.players for insert to authenticated
  with check (
    is_official = false
    and temporary_tournament_id is not null
    and exists (
      select 1
      from public.tournaments tournament
      where tournament.id = players.temporary_tournament_id
        and tournament.is_quick = true
        and tournament.created_by = auth.uid()
    )
  );

drop policy if exists "Quick tournament owners can delete temporary teams" on public.teams;
create policy "Quick tournament owners can delete temporary teams"
  on public.teams for delete to authenticated
  using (
    is_official = false
    and temporary_tournament_id is not null
    and created_by = auth.uid()
  );

drop policy if exists "Quick tournament owners can delete temporary players" on public.players;
create policy "Quick tournament owners can delete temporary players"
  on public.players for delete to authenticated
  using (
    is_official = false
    and temporary_tournament_id is not null
    and created_by = auth.uid()
  );

create or replace function public.validate_tournament_team_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_is_quick boolean;
  team_is_official boolean;
  team_tournament_id uuid;
begin
  select is_quick into tournament_is_quick
  from public.tournaments
  where id = new.tournament_id;

  select is_official, temporary_tournament_id
    into team_is_official, team_tournament_id
  from public.teams
  where id = new.team_id;

  if tournament_is_quick is null or team_is_official is null then
    raise exception 'El torneo o equipo no existe';
  end if;

  if tournament_is_quick = false
     and (team_is_official = false or team_tournament_id is not null) then
    raise exception 'Los torneos normales solo admiten equipos oficiales';
  end if;

  if tournament_is_quick = true
     and team_is_official = false
     and team_tournament_id is distinct from new.tournament_id then
    raise exception 'El equipo temporal pertenece a otro torneo';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_tournament_team_entry on public.tournament_teams;
create trigger validate_tournament_team_entry
before insert or update on public.tournament_teams
for each row execute function public.validate_tournament_team_entry();

create or replace function public.validate_temporary_player_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  player_is_official boolean;
  player_tournament_id uuid;
begin
  select is_official, temporary_tournament_id
    into player_is_official, player_tournament_id
  from public.players
  where id = new.player_id;

  if player_is_official is null then
    raise exception 'El jugador no existe';
  end if;

  if player_is_official = false
     and not exists (
       select 1
       from public.tournament_teams tournament_team
       where tournament_team.tournament_id = player_tournament_id
         and tournament_team.team_id = new.team_id
     ) then
    raise exception 'El jugador temporal solo puede vincularse a su torneo';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_temporary_player_link on public.team_players;
create trigger validate_temporary_player_link
before insert or update on public.team_players
for each row execute function public.validate_temporary_player_link();

drop policy if exists "Users can claim their temporary player profile" on public.players;
create policy "Users can claim their temporary player profile"
  on public.players for update to authenticated
  using (is_official = false and claimed_player_id is null)
  with check (is_official = false and claimed_player_id is not null and claimed_by = auth.uid());

create or replace function public.claim_tournament_guest_player(
  p_guest_player_id uuid,
  p_official_player_id uuid
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  guest_player public.players%rowtype;
  official_player public.players%rowtype;
begin
  select * into guest_player
  from public.players
  where id = p_guest_player_id
  for update;

  if guest_player.id is null or guest_player.is_official = true then
    raise exception 'El perfil temporal no existe';
  end if;

  if guest_player.claimed_player_id is not null then
    raise exception 'Este perfil ya fue reclamado';
  end if;

  if guest_player.temporary_tournament_id is null
     or not exists (
       select 1 from public.tournaments tournament
       where tournament.id = guest_player.temporary_tournament_id
         and tournament.is_quick = true
     ) then
    raise exception 'El perfil no pertenece a un torneo rapido';
  end if;

  if not exists (
    select 1
    from public.team_players team_player
    join public.tournament_teams tournament_team on tournament_team.team_id = team_player.team_id
    where team_player.player_id = guest_player.id
      and tournament_team.tournament_id = guest_player.temporary_tournament_id
  ) then
    raise exception 'El perfil temporal no esta vinculado a una plantilla';
  end if;

  select * into official_player
  from public.players
  where id = p_official_player_id
    and is_official = true
    and user_id = auth.uid();

  if official_player.id is null then
    raise exception 'El perfil oficial no pertenece a la cuenta actual';
  end if;

  if exists (select 1 from public.players where claimed_player_id = official_player.id) then
    raise exception 'El perfil oficial ya se utilizo para reclamar otro perfil';
  end if;

  update public.players
  set claimed_player_id = official_player.id,
      claimed_by = auth.uid(),
      claimed_at = now()
  where id = guest_player.id;

  return guest_player;
end;
$$;

revoke all on function public.claim_tournament_guest_player(uuid, uuid) from public;
grant execute on function public.claim_tournament_guest_player(uuid, uuid) to authenticated;

-- Mantiene los equipos temporales visibles dentro del torneo, pero no en los
-- Los equipos temporales pueden aparecer en la búsqueda pública cuando se
-- solicita el filtro "No oficiales", pero no aparecen en selectores oficiales.
create or replace function public.get_public_tournament_profile(p_tournament_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'tournament', (
      select jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'season', t.season,
        'status', t.status,
        'is_quick', t.is_quick,
        'start_date', t.start_date,
        'end_date', t.end_date,
        'location', t.location,
        'country', t.country,
        'cover_url', t.cover_url,
        'athlonx_code', t.athlonx_code,
        'discipline', case when d.id is null then null else jsonb_build_object('id', d.id, 'code', d.code, 'name', d.name) end,
        'modality', case when m.id is null then null else jsonb_build_object('id', m.id, 'code', m.code, 'name', m.name) end,
        'organization', case when o.id is null then null else jsonb_build_object('id', o.id, 'name', o.name, 'athlonx_code', o.athlonx_code, 'handle', o.handle) end,
        'organizer_team', case when ot.id is null then null else jsonb_build_object('id', ot.id, 'name', ot.name, 'athlonx_code', ot.athlonx_code, 'handle', ot.handle) end
      )
      from public.tournaments t
      left join public.disciplines d on d.id = t.discipline_id
      left join public.sport_modalities m on m.id = t.modality_id
      left join public.organizations o on o.id = t.organization_id
      left join public.teams ot on ot.id = t.organizer_team_id
      where t.id = p_tournament_id
        and (
          (t.is_public = true and t.status in ('published', 'in_progress', 'finished'))
          or (t.status = 'draft' and t.created_by = auth.uid())
        )
    ),
    'divisions', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'sort_order', d.sort_order) order by d.sort_order, d.name)
      from public.tournament_divisions d
      where d.tournament_id = p_tournament_id
        and exists (
          select 1 from public.tournaments visible_tournament
          where visible_tournament.id = p_tournament_id
            and ((visible_tournament.is_public = true and visible_tournament.status in ('published', 'in_progress', 'finished')) or (visible_tournament.status = 'draft' and visible_tournament.created_by = auth.uid()))
        )
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'logo_url', t.logo_url,
        'city', t.city,
        'division_id', d.id,
        'division_name', d.name,
        'athlonx_code', t.athlonx_code,
        'handle', t.handle,
        'is_official', t.is_official,
        'contact_phone', t.contact_phone
      ) order by d.sort_order, t.name)
      from public.tournament_teams tt
      join public.teams t on t.id = tt.team_id
      join public.tournament_divisions d on d.id = tt.division_id
      where tt.tournament_id = p_tournament_id
        and exists (
          select 1 from public.tournaments visible_tournament
          where visible_tournament.id = p_tournament_id
            and ((visible_tournament.is_public = true and visible_tournament.status in ('published', 'in_progress', 'finished')) or (visible_tournament.status = 'draft' and visible_tournament.created_by = auth.uid()))
        )
    ), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'fixture_id', f.id,
        'date_number', f.date_number,
        'calendar_date', f.calendar_date,
        'division_name', d.name,
        'scheduled_time', m.scheduled_time,
        'status', m.status,
        'local_team_id', local_team.id,
        'local_team_name', local_team.name,
        'local_logo_url', local_team.logo_url,
        'visitor_team_id', visitor_team.id,
        'visitor_team_name', visitor_team.name,
        'visitor_logo_url', visitor_team.logo_url,
        'local_score', m.local_score,
        'visitor_score', m.visitor_score
      ) order by f.date_number, m.scheduled_time nulls last, local_team.name)
      from public.fixtures f
      join public.matches m on m.fixture_id = f.id
      left join public.tournament_divisions d on d.id = m.division_id
      left join public.teams local_team on local_team.id = m.local_team_id
      left join public.teams visitor_team on visitor_team.id = m.visitor_team_id
      where f.tournament_id = p_tournament_id
        and exists (
          select 1 from public.tournaments visible_tournament
          where visible_tournament.id = p_tournament_id
            and ((visible_tournament.is_public = true and visible_tournament.status in ('published', 'in_progress', 'finished')) or (visible_tournament.status = 'draft' and visible_tournament.created_by = auth.uid()))
        )
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_tournament_profile(uuid) from public;
grant execute on function public.get_public_tournament_profile(uuid) to authenticated;
