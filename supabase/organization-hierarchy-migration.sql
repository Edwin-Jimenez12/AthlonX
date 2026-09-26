-- Jerarquia organizacional heredada y vinculacion directa de personas.
-- Ejecutar despues de identity-affiliations-migration.sql.

create or replace function public.prevent_organization_hierarchy_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle boolean;
begin
  if new.superior_organization_id = new.subordinate_organization_id then
    raise exception 'Una organización no puede relacionarse consigo misma';
  end if;

  if new.status <> 'active' then
    return new;
  end if;

  with recursive descendants(organization_id) as (
    select new.subordinate_organization_id
    union
    select relation.subordinate_organization_id
    from public.organization_relationships relation
    join descendants current_node on current_node.organization_id = relation.superior_organization_id
    where relation.status = 'active'
      and relation.id <> new.id
  )
  select exists (
    select 1 from descendants
    where organization_id = new.superior_organization_id
  ) into v_cycle;

  if v_cycle then
    raise exception 'La relación crearía un ciclo en la jerarquía organizacional';
  end if;

  return new;
end;
$$;

drop trigger if exists organization_relationship_cycle_guard on public.organization_relationships;
create trigger organization_relationship_cycle_guard
before insert or update of superior_organization_id, subordinate_organization_id, status
on public.organization_relationships
for each row execute function public.prevent_organization_hierarchy_cycle();

create or replace function public.get_organization_hierarchy(p_root_organization_id uuid)
returns table (
  organization_id uuid,
  organization_name text,
  organization_type text,
  organization_logo_url text,
  parent_organization_id uuid,
  parent_organization_name text,
  relationship_type text,
  depth integer
)
language sql
stable
security definer
set search_path = public
as $$
with recursive hierarchy as (
  select
    root.id as organization_id,
    root.name as organization_name,
    root.type as organization_type,
    root.logo_url as organization_logo_url,
    null::uuid as parent_organization_id,
    null::text as parent_organization_name,
    null::text as relationship_type,
    0 as depth,
    array[root.id]::uuid[] as path
  from public.organizations root
  where root.id = p_root_organization_id
    and (root.is_public = true or public.is_organization_manager(root.id))

  union all

  select
    child.id,
    child.name,
    child.type,
    child.logo_url,
    current_node.organization_id,
    current_node.organization_name,
    relation.relationship_type,
    current_node.depth + 1,
    current_node.path || child.id
  from hierarchy current_node
  join public.organization_relationships relation
    on relation.superior_organization_id = current_node.organization_id
   and relation.status = 'active'
  join public.organizations child
    on child.id = relation.subordinate_organization_id
  where current_node.depth < 20
    and not child.id = any(current_node.path)
)
select organization_id, organization_name, organization_type, organization_logo_url,
  parent_organization_id, parent_organization_name, relationship_type, depth
from hierarchy
order by depth, organization_name;
$$;

create or replace function public.get_organization_direct_people(
  p_organization_id uuid,
  p_query text default null
)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  role text,
  role_label text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
select
  profile.id as user_id,
  profile.full_name,
  profile.avatar_url,
  max(member.role) as role,
  coalesce(max(member.role_label), 'Miembro de organización') as role_label,
  'active'::text as status
from public.organization_members member
join public.profiles profile on profile.id = member.user_id
where member.organization_id = p_organization_id
  and member.status = 'active'
  and profile.is_searchable = true
  and public.is_organization_manager(p_organization_id)
  and (
    nullif(trim(coalesce(p_query, '')), '') is null
    or lower(profile.full_name) like '%' || lower(trim(p_query)) || '%'
  )
group by profile.id, profile.full_name, profile.avatar_url
order by profile.full_name;
$$;

revoke all on function public.get_organization_hierarchy(uuid) from public;
revoke all on function public.get_organization_direct_people(uuid, text) from public;
grant execute on function public.get_organization_hierarchy(uuid) to authenticated;
grant execute on function public.get_organization_direct_people(uuid, text) to authenticated;
