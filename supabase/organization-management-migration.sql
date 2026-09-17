-- AthlonX: gestion administrativa de organizaciones.
-- Ejecutar despues de schema.sql y multidiscipline-migration.sql.

alter table public.organizations
  add column if not exists province text,
  add column if not exists phone text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

alter table public.organizations drop constraint if exists organizations_status_check;
alter table public.organizations add constraint organizations_status_check
  check (status in ('active', 'suspended', 'archived'));

drop policy if exists "Organization owners can update organizations" on public.organizations;
drop policy if exists "Organization owners can delete organizations" on public.organizations;

create policy "Organization owners can update organizations"
  on public.organizations for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Organization owners can delete organizations"
  on public.organizations for delete to authenticated
  using (created_by = auth.uid());

grant update, delete on public.organizations to authenticated;
