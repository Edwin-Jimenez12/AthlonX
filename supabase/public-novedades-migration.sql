-- AthlonX: novedades publicadas visibles en la página pública /novedades.
-- Solo devuelve versiones con status = 'publicada'. Las tablas siguen cerradas al público.
-- Idempotente.

create or replace function public.platform_public_releases()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'version', r.version,
    'title', r.title,
    'published_at', r.published_at,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object('title', s.title, 'body', s.body) order by s.position)
      from public.release_note_sections s where s.release_id = r.id
    ), '[]'::jsonb)
  ) order by r.published_at desc), '[]'::jsonb)
  from public.release_notes r
  where r.status = 'publicada';
$$;

revoke all on function public.platform_public_releases() from public;
grant execute on function public.platform_public_releases() to anon, authenticated;
