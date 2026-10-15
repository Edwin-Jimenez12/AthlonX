-- Catálogo de países de AthlonX: por ahora solo Panamá. Idempotente.
create table if not exists public.athlonx_countries (
  name text primary key,
  code text not null unique,
  dial_code text not null unique,
  -- Código ISO 3166-1 alpha-2 en mayúsculas; se usa para mostrar la bandera (country-flag-icons).
  flag_code text not null unique check (flag_code ~ '^[A-Z]{2}$'),
  active boolean not null default true
);

alter table public.athlonx_countries add column if not exists flag_code text;
comment on column public.athlonx_countries.flag_code is 'Código ISO 3166-1 alpha-2 (ej. PA) que identifica el componente de bandera.';

insert into public.athlonx_countries (name, code, dial_code, flag_code, active)
values ('Panamá', 'PA', '507', 'PA', true)
on conflict (name) do update set code = excluded.code, dial_code = excluded.dial_code, flag_code = excluded.flag_code, active = true;

alter table public.athlonx_countries alter column flag_code set not null;

-- Solo se permite Panamá en el catálogo.
delete from public.athlonx_countries where name <> 'Panamá';

alter table public.athlonx_countries enable row level security;
drop policy if exists athlonx_countries_read on public.athlonx_countries;
create policy athlonx_countries_read on public.athlonx_countries for select to anon, authenticated using (active);
grant select on public.athlonx_countries to anon, authenticated;

-- Los países existentes pasan a Panamá y las columnas quedan limitadas al catálogo.
update public.teams set country = 'Panamá' where country is distinct from 'Panamá';
update public.organizations set country = 'Panamá' where country is distinct from 'Panamá';

alter table public.teams drop constraint if exists teams_country_athlonx_fkey;
alter table public.teams add constraint teams_country_athlonx_fkey foreign key (country) references public.athlonx_countries (name);

alter table public.organizations drop constraint if exists organizations_country_athlonx_fkey;
alter table public.organizations add constraint organizations_country_athlonx_fkey foreign key (country) references public.athlonx_countries (name);
