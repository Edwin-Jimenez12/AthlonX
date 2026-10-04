-- AthlonX: ajustes administrativos de puntos por torneo, division y equipo.
-- Ejecutar despues de tournament-edit-history-migration.sql.

create table if not exists public.tournament_standing_adjustments (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  division_id uuid not null references public.tournament_divisions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  points_adjustment integer not null default 0,
  reason text not null check (char_length(trim(reason)) >= 3),
  created_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (tournament_id, division_id, team_id)
);

create index if not exists tournament_standing_adjustments_lookup_idx
  on public.tournament_standing_adjustments(tournament_id, division_id);

alter table public.tournament_standing_adjustments enable row level security;

drop policy if exists "Public can view standing adjustments" on public.tournament_standing_adjustments;
create policy "Public can view standing adjustments"
  on public.tournament_standing_adjustments for select
  using (true);

grant select on public.tournament_standing_adjustments to anon, authenticated;

create or replace function public.save_tournament_standing_adjustments(
  p_tournament_id uuid,
  p_division_id uuid,
  p_adjustments jsonb,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  adjustment jsonb;
  team_id_value uuid;
  points_value integer;
  previous_value integer;
  team_name_value text;
  v_changes jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para modificar la tabla';
  end if;

  if not exists (
    select 1 from public.tournaments
    where id = p_tournament_id and created_by = auth.uid()
  ) then
    raise exception 'Solo el creador del torneo puede modificar la tabla';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Debes indicar el motivo del ajuste';
  end if;

  for adjustment in select * from jsonb_array_elements(coalesce(p_adjustments, '[]'::jsonb)) loop
    team_id_value := (adjustment->>'team_id')::uuid;
    points_value := (adjustment->>'points_adjustment')::integer;

    if not exists (
      select 1
      from public.tournament_teams
      where tournament_id = p_tournament_id
        and division_id = p_division_id
        and team_id = team_id_value
    ) then
      raise exception 'El equipo no pertenece a la división seleccionada';
    end if;

    select points_adjustment into previous_value
    from public.tournament_standing_adjustments
    where tournament_id = p_tournament_id
      and division_id = p_division_id
      and team_id = team_id_value;

    select name into team_name_value
    from public.teams
    where id = team_id_value;

    v_changes := v_changes || jsonb_build_array(jsonb_build_object(
      'team_id', team_id_value,
      'team_name', team_name_value,
      'before', coalesce(previous_value, 0),
      'after', points_value
    ));

    if points_value = 0 then
      delete from public.tournament_standing_adjustments
      where tournament_id = p_tournament_id
        and division_id = p_division_id
        and team_id = team_id_value;
    else
      insert into public.tournament_standing_adjustments (
        tournament_id, division_id, team_id, points_adjustment, reason, created_by
      ) values (
        p_tournament_id, p_division_id, team_id_value, points_value, trim(p_reason), auth.uid()
      )
      on conflict (tournament_id, division_id, team_id) do update set
        points_adjustment = excluded.points_adjustment,
        reason = excluded.reason,
        created_by = auth.uid(),
        updated_at = now();
    end if;
  end loop;

  if jsonb_array_length(v_changes) > 0 then
    insert into public.tournament_edit_history (tournament_id, edited_by, changes)
    values (
      p_tournament_id,
      auth.uid(),
      jsonb_build_object(
        'type', 'standing_adjustment',
        'division_id', p_division_id,
        'reason', trim(p_reason),
        'teams', v_changes
      )
    );
  end if;
end;
$$;

revoke all on function public.save_tournament_standing_adjustments(uuid, uuid, jsonb, text) from public;
grant execute on function public.save_tournament_standing_adjustments(uuid, uuid, jsonb, text) to authenticated;
