-- Invitaciones publicas para atletas y equipos.
-- Ejecutar despues de identity-affiliations-migration.sql,
-- account-contexts-migration.sql y public-search-migration.sql.

alter table public.profiles
  add column if not exists allow_athlete_invitations boolean not null default true;

alter table public.affiliation_requests
  add column if not exists target_team_id uuid references public.teams(id) on delete cascade;

-- Reemplaza la restriccion anterior para permitir persona, organizacion o equipo
-- como destino, pero nunca mas de uno al mismo tiempo.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.affiliation_requests'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%target_user_id%'
  loop
    execute format('alter table public.affiliation_requests drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table public.affiliation_requests
  drop constraint if exists affiliation_requests_target_check;

alter table public.affiliation_requests
  add constraint affiliation_requests_target_check
  check (
    (target_user_id is not null)::integer
    + (target_organization_id is not null)::integer
    + (target_team_id is not null)::integer = 1
  );

create or replace function public.search_invitable_athletes(p_query text, p_limit integer default 20)
returns table (id uuid, full_name text, avatar_url text, username text, athlonx_code text)
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select lower(trim(regexp_replace(coalesce(p_query, ''), '^@', ''))) as term
  )
  select p.id, p.full_name, p.avatar_url, p.username, p.athlonx_code
  from public.profiles p, input
  where p.is_searchable = true
    and p.allow_athlete_invitations = true
    and exists (
      select 1 from public.user_roles r
      where r.user_id = p.id and r.role = 'atleta'
    )
    and input.term <> ''
    and (
      lower(coalesce(p.athlonx_code, '')) like '%' || input.term || '%'
      or lower(coalesce(p.username, '')) like '%' || input.term || '%'
      or lower(p.full_name) like '%' || input.term || '%'
    )
  order by
    case
      when lower(coalesce(p.athlonx_code, '')) = input.term then 0
      when lower(coalesce(p.username, '')) = input.term then 1
      when lower(p.full_name) = input.term then 2
      else 3
    end,
    p.full_name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.search_invitable_teams(p_query text, p_limit integer default 20)
returns table (id uuid, name text, logo_url text, city text, username text, athlonx_code text)
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select lower(trim(regexp_replace(coalesce(p_query, ''), '^@', ''))) as term
  )
  select t.id, t.name, t.logo_url, t.city, t.handle, t.athlonx_code
  from public.teams t, input
  where t.is_public = true
    and t.organization_id is null
    and input.term <> ''
    and (
      lower(coalesce(t.athlonx_code, '')) like '%' || input.term || '%'
      or lower(coalesce(t.handle, '')) like '%' || input.term || '%'
      or lower(t.name) like '%' || input.term || '%'
    )
  order by
    case
      when lower(coalesce(t.athlonx_code, '')) = input.term then 0
      when lower(coalesce(t.handle, '')) = input.term then 1
      when lower(t.name) = input.term then 2
      else 3
    end,
    t.name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

drop function if exists public.create_affiliation_request(uuid, uuid, uuid, uuid, text, text, text, uuid, uuid);

create or replace function public.create_affiliation_request(
  p_target_user_id uuid default null,
  p_target_organization_id uuid default null,
  p_source_organization_id uuid default null,
  p_source_team_id uuid default null,
  p_role text default null,
  p_role_label text default null,
  p_relationship_type text default null,
  p_discipline_id uuid default null,
  p_modality_id uuid default null,
  p_target_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if (p_source_organization_id is null) = (p_source_team_id is null) then
    raise exception 'Debes indicar una organizacion o un equipo de origen';
  end if;

  if (p_target_user_id is not null)::integer
     + (p_target_organization_id is not null)::integer
     + (p_target_team_id is not null)::integer <> 1 then
    raise exception 'Debes indicar una sola cuenta de destino';
  end if;

  if p_source_organization_id is not null and not public.is_organization_manager(p_source_organization_id) then
    raise exception 'No tienes permisos para enviar solicitudes desde esta organizacion';
  end if;

  if p_source_team_id is not null and not exists (
    select 1 from public.team_user_memberships m
    where m.team_id = p_source_team_id and m.user_id = auth.uid()
      and m.role in ('owner', 'directivo') and m.status = 'active'
  ) then
    raise exception 'No tienes permisos para enviar solicitudes desde este equipo';
  end if;

  if p_target_user_id is not null and p_role not in ('atleta', 'entrenador', 'staff', 'directivo') then
    raise exception 'El rol de la persona no es valido';
  end if;

  if p_target_team_id is not null then
    if p_source_organization_id is null then
      raise exception 'Solo una organizacion puede invitar un equipo';
    end if;
    if not exists (
      select 1 from public.teams t
      where t.id = p_target_team_id
        and t.is_public = true
        and (t.organization_id is null or t.organization_id = p_source_organization_id)
    ) then
      raise exception 'El equipo no esta disponible para vinculacion';
    end if;
  end if;

  if p_target_organization_id is not null and p_relationship_type not in ('supervisa', 'reconoce', 'afiliada_a', 'avala', 'coordina') then
    raise exception 'El tipo de relacion institucional no es valido';
  end if;

  insert into public.affiliation_requests (
    source_organization_id, source_team_id, target_user_id, target_organization_id, target_team_id,
    role, role_label, relationship_type, discipline_id, modality_id, created_by
  ) values (
    p_source_organization_id, p_source_team_id, p_target_user_id, p_target_organization_id, p_target_team_id,
    p_role, nullif(trim(p_role_label), ''), p_relationship_type, p_discipline_id, p_modality_id, auth.uid()
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.notify_affiliation_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_user_id is not null then
    insert into public.user_notifications (recipient_user_id, affiliation_request_id, title, body)
    values (
      new.target_user_id,
      new.id,
      'Nueva vinculacion en AthlonX',
      coalesce(new.role_label, initcap(new.role)) || '. Revisa la solicitud para aceptarla o rechazarla.'
    );
  elsif new.target_team_id is not null then
    insert into public.user_notifications (recipient_user_id, affiliation_request_id, title, body)
    select distinct m.user_id, new.id, 'Invitacion para tu equipo',
      'Una organizacion quiere vincular tu equipo. Revisa la solicitud para aceptarla o rechazarla.'
    from public.team_user_memberships m
    where m.team_id = new.target_team_id
      and m.role in ('owner', 'directivo')
      and m.status = 'active'
      and m.user_id is not null;
  else
    insert into public.user_notifications (recipient_user_id, affiliation_request_id, title, body)
    select distinct m.user_id, new.id, 'Nueva relacion institucional',
      'Una organizacion propone una relacion de ' || replace(new.relationship_type, '_', ' ') || '.'
    from public.organization_members m
    where m.organization_id = new.target_organization_id
      and m.role in ('owner', 'directivo')
      and m.status = 'active'
      and m.user_id is not null;
  end if;
  return new;
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
  select * into v_request from public.affiliation_requests where id = p_request_id for update;
  if not found or v_request.status <> 'pending' then
    raise exception 'La solicitud ya no esta disponible';
  end if;

  v_can_respond := v_request.target_user_id = auth.uid()
    or (v_request.target_organization_id is not null and public.is_organization_manager(v_request.target_organization_id))
    or exists (
      select 1 from public.team_user_memberships m
      where m.team_id = v_request.target_team_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'directivo')
        and m.status = 'active'
    );
  if not v_can_respond then raise exception 'No puedes responder esta solicitud'; end if;
  if p_decision not in ('accepted', 'rejected') then raise exception 'Decision no valida'; end if;

  if p_decision = 'accepted' then
    if v_request.target_user_id is not null and v_request.source_organization_id is not null then
      insert into public.organization_members (organization_id, user_id, role, role_label, status)
      values (v_request.source_organization_id, v_request.target_user_id, v_request.role, v_request.role_label, 'active')
      on conflict (organization_id, user_id, role) do update set role_label = excluded.role_label, status = 'active';
    elsif v_request.target_user_id is not null and v_request.source_team_id is not null then
      if exists (
        select 1 from public.team_user_memberships
        where team_id = v_request.source_team_id and user_id = v_request.target_user_id
      ) then
        update public.team_user_memberships
        set role = v_request.role, role_label = v_request.role_label, status = 'active'
        where team_id = v_request.source_team_id and user_id = v_request.target_user_id;
      else
        insert into public.team_user_memberships (team_id, user_id, role, role_label, status)
        values (v_request.source_team_id, v_request.target_user_id, v_request.role, v_request.role_label, 'active');
      end if;
    elsif v_request.target_team_id is not null and v_request.source_organization_id is not null then
      update public.teams
      set organization_id = v_request.source_organization_id
      where id = v_request.target_team_id
        and (organization_id is null or organization_id = v_request.source_organization_id);
      if not found then raise exception 'El equipo ya pertenece a otra organizacion'; end if;
    elsif v_request.target_organization_id is not null then
      insert into public.organization_relationships (superior_organization_id, subordinate_organization_id, relationship_type, discipline_id, modality_id, status, requested_by, responded_by, responded_at)
      values (v_request.source_organization_id, v_request.target_organization_id, v_request.relationship_type, v_request.discipline_id, v_request.modality_id, 'active', v_request.created_by, auth.uid(), now());
    end if;
  end if;

  update public.affiliation_requests
  set status = p_decision, responded_by = auth.uid(), responded_at = now()
  where id = v_request.id
  returning * into v_request;

  update public.user_notifications
  set read_at = now()
  where affiliation_request_id = p_request_id and recipient_user_id = auth.uid();
  return v_request;
end;
$$;

revoke all on function public.search_invitable_athletes(text, integer) from public;
revoke all on function public.search_invitable_teams(text, integer) from public;
revoke all on function public.create_affiliation_request(uuid, uuid, uuid, uuid, text, text, text, uuid, uuid, uuid) from public;
revoke all on function public.respond_affiliation_request(uuid, text) from public;
grant execute on function public.search_invitable_athletes(text, integer) to authenticated;
grant execute on function public.search_invitable_teams(text, integer) to authenticated;
grant execute on function public.create_affiliation_request(uuid, uuid, uuid, uuid, text, text, text, uuid, uuid, uuid) to authenticated;
grant execute on function public.respond_affiliation_request(uuid, text) to authenticated;

create or replace function public.get_team_roster_for_manager(p_team_id uuid)
returns table (user_id uuid, full_name text, avatar_url text, username text, athlonx_code text, role_label text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url, p.username, p.athlonx_code, m.role_label
  from public.team_user_memberships m
  join public.profiles p on p.id = m.user_id
  where m.team_id = p_team_id
    and m.role = 'atleta'
    and m.status = 'active'
    and exists (
      select 1 from public.team_user_memberships manager
      where manager.team_id = p_team_id
        and manager.user_id = auth.uid()
        and manager.role in ('owner', 'directivo')
        and manager.status = 'active'
    )
  order by p.full_name;
$$;

revoke all on function public.get_team_roster_for_manager(uuid) from public;
grant execute on function public.get_team_roster_for_manager(uuid) to authenticated;

drop trigger if exists on_affiliation_request_created on public.affiliation_requests;
create trigger on_affiliation_request_created
  after insert on public.affiliation_requests
  for each row execute procedure public.notify_affiliation_request();
