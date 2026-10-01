-- Permite invitar atletas directamente a una division del equipo.
-- Ejecutar despues de team-division-profiles-migration.sql y
-- team-member-role-management-migration.sql.

alter table public.team_user_memberships
  add column if not exists division_id uuid references public.team_division_catalog(id) on delete set null;

alter table public.affiliation_requests
  add column if not exists division_id uuid references public.team_division_catalog(id) on delete set null;

-- El mismo usuario puede ejercer el mismo rol en varias divisiones del equipo.
-- Los roles globales sin division conservan una sola membresia por equipo.
alter table public.team_user_memberships
  drop constraint if exists team_user_memberships_team_id_user_id_key;

drop index if exists public.team_user_memberships_user_team_role_key;

create unique index if not exists team_user_memberships_user_team_role_division_key
  on public.team_user_memberships (team_id, user_id, role, division_id)
  where division_id is not null;

create unique index if not exists team_user_memberships_user_team_role_global_key
  on public.team_user_memberships (team_id, user_id, role)
  where division_id is null;

create index if not exists team_user_memberships_team_division_idx
  on public.team_user_memberships (team_id, division_id)
  where role = 'atleta';

create or replace function public.create_team_division_player_invitation(
  p_target_user_id uuid,
  p_source_team_id uuid,
  p_division_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if not exists (
    select 1
    from public.team_user_memberships membership
    where membership.team_id = p_source_team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'directivo', 'entrenador')
      and membership.status = 'active'
  ) then
    raise exception 'No tienes permisos para administrar este equipo';
  end if;

  if not exists (
    select 1
    from public.team_division_catalog division
    where division.id = p_division_id
      and division.team_id = p_source_team_id
  ) then
    raise exception 'La division seleccionada no pertenece a este equipo';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = p_target_user_id
      and profile.is_searchable = true
  ) then
    raise exception 'El perfil seleccionado no esta disponible';
  end if;

  if exists (
    select 1
    from public.affiliation_requests request
    where request.source_team_id = p_source_team_id
      and request.target_user_id = p_target_user_id
      and request.role = 'atleta'
      and request.status = 'pending'
  ) then
    raise exception 'Ya existe una invitacion pendiente para esta persona';
  end if;

  insert into public.affiliation_requests (
    source_team_id,
    target_user_id,
    role,
    role_label,
    division_id,
    status,
    created_by
  )
  values (
    p_source_team_id,
    p_target_user_id,
    'atleta',
    'Atleta',
    p_division_id,
    'pending',
    auth.uid()
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.create_team_division_member_invitation(
  p_target_user_id uuid,
  p_source_team_id uuid,
  p_division_id uuid,
  p_role text,
  p_role_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_role_label text;
begin
  if p_role not in ('atleta', 'entrenador', 'staff') then
    raise exception 'El rol no es valido para una division';
  end if;

  if not exists (
    select 1
    from public.team_user_memberships membership
    where membership.team_id = p_source_team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'directivo', 'entrenador')
      and membership.status = 'active'
  ) then
    raise exception 'No tienes permisos para administrar este equipo';
  end if;

  if not exists (
    select 1
    from public.team_division_catalog division
    where division.id = p_division_id
      and division.team_id = p_source_team_id
  ) then
    raise exception 'La division seleccionada no pertenece a este equipo';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = p_target_user_id
      and profile.is_searchable = true
  ) then
    raise exception 'El perfil seleccionado no esta disponible';
  end if;

  if exists (
    select 1
    from public.team_user_memberships membership
    where membership.team_id = p_source_team_id
      and membership.user_id = p_target_user_id
      and membership.role = p_role
      and membership.division_id is not distinct from p_division_id
      and membership.status = 'active'
  ) then
    raise exception 'Esta persona ya tiene ese rol en esta division';
  end if;

  if exists (
    select 1
    from public.affiliation_requests request
    where request.source_team_id = p_source_team_id
      and request.target_user_id = p_target_user_id
      and request.role = p_role
      and request.division_id = p_division_id
      and request.status = 'pending'
  ) then
    raise exception 'Ya existe una invitacion pendiente para esta division';
  end if;

  v_role_label := nullif(trim(p_role_label), '');
  if v_role_label is null then
    v_role_label := case p_role
      when 'atleta' then 'Atleta'
      when 'entrenador' then 'Entrenador'
      when 'staff' then 'Staff'
    end;
  end if;

  insert into public.affiliation_requests (
    source_team_id, target_user_id, role, role_label, division_id, status, created_by
  )
  values (
    p_source_team_id, p_target_user_id, p_role, v_role_label, p_division_id, 'pending', auth.uid()
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.remove_team_player_from_division(
  p_team_id uuid,
  p_player_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.team_user_memberships membership
    where membership.team_id = p_team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'directivo')
      and membership.status = 'active'
  ) then
    raise exception 'No tienes permisos para editar este equipo';
  end if;

  delete from public.team_players
  where team_id = p_team_id
    and player_id = p_player_id;

  if not found then
    raise exception 'El jugador no pertenece a la plantilla del equipo';
  end if;
end;
$$;

create or replace function public.respond_affiliation_request(p_request_id uuid, p_decision text)
returns public.affiliation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.affiliation_requests%rowtype;
  v_can_respond boolean;
begin
  select * into v_request
  from public.affiliation_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'pending' then
    raise exception 'La solicitud ya no esta disponible';
  end if;

  v_can_respond := v_request.target_user_id = auth.uid()
    or (
      v_request.target_organization_id is not null
      and public.is_organization_manager(v_request.target_organization_id)
    )
    or exists (
      select 1
      from public.team_user_memberships membership
      where membership.team_id = v_request.target_team_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'directivo')
        and membership.status = 'active'
    );

  if not v_can_respond then
    raise exception 'No puedes responder esta solicitud';
  end if;

  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Decision no valida';
  end if;

  if p_decision = 'accepted' then
    if v_request.target_user_id is not null and v_request.source_organization_id is not null then
      insert into public.organization_members (organization_id, user_id, role, role_label, status)
      values (v_request.source_organization_id, v_request.target_user_id, v_request.role, v_request.role_label, 'active')
      on conflict (organization_id, user_id, role)
      do update set role_label = excluded.role_label, status = 'active';
    elsif v_request.target_user_id is not null and v_request.source_team_id is not null then
      if exists (
        select 1
        from public.team_user_memberships membership
        where membership.team_id = v_request.source_team_id
          and membership.user_id = v_request.target_user_id
          and membership.role = v_request.role
          and membership.division_id is not distinct from v_request.division_id
      ) then
        update public.team_user_memberships
        set role_label = v_request.role_label,
            status = 'active'
        where team_id = v_request.source_team_id
          and user_id = v_request.target_user_id
          and role = v_request.role
          and division_id is not distinct from v_request.division_id;
      else
        insert into public.team_user_memberships (team_id, user_id, role, role_label, division_id, status)
        values (v_request.source_team_id, v_request.target_user_id, v_request.role, v_request.role_label, v_request.division_id, 'active');
      end if;
    elsif v_request.target_team_id is not null and v_request.source_organization_id is not null then
      update public.teams
      set organization_id = v_request.source_organization_id
      where id = v_request.target_team_id
        and (organization_id is null or organization_id = v_request.source_organization_id);

      if not found then
        raise exception 'El equipo ya pertenece a otra organizacion';
      end if;
    elsif v_request.target_organization_id is not null then
      insert into public.organization_relationships (
        superior_organization_id, subordinate_organization_id, relationship_type,
        discipline_id, modality_id, status, requested_by, responded_by, responded_at
      )
      values (
        v_request.source_organization_id, v_request.target_organization_id, v_request.relationship_type,
        v_request.discipline_id, v_request.modality_id, 'active', v_request.created_by, auth.uid(), now()
      );
    end if;
  end if;

  update public.affiliation_requests
  set status = p_decision, responded_by = auth.uid(), responded_at = now()
  where id = v_request.id
  returning * into v_request;

  update public.user_notifications
  set read_at = now()
  where affiliation_request_id = p_request_id
    and recipient_user_id = auth.uid();

  return v_request;
end;
$$;

create or replace function public.remove_team_member_role_from_division(
  p_team_id uuid,
  p_user_id uuid,
  p_role text,
  p_division_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role = 'owner' then
    raise exception 'El propietario no se puede eliminar desde este panel';
  end if;

  if not exists (
    select 1
    from public.team_user_memberships manager
    where manager.team_id = p_team_id
      and manager.user_id = auth.uid()
      and manager.role in ('owner', 'directivo')
      and manager.status = 'active'
  ) then
    raise exception 'No tienes permisos para editar este equipo';
  end if;

  delete from public.team_user_memberships
  where team_id = p_team_id
    and user_id = p_user_id
    and role = p_role
    and division_id is not distinct from p_division_id;

  if not found then
    raise exception 'La membresia seleccionada no existe';
  end if;
end;
$$;

drop function if exists public.get_team_members_for_manager(uuid);
create function public.get_team_members_for_manager(p_team_id uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  username text,
  athlonx_code text,
  role text,
  role_label text,
  division_id uuid,
  division_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id,
    profile.full_name,
    profile.avatar_url,
    profile.username,
    profile.athlonx_code,
    membership.role,
    membership.role_label,
    membership.division_id,
    division.name
  from public.team_user_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  left join public.team_division_catalog division on division.id = membership.division_id
  where membership.team_id = p_team_id
    and membership.status = 'active'
    and exists (
      select 1
      from public.team_user_memberships manager
      where manager.team_id = p_team_id
        and manager.user_id = auth.uid()
        and manager.role in ('owner', 'directivo', 'entrenador')
        and manager.status = 'active'
    )
  order by profile.full_name, membership.role;
$$;

revoke all on function public.create_team_division_player_invitation(uuid, uuid, uuid) from public;
revoke all on function public.create_team_division_member_invitation(uuid, uuid, uuid, text, text) from public;
revoke all on function public.remove_team_player_from_division(uuid, uuid) from public;
revoke all on function public.remove_team_member_role_from_division(uuid, uuid, text, uuid) from public;
revoke all on function public.respond_affiliation_request(uuid, text) from public;
revoke all on function public.get_team_members_for_manager(uuid) from public;
grant execute on function public.create_team_division_player_invitation(uuid, uuid, uuid) to authenticated;
grant execute on function public.create_team_division_member_invitation(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.remove_team_player_from_division(uuid, uuid) to authenticated;
grant execute on function public.remove_team_member_role_from_division(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.respond_affiliation_request(uuid, text) to authenticated;
grant execute on function public.get_team_members_for_manager(uuid) to authenticated;
