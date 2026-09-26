-- AthlonX: lectura de participantes para la organizacion seleccionada y su jerarquia.
-- Ejecutar despues de organization-access-migration.sql y organization-hierarchy-migration.sql.

-- Un administrador conserva sus permisos sobre las organizaciones subordinadas
-- cuya relacion institucional fue aceptada.
alter table public.organization_members enable row level security;
alter table public.team_user_memberships enable row level security;

create or replace function public.is_organization_manager(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive ancestors(organization_id) as (
    select target_organization_id

    union

    select relationship.superior_organization_id
    from public.organization_relationships relationship
    join ancestors child on child.organization_id = relationship.subordinate_organization_id
    where relationship.status = 'active'
  )
  select exists (
    select 1
    from ancestors ancestor
    where exists (
      select 1
      from public.organizations organization_row
      where organization_row.id = ancestor.organization_id
        and organization_row.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = ancestor.organization_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'directivo')
        and membership.status = 'active'
    )
  );
$$;

grant execute on function public.is_organization_manager(uuid) to authenticated;

drop policy if exists "Members can view memberships" on public.organization_members;
drop policy if exists "Organization managers can view memberships" on public.organization_members;
drop policy if exists "Users and managers can view hierarchy memberships" on public.organization_members;
create policy "Users and managers can view hierarchy memberships"
  on public.organization_members for select to authenticated
  using (
    auth.uid() = user_id
    or public.is_organization_manager(organization_id)
  );

drop policy if exists "Users can view their team memberships" on public.team_user_memberships;
drop policy if exists "Users and managers can view hierarchy team memberships" on public.team_user_memberships;
create policy "Users and managers can view hierarchy team memberships"
  on public.team_user_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.teams team
      where team.id = team_user_memberships.team_id
        and public.is_organization_manager(team.organization_id)
    )
  );

grant select on public.organization_members, public.team_user_memberships to authenticated;
