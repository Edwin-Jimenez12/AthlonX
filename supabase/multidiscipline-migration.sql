-- AthlonX: catalogo multidisciplinario y relaciones institucionales.
-- Ejecutar despues de schema.sql y sports-schema.sql.

create table if not exists public.disciplines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.disciplines (code, name)
values
  ('rugby', 'Rugby'),
  ('baloncesto', 'Baloncesto'),
  ('futbol', 'Futbol'),
  ('voleibol', 'Voleibol'),
  ('atletismo', 'Atletismo')
on conflict (code) do update set name = excluded.name;

create table if not exists public.organization_disciplines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, discipline_id)
);

alter table public.tournaments
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists discipline_id uuid references public.disciplines(id) on delete restrict;

update public.tournaments
set discipline_id = (select id from public.disciplines where code = 'rugby')
where discipline_id is null;

alter table public.disciplines enable row level security;
alter table public.organization_disciplines enable row level security;

drop policy if exists "Authenticated users can view disciplines" on public.disciplines;
create policy "Authenticated users can view disciplines"
  on public.disciplines for select to authenticated using (is_active = true);

drop policy if exists "Authenticated users can view organization disciplines" on public.organization_disciplines;
drop policy if exists "Organization managers can create organization disciplines" on public.organization_disciplines;
drop policy if exists "Organization managers can delete organization disciplines" on public.organization_disciplines;

create policy "Authenticated users can view organization disciplines"
  on public.organization_disciplines for select to authenticated using (true);

create policy "Organization managers can create organization disciplines"
  on public.organization_disciplines for insert to authenticated
  with check (exists (
    select 1 from public.organizations o
    where o.id = organization_disciplines.organization_id
      and o.created_by = auth.uid()
  ));

create policy "Organization managers can delete organization disciplines"
  on public.organization_disciplines for delete to authenticated
  using (exists (
    select 1 from public.organizations o
    where o.id = organization_disciplines.organization_id
      and o.created_by = auth.uid()
  ));

drop policy if exists "Organization managers can update tournaments" on public.tournaments;
create policy "Organization managers can update tournaments"
  on public.tournaments for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

grant select on public.disciplines to authenticated;
grant select, insert, delete on public.organization_disciplines to authenticated;
grant select, update on public.tournaments to authenticated;
