-- AthlonX: invitaciones para añadir personas a una organizacion.
-- Ejecutar despues de identity-affiliations-migration.sql y de las migraciones
-- de acceso organizacional.

create or replace function public.create_organization_member_invitation(
  p_organization_id uuid,
  p_target_user_id uuid,
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
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion';
  end if;

  if not public.is_organization_manager(p_organization_id) then
    raise exception 'No tienes permisos para añadir miembros a esta organizacion';
  end if;

  if p_target_user_id is null then
    raise exception 'Debes seleccionar una persona';
  end if;

  if p_role not in ('atleta', 'entrenador', 'staff', 'directivo') then
    raise exception 'El tipo de miembro no es valido';
  end if;

  if exists (
    select 1
    from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = p_target_user_id
      and member.status = 'active'
  ) then
    raise exception 'La persona ya pertenece a esta organizacion';
  end if;

  if exists (
    select 1
    from public.affiliation_requests request
    where request.source_organization_id = p_organization_id
      and request.target_user_id = p_target_user_id
      and request.status = 'pending'
  ) then
    raise exception 'Ya existe una invitacion pendiente para esta persona';
  end if;

  insert into public.affiliation_requests (
    source_organization_id,
    target_user_id,
    role,
    role_label,
    created_by
  )
  values (
    p_organization_id,
    p_target_user_id,
    p_role,
    nullif(trim(p_role_label), ''),
    auth.uid()
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_organization_member_invitation(uuid, uuid, text, text) from public;
grant execute on function public.create_organization_member_invitation(uuid, uuid, text, text) to authenticated;
