-- Repair for environments where team_division_catalog exists but the code
-- column was not created yet.

alter table public.team_division_catalog
  add column if not exists athlonx_code text;

alter table public.team_players
  add column if not exists division_id uuid references public.team_division_catalog(id) on delete set null;

alter table public.team_user_memberships
  add column if not exists division_id uuid references public.team_division_catalog(id) on delete set null;

alter table public.affiliation_requests
  add column if not exists division_id uuid references public.team_division_catalog(id) on delete set null;

create index if not exists team_players_team_division_idx
  on public.team_players (team_id, division_id);

create index if not exists team_user_memberships_team_division_idx
  on public.team_user_memberships (team_id, division_id)
  where role = 'atleta';

create unique index if not exists team_division_catalog_athlonx_code_key
  on public.team_division_catalog (athlonx_code)
  where athlonx_code is not null;

create or replace function public.set_team_division_athlonx_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.athlonx_code is null or trim(new.athlonx_code) = '' then
    new.athlonx_code := 'AX-DIV-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists set_team_division_athlonx_code on public.team_division_catalog;
create trigger set_team_division_athlonx_code
before insert or update on public.team_division_catalog
for each row execute procedure public.set_team_division_athlonx_code();

update public.team_division_catalog
set athlonx_code = 'AX-DIV-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where athlonx_code is null or trim(athlonx_code) = '';
