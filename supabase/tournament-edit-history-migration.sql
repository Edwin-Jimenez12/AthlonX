-- AthlonX: historial de cambios de torneos.
-- Ejecutar despues de event-management-migration.sql.

create table if not exists public.tournament_edit_history (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  edited_by uuid not null references auth.users(id),
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tournament_edit_history_tournament_idx
  on public.tournament_edit_history(tournament_id, created_at desc);

alter table public.tournament_edit_history enable row level security;

drop policy if exists "Authenticated users can view tournament edit history" on public.tournament_edit_history;
create policy "Authenticated users can view tournament edit history"
  on public.tournament_edit_history for select to authenticated
  using (true);

grant select on public.tournament_edit_history to authenticated;

create or replace function public.log_tournament_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb;
begin
  if auth.uid() is null then
    return new;
  end if;

  v_changes := jsonb_strip_nulls(jsonb_build_object(
    'name', case when old.name is distinct from new.name then jsonb_build_object('before', old.name, 'after', new.name) end,
    'season', case when old.season is distinct from new.season then jsonb_build_object('before', old.season, 'after', new.season) end,
    'status', case when old.status is distinct from new.status then jsonb_build_object('before', old.status, 'after', new.status) end,
    'start_date', case when old.start_date is distinct from new.start_date then jsonb_build_object('before', old.start_date, 'after', new.start_date) end,
    'end_date', case when old.end_date is distinct from new.end_date then jsonb_build_object('before', old.end_date, 'after', new.end_date) end,
    'country', case when old.country is distinct from new.country then jsonb_build_object('before', old.country, 'after', new.country) end,
    'location', case when old.location is distinct from new.location then jsonb_build_object('before', old.location, 'after', new.location) end,
    'discipline_id', case when old.discipline_id is distinct from new.discipline_id then jsonb_build_object('before', old.discipline_id, 'after', new.discipline_id) end,
    'modality_id', case when old.modality_id is distinct from new.modality_id then jsonb_build_object('before', old.modality_id, 'after', new.modality_id) end
  ));

  if v_changes <> '{}'::jsonb then
    insert into public.tournament_edit_history (tournament_id, edited_by, changes)
    values (new.id, auth.uid(), v_changes);
  end if;

  return new;
end;
$$;

drop trigger if exists on_tournament_updated_log on public.tournaments;
create trigger on_tournament_updated_log
  after update on public.tournaments
  for each row execute function public.log_tournament_edit();

create or replace function public.record_tournament_edit(
  p_tournament_id uuid,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.tournaments
    where id = p_tournament_id and created_by = auth.uid()
  ) then
    raise exception 'No tienes permisos para registrar cambios en este torneo';
  end if;

  insert into public.tournament_edit_history (tournament_id, edited_by, changes)
  values (p_tournament_id, auth.uid(), coalesce(p_changes, '{}'::jsonb));
end;
$$;

revoke all on function public.log_tournament_edit() from public;
revoke all on function public.record_tournament_edit(uuid, jsonb) from public;
grant execute on function public.record_tournament_edit(uuid, jsonb) to authenticated;
