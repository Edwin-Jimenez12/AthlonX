-- Keeps the selected country explicit for location selectors.
alter table if exists public.teams
  add column if not exists country text not null default 'Panamá';

alter table if exists public.tournaments
  add column if not exists country text not null default 'Panamá';

update public.teams
set country = 'Panamá'
where country is null or trim(country) = '';

update public.tournaments
set country = 'Panamá'
where country is null or trim(country) = '';

grant select, insert, update on public.teams to authenticated;
grant select, insert, update on public.tournaments to authenticated;
