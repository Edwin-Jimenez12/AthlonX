-- Ejecutar despues de team-division-membership-invitations-migration.sql.
-- Convierte los miembros atletas aceptados en jugadores utilizables por convocatorias.

alter table public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.team_players
  add column if not exists division_id uuid references public.team_division_catalog(id) on delete set null;

create unique index if not exists players_user_id_unique
  on public.players (user_id)
  where user_id is not null;

create or replace function public.sync_team_athlete_membership_to_roster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  athlete_name text;
  athlete_player_id uuid;
begin
  if new.role <> 'atleta' or new.status <> 'active' or new.division_id is null then
    return new;
  end if;

  select profile.full_name
  into athlete_name
  from public.profiles profile
  where profile.id = new.user_id;

  if nullif(trim(athlete_name), '') is null then
    return new;
  end if;

  insert into public.players (full_name, user_id)
  values (trim(athlete_name), new.user_id)
  on conflict (user_id) where user_id is not null
  do update set full_name = excluded.full_name
  returning id into athlete_player_id;

  insert into public.team_players (team_id, player_id, division_id)
  values (new.team_id, athlete_player_id, new.division_id)
  on conflict (team_id, player_id)
  do update set division_id = excluded.division_id;

  return new;
end;
$$;

drop trigger if exists sync_team_athlete_membership_to_roster on public.team_user_memberships;
create trigger sync_team_athlete_membership_to_roster
after insert or update of role, status, division_id, user_id on public.team_user_memberships
for each row execute function public.sync_team_athlete_membership_to_roster();

-- Corrige atletas aceptados antes de crear este sincronizador.
do $$
declare
  membership record;
  athlete_name text;
  athlete_player_id uuid;
begin
  for membership in
    select team_id, user_id, division_id
    from public.team_user_memberships
    where role = 'atleta'
      and status = 'active'
      and division_id is not null
  loop
    select profile.full_name
    into athlete_name
    from public.profiles profile
    where profile.id = membership.user_id;

    if nullif(trim(athlete_name), '') is null then
      continue;
    end if;

    insert into public.players (full_name, user_id)
    values (trim(athlete_name), membership.user_id)
    on conflict (user_id) where user_id is not null
    do update set full_name = excluded.full_name
    returning id into athlete_player_id;

    insert into public.team_players (team_id, player_id, division_id)
    values (membership.team_id, athlete_player_id, membership.division_id)
    on conflict (team_id, player_id)
    do update set division_id = excluded.division_id;
  end loop;
end;
$$;

revoke all on function public.sync_team_athlete_membership_to_roster() from public;
