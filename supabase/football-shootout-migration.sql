begin;

-- Guarda cada lanzamiento para reconstruir la tanda y mostrarla en pantalla.
create table if not exists public.match_shootout_kicks (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  team_id uuid not null,
  result text not null check (result in ('goal', 'miss')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (match_id, round_number, team_id)
);

create index if not exists match_shootout_kicks_match_id_idx
  on public.match_shootout_kicks(match_id, round_number, created_at);

alter table public.match_shootout_kicks enable row level security;

grant select on public.match_shootout_kicks to anon, authenticated;

drop policy if exists "Public can view shootout kicks"
  on public.match_shootout_kicks;
create policy "Public can view shootout kicks"
  on public.match_shootout_kicks
  for select
  to anon, authenticated
  using (true);

-- Registra un tiro, valida el turno y finaliza automáticamente la tanda.
create or replace function public.register_football_shootout_kick(
  p_match_id uuid,
  p_team_id uuid,
  p_result text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  match_row public.matches%rowtype;
  current_round integer;
  current_round_kicks integer;
  round_kicks integer;
  local_attempts integer;
  visitor_attempts integer;
  local_goals integer;
  visitor_goals integer;
  winner uuid;
begin
  if p_result not in ('goal', 'miss') then
    raise exception 'El resultado del tiro no es válido.';
  end if;

  select m.*
    into match_row
  from public.matches m
  join public.fixtures f on f.id = m.fixture_id
  join public.tournaments t on t.id = f.tournament_id
  join public.sport_modalities modality on modality.id = t.modality_id
  join public.disciplines discipline on discipline.id = t.discipline_id
  where m.id = p_match_id
    and t.created_by = auth.uid()
    and discipline.code = 'futbol'
    and modality.code = 'futbol-8'
  for update of m;

  if not found then
    raise exception 'No tienes permisos para registrar esta tanda.';
  end if;

  if match_row.status <> 'live'
    or match_row.match_phase <> 'penalty_shootout' then
    raise exception 'El partido no está listo para registrar penales.';
  end if;

  if p_team_id not in (match_row.local_team_id, match_row.visitor_team_id) then
    raise exception 'El equipo no pertenece a este partido.';
  end if;

  select coalesce(max(k.round_number), 0)
    into current_round
  from public.match_shootout_kicks k
  where k.match_id = p_match_id;

  if current_round = 0 then
    current_round := 1;
  else
    select count(*)
      into current_round_kicks
    from public.match_shootout_kicks k
    where k.match_id = p_match_id
      and k.round_number = current_round;

    if current_round_kicks = 2 then
      current_round := current_round + 1;
    elsif exists (
      select 1
      from public.match_shootout_kicks k
      where k.match_id = p_match_id
        and k.round_number = current_round
        and k.team_id = p_team_id
    ) then
      raise exception 'Ese equipo ya registró su tiro en esta ronda.';
    end if;
  end if;

  insert into public.match_shootout_kicks (
    match_id,
    round_number,
    team_id,
    result,
    created_by
  ) values (
    p_match_id,
    current_round,
    p_team_id,
    p_result,
    auth.uid()
  );

  select
    count(*) filter (where k.team_id = match_row.local_team_id),
    count(*) filter (where k.team_id = match_row.visitor_team_id),
    count(*) filter (
      where k.team_id = match_row.local_team_id and k.result = 'goal'
    ),
    count(*) filter (
      where k.team_id = match_row.visitor_team_id and k.result = 'goal'
    )
    into local_attempts, visitor_attempts, local_goals, visitor_goals
  from public.match_shootout_kicks k
  where k.match_id = p_match_id;

  select count(*)
    into round_kicks
  from public.match_shootout_kicks k
  where k.match_id = p_match_id
    and k.round_number = current_round;

  if local_attempts >= 5
    and visitor_attempts >= 5
    and current_round <= 5
    and local_goals <> visitor_goals then
    winner := case
      when local_goals > visitor_goals then match_row.local_team_id
      else match_row.visitor_team_id
    end;
  elsif current_round > 5
    and round_kicks = 2
    and local_goals <> visitor_goals then
    winner := case
      when local_goals > visitor_goals then match_row.local_team_id
      else match_row.visitor_team_id
    end;
  end if;

  update public.matches
  set shootout_local_score = local_goals,
      shootout_visitor_score = visitor_goals,
      status = case when winner is not null then 'finished' else status end,
      is_paused = case when winner is not null then true else is_paused end,
      finished_at = case when winner is not null then now() else finished_at end
  where id = p_match_id;

  return jsonb_build_object(
    'round_number', current_round,
    'local_attempts', local_attempts,
    'visitor_attempts', visitor_attempts,
    'local_goals', local_goals,
    'visitor_goals', visitor_goals,
    'finished', winner is not null,
    'winner_team_id', winner
  );
end;
$$;

revoke all on function public.register_football_shootout_kick(uuid, uuid, text)
  from public, anon;
grant execute on function public.register_football_shootout_kick(uuid, uuid, text)
  to authenticated;

commit;
