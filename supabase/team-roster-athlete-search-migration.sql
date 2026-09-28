-- AthlonX: permite cargar el catálogo completo de atletas en la plantilla de un equipo.
-- Ejecutar una vez en Supabase despues de las migraciones de invitaciones.

create or replace function public.search_invitable_athletes(
  p_query text,
  p_limit integer default 20
)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  username text,
  athlonx_code text
)
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select lower(trim(regexp_replace(coalesce(p_query, ''), '^@', ''))) as term
  )
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.username,
    p.athlonx_code
  from public.profiles p
  cross join input
  where p.is_searchable = true
    and p.allow_athlete_invitations = true
    and exists (
      select 1
      from public.user_roles r
      where r.user_id = p.id
        and r.role = 'atleta'
    )
    and (
      input.term = ''
      or lower(coalesce(p.athlonx_code, '')) like '%' || input.term || '%'
      or lower(coalesce(p.username, '')) like '%' || input.term || '%'
      or lower(p.full_name) like '%' || input.term || '%'
    )
  order by
    case when input.term = '' then p.full_name else null end asc,
    case when input.term <> '' and lower(p.full_name) = input.term then 0 else 1 end,
    p.full_name asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.search_invitable_athletes(text, integer) from public;
grant execute on function public.search_invitable_athletes(text, integer) to authenticated;
