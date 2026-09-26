-- AthlonX: permisos de lectura y provision de perfiles de organizacion.

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

grant select, insert on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select on public.organization_disciplines to authenticated;
grant select on public.organization_modalities to authenticated;
grant select on public.disciplines to authenticated;
grant select on public.sport_modalities to authenticated;

drop policy if exists "Authenticated users can view organizations" on public.organizations;
create policy "Authenticated users can view organizations"
  on public.organizations for select to authenticated
  using (true);

drop policy if exists "Users can create organizations" on public.organizations;
create policy "Users can create organizations"
  on public.organizations for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "Members can view memberships" on public.organization_members;
create policy "Members can view memberships"
  on public.organization_members for select to authenticated
  using (auth.uid() = user_id or public.is_organization_manager(organization_id));
