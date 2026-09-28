-- AthlonX: configura las divisiones generales de cada equipo.
-- Ejecutar despues de team-division-normalization-migration.sql.

create or replace function public.save_team_divisions(
  p_team_id uuid,
  p_divisions text[] default '{}'::text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_division text;
  canonical_division text;
  selected_divisions text[] := '{}'::text[];
begin
  if not exists (
    select 1
    from public.teams team
    where team.id = p_team_id
      and (
        team.created_by = auth.uid()
        or exists (
          select 1
          from public.team_user_memberships membership
          where membership.team_id = team.id
            and membership.user_id = auth.uid()
            and membership.role in ('owner', 'directivo')
            and membership.status = 'active'
        )
      )
  ) then
    raise exception 'No tienes permisos para configurar este equipo';
  end if;

  foreach requested_division in array coalesce(p_divisions, '{}'::text[]) loop
    canonical_division := case lower(trim(coalesce(requested_division, '')))
      when 'primera división' then 'Primera división'
      when 'segunda división' then 'Segunda división'
      when 'tercera división' then 'Tercera división'
      when 'femenina' then 'Femenina'
      else null
    end;

    if canonical_division is not null
      and not (canonical_division = any(selected_divisions)) then
      selected_divisions := array_append(selected_divisions, canonical_division);
    end if;
  end loop;

  delete from public.team_division_catalog
  where team_id = p_team_id
    and discipline_id is null;

  foreach canonical_division in array selected_divisions loop
    insert into public.team_division_catalog (team_id, name, discipline_id)
    values (p_team_id, canonical_division, null)
    on conflict (team_id, name)
    do update set discipline_id = null;
  end loop;
end;
$$;

revoke all on function public.save_team_divisions(uuid, text[]) from public;
grant execute on function public.save_team_divisions(uuid, text[]) to authenticated;
