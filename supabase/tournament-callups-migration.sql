-- AthlonX: convocatorias por partido y reglas de cierre.
-- Ejecutar despues de sports-schema.sql, event-management-migration.sql,
-- identity-affiliations-migration.sql y las migraciones de seguridad deportiva.

create table if not exists public.tournament_callup_rules (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  max_players integer not null default 13 check (max_players > 0),
  active_players integer not null default 12 check (active_players >= 0),
  inactive_players integer not null default 1 check (inactive_players >= 0),
  lock_hours_before integer not null default 24 check (lock_hours_before >= 0),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (active_players + inactive_players = max_players)
);

create table if not exists public.tournament_callups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
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
  unique (match_id, team_id)
);

create table if not exists public.tournament_callup_players (
  callup_id uuid not null references public.tournament_callups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  state text not null default 'convocado' check (state in ('convocado', 'no_participante', 'no_convocado')),
  created_at timestamptz not null default now(),
  primary key (callup_id, player_id)
);

create table if not exists public.tournament_callup_audit (
  id uuid primary key default gen_random_uuid(),
  callup_id uuid not null references public.tournament_callups(id) on delete cascade,
  action text not null check (action in ('created', 'edited', 'submitted', 'locked', 'reopened', 'marked_inactive')),
  performed_by uuid not null references auth.users(id),
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tournament_callups_tournament_idx
  on public.tournament_callups(tournament_id, deadline_at);
create index if not exists tournament_callups_team_idx
  on public.tournament_callups(team_id, status);
create index if not exists tournament_callup_players_player_idx
  on public.tournament_callup_players(player_id);

insert into public.tournament_callup_rules (
  tournament_id, max_players, active_players, inactive_players, lock_hours_before, created_by, updated_by
)
select id, 13, 12, 1, 24, created_by, created_by
from public.tournaments
on conflict (tournament_id) do nothing;

create or replace function public.ensure_tournament_callup_rule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tournament_callup_rules (
    tournament_id, max_players, active_players, inactive_players, lock_hours_before, created_by, updated_by
  )
  values (new.id, 13, 12, 1, 24, new.created_by, new.created_by)
  on conflict (tournament_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tournament_callup_rule_after_insert on public.tournaments;
create trigger tournament_callup_rule_after_insert
after insert on public.tournaments
for each row execute function public.ensure_tournament_callup_rule();

create or replace function public.is_tournament_owner(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments tournament
    where tournament.id = p_tournament_id
      and tournament.created_by = auth.uid()
  );
$$;

create or replace function public.can_manage_tournament_callup(p_tournament_id uuid, p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_tournament_owner(p_tournament_id)
    or exists (
      select 1
      from public.team_user_memberships membership
      join public.tournament_teams tournament_team
        on tournament_team.team_id = membership.team_id
       and tournament_team.tournament_id = p_tournament_id
      where membership.team_id = p_team_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'directivo', 'entrenador', 'staff')
        and membership.status = 'active'
    );
$$;

alter table public.tournament_callup_rules enable row level security;
alter table public.tournament_callups enable row level security;
alter table public.tournament_callup_players enable row level security;
alter table public.tournament_callup_audit enable row level security;

drop policy if exists "Users can view tournament callup rules" on public.tournament_callup_rules;
create policy "Users can view tournament callup rules"
  on public.tournament_callup_rules for select to authenticated
  using (
    public.is_tournament_owner(tournament_id)
    or exists (
      select 1
      from public.tournament_teams tournament_team
      join public.team_user_memberships membership on membership.team_id = tournament_team.team_id
      where tournament_team.tournament_id = tournament_callup_rules.tournament_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists "Users can view accessible tournament callups" on public.tournament_callups;
create policy "Users can view accessible tournament callups"
  on public.tournament_callups for select to authenticated
  using (
    public.can_manage_tournament_callup(tournament_id, team_id)
    or exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = tournament_callups.team_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  );

drop policy if exists "Users can view accessible tournament callup players" on public.tournament_callup_players;
create policy "Users can view accessible tournament callup players"
  on public.tournament_callup_players for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_callups callup
      where callup.id = tournament_callup_players.callup_id
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

drop policy if exists "Tournament owners can view callup audit" on public.tournament_callup_audit;
create policy "Tournament owners can view callup audit"
  on public.tournament_callup_audit for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_callups callup
      where callup.id = tournament_callup_audit.callup_id
        and public.is_tournament_owner(callup.tournament_id)
    )
  );

create or replace function public.set_tournament_callup_rules(
  p_tournament_id uuid,
  p_max_players integer,
  p_active_players integer,
  p_inactive_players integer,
  p_lock_hours_before integer
)
returns public.tournament_callup_rules
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_callup_rules;
begin
  if not public.is_tournament_owner(p_tournament_id) then
    raise exception 'Solo el organizador del torneo puede configurar las convocatorias';
  end if;
  if p_max_players <= 0 or p_active_players < 0 or p_inactive_players < 0
     or p_active_players + p_inactive_players <> p_max_players then
    raise exception 'La cantidad de jugadores activos e inactivos no coincide con el maximo';
  end if;
  if p_lock_hours_before < 0 then
    raise exception 'El plazo de cierre no puede ser negativo';
  end if;

  insert into public.tournament_callup_rules (
    tournament_id, max_players, active_players, inactive_players, lock_hours_before, created_by, updated_by
  )
  values (p_tournament_id, p_max_players, p_active_players, p_inactive_players, p_lock_hours_before, auth.uid(), auth.uid())
  on conflict (tournament_id) do update set
    max_players = excluded.max_players,
    active_players = excluded.active_players,
    inactive_players = excluded.inactive_players,
    lock_hours_before = excluded.lock_hours_before,
    updated_by = auth.uid(),
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.save_tournament_callup(
  p_tournament_id uuid,
  p_match_id uuid,
  p_team_id uuid,
  p_division_id uuid,
  p_player_ids uuid[] default '{}'::uuid[],
  p_submit boolean default false
)
returns public.tournament_callups
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_callups;
  rule public.tournament_callup_rules;
  tournament_row public.tournaments;
  fixture_date date;
  scheduled_time time;
  match_division_id uuid;
  deadline timestamptz;
  selected_count integer := coalesce(array_length(p_player_ids, 1), 0);
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion'; end if;
  if not public.can_manage_tournament_callup(p_tournament_id, p_team_id) then
    raise exception 'No tienes permisos para gestionar esta convocatoria';
  end if;

  select * into tournament_row from public.tournaments where id = p_tournament_id;
  if not found then raise exception 'El torneo no existe'; end if;

  select fixture.calendar_date, match.scheduled_time, match.division_id
    into fixture_date, scheduled_time, match_division_id
  from public.matches match
  join public.fixtures fixture on fixture.id = match.fixture_id
  where match.id = p_match_id and fixture.tournament_id = p_tournament_id
    and (match.local_team_id = p_team_id or match.visitor_team_id = p_team_id);
  if not found then raise exception 'El partido no corresponde al equipo y torneo seleccionados'; end if;
  if match_division_id is distinct from p_division_id then raise exception 'La division no corresponde al partido'; end if;
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

  deadline := ((coalesce(fixture_date, tournament_row.start_date)::timestamp + coalesce(scheduled_time, time '23:59:59')) at time zone 'America/Panama') - make_interval(hours => rule.lock_hours_before);
  if now() >= deadline
     and not exists (select 1 from public.tournament_callups where match_id = p_match_id and team_id = p_team_id and status = 'reopened') then
    raise exception 'La convocatoria esta bloqueada desde %', deadline;
  end if;
  if selected_count > rule.max_players then raise exception 'La convocatoria permite como maximo % jugadores', rule.max_players; end if;
  if p_submit and selected_count <> rule.max_players then raise exception 'Debes seleccionar exactamente % jugadores para enviar la convocatoria', rule.max_players; end if;
  if exists (
    select 1 from unnest(p_player_ids) selected_player
    where not exists (
      select 1
      from public.team_players team_player
      where team_player.team_id = p_team_id
        and team_player.player_id = selected_player
        and team_player.division_id = p_division_id
    )
  ) then raise exception 'Todos los jugadores deben pertenecer a la plantilla del equipo'; end if;

  insert into public.tournament_callups (
    tournament_id, match_id, team_id, division_id, status, deadline_at, submitted_at, submitted_by, locked_at, updated_at
  ) values (
    p_tournament_id, p_match_id, p_team_id, p_division_id,
    case when p_submit then 'submitted' else 'editing' end,
    deadline,
    case when p_submit then now() else null end,
    case when p_submit then auth.uid() else null end,
    null,
    now()
  )
  on conflict (match_id, team_id) do update set
    division_id = excluded.division_id,
    status = case
      when p_submit then 'submitted'
      when tournament_callups.status = 'reopened' then 'reopened'
      else 'editing'
    end,
    deadline_at = excluded.deadline_at,
    submitted_at = case when p_submit then now() else tournament_callups.submitted_at end,
    submitted_by = case when p_submit then auth.uid() else tournament_callups.submitted_by end,
    reopened_at = null,
    reopened_by = null,
    reopen_reason = null,
    updated_at = now()
  returning * into result;

  delete from public.tournament_callup_players where callup_id = result.id;
  insert into public.tournament_callup_players (callup_id, player_id, state)
  select result.id, selected_player, 'convocado'
  from unnest(p_player_ids) selected_player;

  insert into public.tournament_callup_audit (callup_id, action, performed_by, details)
  values (result.id, case when p_submit then 'submitted' else 'edited' end, auth.uid(), jsonb_build_object('selected_count', selected_count, 'deadline_at', deadline));

  if p_submit then
    insert into public.user_notifications (recipient_user_id, title, body)
    select membership.user_id, 'Convocatoria enviada', 'La convocatoria de tu equipo fue enviada para un partido del torneo.'
    from public.team_user_memberships membership
    where membership.team_id = p_team_id
      and membership.status = 'active'
      and membership.user_id <> auth.uid()
    on conflict do nothing;
  end if;
  return result;
end;
$$;

create or replace function public.mark_tournament_callup_non_participant(
  p_callup_id uuid,
  p_player_id uuid
)
returns public.tournament_callups
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_callups;
  player_count integer;
begin
  select callup.* into result from public.tournament_callups callup where callup.id = p_callup_id for update;
  if not found then raise exception 'La convocatoria no existe'; end if;
  if not public.can_manage_tournament_callup(result.tournament_id, result.team_id) then raise exception 'No tienes permisos para cerrar esta convocatoria'; end if;
  if not public.is_tournament_owner(result.tournament_id)
     and not exists (
       select 1
       from public.team_user_memberships membership
       where membership.team_id = result.team_id
         and membership.user_id = auth.uid()
         and membership.role = 'staff'
         and membership.status = 'active'
     ) then
    raise exception 'Solo el organizador o el staff autorizado puede marcar al jugador 13';
  end if;
  if now() < result.deadline_at and not public.is_tournament_owner(result.tournament_id) then raise exception 'El jugador 13 solo puede definirse al cerrar la convocatoria'; end if;
  select count(*) into player_count from public.tournament_callup_players where callup_id = result.id;
  if player_count = 0 or not exists (select 1 from public.tournament_callup_players where callup_id = result.id and player_id = p_player_id) then raise exception 'El jugador seleccionado no pertenece a esta convocatoria'; end if;

  update public.tournament_callup_players
  set state = case when player_id = p_player_id then 'no_participante' else 'convocado' end
  where callup_id = result.id;
  update public.tournament_callups
  set status = 'locked', locked_at = now(), non_participant_player_id = p_player_id, updated_at = now()
  where id = result.id
  returning * into result;
  insert into public.tournament_callup_audit (callup_id, action, performed_by, details)
  values (result.id, 'marked_inactive', auth.uid(), jsonb_build_object('player_id', p_player_id));
  return result;
end;
$$;

create or replace function public.reopen_tournament_callup(
  p_callup_id uuid,
  p_reason text
)
returns public.tournament_callups
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_callups;
  reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select callup.* into result from public.tournament_callups callup where callup.id = p_callup_id for update;
  if not found then raise exception 'La convocatoria no existe'; end if;
  if not public.is_tournament_owner(result.tournament_id) then raise exception 'Solo el organizador puede reabrir una convocatoria'; end if;
  if reason is null then raise exception 'Debes registrar el motivo de la reapertura'; end if;
  update public.tournament_callups
  set status = 'reopened', reopened_at = now(), reopened_by = auth.uid(), reopen_reason = reason, locked_at = null, updated_at = now()
  where id = result.id
  returning * into result;
  insert into public.tournament_callup_audit (callup_id, action, performed_by, reason)
  values (result.id, 'reopened', auth.uid(), reason);
  return result;
end;
$$;

revoke all on function public.set_tournament_callup_rules(uuid, integer, integer, integer, integer) from public;
revoke all on function public.save_tournament_callup(uuid, uuid, uuid, uuid, uuid[], boolean) from public;
revoke all on function public.mark_tournament_callup_non_participant(uuid, uuid) from public;
revoke all on function public.reopen_tournament_callup(uuid, text) from public;
grant execute on function public.set_tournament_callup_rules(uuid, integer, integer, integer, integer) to authenticated;
grant execute on function public.save_tournament_callup(uuid, uuid, uuid, uuid, uuid[], boolean) to authenticated;
grant execute on function public.mark_tournament_callup_non_participant(uuid, uuid) to authenticated;
grant execute on function public.reopen_tournament_callup(uuid, text) to authenticated;

grant select on public.tournament_callup_rules, public.tournament_callups, public.tournament_callup_players, public.tournament_callup_audit to authenticated;
