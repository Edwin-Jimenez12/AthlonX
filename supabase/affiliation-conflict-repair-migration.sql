-- AthlonX: repara las restricciones usadas al aceptar vinculaciones.
-- Ejecutar despues de identity-affiliations-migration.sql,
-- account-contexts-migration.sql y team-organization-invitations-migration.sql.

-- Conserva una sola membresia por organizacion, persona y rol. Se prioriza
-- una membresia activa y, en igualdad de condiciones, la mas reciente.
with ranked_memberships as (
  select
    id,
    row_number() over (
      partition by organization_id, user_id, role
      order by (status = 'active') desc, created_at desc nulls last, id desc
    ) as duplicate_rank
  from public.organization_members
)
delete from public.organization_members memberships
using ranked_memberships ranked
where memberships.id = ranked.id
  and ranked.duplicate_rank > 1;

-- CREATE TABLE IF NOT EXISTS no agrega esta restriccion a tablas existentes.
-- El indice permite resolver ON CONFLICT (organization_id, user_id, role).
create unique index if not exists organization_members_org_user_role_key
  on public.organization_members (organization_id, user_id, role);

-- Reemplaza la funcion para que la aceptacion de invitaciones de equipo no
-- dependa de una unicidad por equipo y persona: una persona puede tener varios
-- roles dentro del mismo equipo.
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
    or (v_request.target_organization_id is not null and public.is_organization_manager(v_request.target_organization_id))
    or exists (
      select 1
      from public.team_user_memberships m
      where m.team_id = v_request.target_team_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'directivo')
        and m.status = 'active'
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
        from public.team_user_memberships
        where team_id = v_request.source_team_id
          and user_id = v_request.target_user_id
          and role = v_request.role
      ) then
        update public.team_user_memberships
        set role_label = v_request.role_label, status = 'active'
        where team_id = v_request.source_team_id
          and user_id = v_request.target_user_id
          and role = v_request.role;
      else
        insert into public.team_user_memberships (team_id, user_id, role, role_label, status)
        values (v_request.source_team_id, v_request.target_user_id, v_request.role, v_request.role_label, 'active');
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
        superior_organization_id,
        subordinate_organization_id,
        relationship_type,
        discipline_id,
        modality_id,
        status,
        requested_by,
        responded_by,
        responded_at
      ) values (
        v_request.source_organization_id,
        v_request.target_organization_id,
        v_request.relationship_type,
        v_request.discipline_id,
        v_request.modality_id,
        'active',
        v_request.created_by,
        auth.uid(),
        now()
      );
    end if;
  end if;

  update public.affiliation_requests
  set status = p_decision,
      responded_by = auth.uid(),
      responded_at = now()
  where id = v_request.id
  returning * into v_request;

  update public.user_notifications
  set read_at = now()
  where affiliation_request_id = p_request_id
    and recipient_user_id = auth.uid();

  return v_request;
end;
$$;

revoke all on function public.respond_affiliation_request(uuid, text) from public;
grant execute on function public.respond_affiliation_request(uuid, text) to authenticated;
