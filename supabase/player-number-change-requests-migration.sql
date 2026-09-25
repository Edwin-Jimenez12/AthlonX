-- Solicitudes de cambio de numero para atletas.
-- Ejecutar despues de identity-affiliations-migration.sql,
-- team-organization-invitations-migration.sql y fixture-players-migration.sql.

alter table public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists players_user_id_unique
  on public.players(user_id)
  where user_id is not null;

create table if not exists public.player_number_change_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  league_name text not null,
  player_name text not null,
  current_number integer,
  requested_number integer not null check (requested_number between 0 and 99),
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  responded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists player_number_change_pending_unique
  on public.player_number_change_requests(team_id, player_id)
  where status = 'pending';

alter table public.user_notifications
  add column if not exists player_number_change_request_id uuid references public.player_number_change_requests(id) on delete cascade;

alter table public.player_number_change_requests enable row level security;

grant select on public.player_number_change_requests to authenticated;
drop policy if exists "Users can view player number requests" on public.player_number_change_requests;
create policy "Users can view player number requests"
  on public.player_number_change_requests for select to authenticated
  using (
    requested_by = auth.uid()
    or exists (
      select 1 from public.team_user_memberships m
      where m.team_id = player_number_change_requests.team_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'directivo')
        and m.status = 'active'
    )
  );

create or replace function public.create_player_number_change_request(
  p_team_id uuid,
  p_player_id uuid,
  p_requested_number integer,
  p_league_name text,
  p_tournament_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_player public.players%rowtype;
begin
  if p_requested_number < 0 or p_requested_number > 99 then
    raise exception 'El numero debe estar entre 0 y 99';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id;

  if not found or v_player.user_id <> auth.uid() then
    raise exception 'Solo el atleta puede solicitar el cambio de su numero';
  end if;

  if not exists (
    select 1 from public.team_players tp
    where tp.team_id = p_team_id and tp.player_id = p_player_id
  ) then
    raise exception 'El atleta no pertenece a este equipo';
  end if;

  insert into public.player_number_change_requests (
    team_id, player_id, tournament_id, league_name, player_name,
    current_number, requested_number, requested_by
  ) values (
    p_team_id, p_player_id, p_tournament_id, trim(p_league_name), v_player.full_name,
    v_player.shirt_number, p_requested_number, auth.uid()
  ) returning id into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    raise exception 'Ya existe una solicitud pendiente para este atleta';
end;
$$;

create or replace function public.notify_player_number_change_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_notifications (
    recipient_user_id, player_number_change_request_id, title, body
  )
  select distinct m.user_id, new.id, 'Solicitud de cambio de numero',
    'Liga: ' || new.league_name || '. Accion: cambiar el numero de ' || new.player_name ||
    ' de #' || coalesce(new.current_number::text, '--') || ' a #' || new.requested_number::text ||
    '. Revisa la solicitud para aceptarla o rechazarla.'
  from public.team_user_memberships m
  where m.team_id = new.team_id
    and m.role in ('owner', 'directivo')
    and m.status = 'active'
    and m.user_id is not null;
  return new;
end;
$$;

drop trigger if exists on_player_number_change_request_created on public.player_number_change_requests;
create trigger on_player_number_change_request_created
  after insert on public.player_number_change_requests
  for each row execute procedure public.notify_player_number_change_request();

create or replace function public.respond_player_number_change_request(
  p_request_id uuid,
  p_decision text
)
returns public.player_number_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.player_number_change_requests%rowtype;
  v_team public.teams%rowtype;
begin
  select * into v_request
  from public.player_number_change_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'pending' then
    raise exception 'La solicitud ya no esta disponible';
  end if;

  if not exists (
    select 1 from public.team_user_memberships m
    where m.team_id = v_request.team_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'directivo')
      and m.status = 'active'
  ) then
    raise exception 'Solo un responsable del equipo puede responder';
  end if;

  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Decision no valida';
  end if;

  if p_decision = 'accepted' then
    update public.players
    set shirt_number = v_request.requested_number
    where id = v_request.player_id;

    select * into v_team from public.teams where id = v_request.team_id;

    if v_team.organization_id is not null then
      insert into public.user_notifications (
        recipient_user_id, player_number_change_request_id, title, body
      )
      select distinct m.user_id, v_request.id, 'Cambio de numero aceptado',
        'Liga: ' || v_request.league_name || '. Accion aceptada: ' || v_request.player_name ||
        ' ahora usara el numero #' || v_request.requested_number::text || ' en ' || v_team.name || '.'
      from public.organization_members m
      where m.organization_id = v_team.organization_id
        and m.role in ('owner', 'directivo')
        and m.status = 'active'
        and m.user_id is not null;
    end if;
  end if;

  update public.player_number_change_requests
  set status = p_decision,
      responded_by = auth.uid(),
      responded_at = now()
  where id = v_request.id
  returning * into v_request;

  update public.user_notifications
  set read_at = now()
  where player_number_change_request_id = v_request.id
    and recipient_user_id = auth.uid();

  insert into public.user_notifications (
    recipient_user_id, player_number_change_request_id, title, body
  ) values (
    v_request.requested_by,
    v_request.id,
    case when p_decision = 'accepted' then 'Cambio de numero aceptado' else 'Cambio de numero rechazado' end,
    'Liga: ' || v_request.league_name || '. La solicitud para ' || v_request.player_name ||
    ' fue ' || case when p_decision = 'accepted' then 'aceptada' else 'rechazada' end || '.'
  );

  return v_request;
end;
$$;

revoke all on function public.create_player_number_change_request(uuid, uuid, integer, text, uuid) from public;
revoke all on function public.respond_player_number_change_request(uuid, text) from public;
grant execute on function public.create_player_number_change_request(uuid, uuid, integer, text, uuid) to authenticated;
grant execute on function public.respond_player_number_change_request(uuid, text) to authenticated;
