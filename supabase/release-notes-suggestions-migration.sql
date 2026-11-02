-- AthlonX: novedades (versiones con secciones) y sugerencias/valoraciones del panel.
-- Las sugerencias son solo de visualización en el panel: no se responde ni se notifica a nadie desde aquí.
-- Idempotente.

create table if not exists public.release_notes (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check (version ~ '^v[0-9]+\.[0-9]+\.[0-9]+$'),
  title text not null,
  status text not null default 'borrador' check (status in ('borrador', 'publicada')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.release_note_sections (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.release_notes(id) on delete cascade,
  position integer not null check (position >= 1),
  title text not null,
  body text not null,
  unique (release_id, position)
);

alter table public.release_notes enable row level security;
alter table public.release_note_sections enable row level security;

-- Crear o reemplazar una versión con sus secciones. Requiere "novedades".
-- p_sections: [{"title": "...", "body": "..."}, ...]
create or replace function public.platform_save_release(
  p_id uuid, p_version text, p_title text, p_status text, p_sections jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_id;
  s jsonb;
  i integer := 0;
begin
  if not public.platform_has('novedades') then
    raise exception 'No tienes permiso para gestionar novedades.';
  end if;

  if v_id is null then
    insert into public.release_notes (version, title, status, published_at, created_by)
    values (p_version, p_title, p_status, case when p_status = 'publicada' then now() end, auth.uid())
    returning id into v_id;
  else
    update public.release_notes set
      version = p_version,
      title = p_title,
      status = p_status,
      published_at = case
        when p_status = 'publicada' then coalesce(published_at, now())
        else null end,
      updated_at = now()
    where id = v_id;
    if not found then raise exception 'La versión no existe.'; end if;
    delete from public.release_note_sections where release_id = v_id;
  end if;

  for s in select * from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) loop
    i := i + 1;
    insert into public.release_note_sections (release_id, position, title, body)
    values (v_id, i, s->>'title', s->>'body');
  end loop;
  return v_id;
end;
$$;

-- Lista de versiones con sus secciones. Requiere "novedades".
create or replace function public.platform_list_releases()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.platform_has('novedades') then
    raise exception 'No tienes permiso para ver novedades.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'version', r.version, 'title', r.title, 'status', r.status,
      'published_at', r.published_at,
      'sections', coalesce((
        select jsonb_agg(jsonb_build_object('title', x.title, 'body', x.body) order by x.position)
        from public.release_note_sections x where x.release_id = r.id
      ), '[]'::jsonb)
    ) order by r.created_at desc)
    from public.release_notes r
  ), '[]'::jsonb);
end;
$$;

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sugerencia', 'valoracion')),
  category text check (category in ('mejora', 'nueva_funcion', 'error', 'otra')),
  other_category_name text,
  title text,
  body text not null check (length(body) between 1 and 1000),
  rating smallint check (rating between 1 and 5),
  author_id uuid references auth.users(id) on delete set null,
  is_anonymous boolean not null default true,
  publish_identity boolean not null default false,
  status text not null default 'recibida' check (status in ('recibida', 'en_revision', 'planeada', 'lista', 'descartada')),
  created_at timestamptz not null default now(),
  constraint suggestions_kind_fields check (
    (kind = 'valoracion' and rating is not null and category is null)
    or (kind = 'sugerencia' and rating is null and category is not null)
  ),
  constraint suggestions_identity_rule check (not (is_anonymous and publish_identity)),
  constraint suggestions_other_name check (category <> 'otra' or other_category_name is not null)
);

alter table public.suggestions enable row level security;
-- Sin políticas: se escribe con platform_submit_suggestion y se lee con funciones del panel.

-- Envío desde la plataforma. El autor se guarda para moderación interna; el panel no lo muestra si es anónimo.
create or replace function public.platform_submit_suggestion(
  p_kind text, p_category text, p_other_name text, p_title text, p_body text,
  p_rating smallint, p_anonymous boolean, p_publish_identity boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para enviar una sugerencia.';
  end if;
  insert into public.suggestions (kind, category, other_category_name, title, body, rating,
    author_id, is_anonymous, publish_identity)
  values (p_kind,
    case when p_kind = 'sugerencia' then p_category end,
    case when p_category = 'otra' then p_other_name end,
    p_title, p_body,
    case when p_kind = 'valoracion' then p_rating end,
    auth.uid(), coalesce(p_anonymous, true),
    case when coalesce(p_anonymous, true) then false else coalesce(p_publish_identity, false) end)
  returning id into v_id;
  return v_id;
end;
$$;

-- Bandeja para el panel con resumen. Requiere "sugerencias". Nunca devuelve autor si es anónimo.
create or replace function public.platform_list_suggestions(p_kind text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.platform_has('sugerencias') then
    raise exception 'No tienes permiso para ver sugerencias.';
  end if;
  return jsonb_build_object(
    'resumen', jsonb_build_object(
      'recibidas', (select count(*) from public.suggestions where status = 'recibida'),
      'en_revision', (select count(*) from public.suggestions where status = 'en_revision'),
      'planeadas', (select count(*) from public.suggestions where status = 'planeada'),
      'valoracion_promedio', (select round(avg(rating)::numeric, 1) from public.suggestions where kind = 'valoracion'),
      'valoraciones', (select count(*) from public.suggestions where kind = 'valoracion')
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'kind', s.kind, 'category', s.category, 'other_category_name', s.other_category_name,
        'title', s.title, 'body', s.body, 'rating', s.rating, 'status', s.status,
        'created_at', s.created_at, 'is_anonymous', s.is_anonymous,
        'publish_identity', s.publish_identity,
        'author_name', case when s.is_anonymous then null else coalesce(p.full_name, 'Cuenta de AthlonX') end
      ) order by s.created_at desc)
      from public.suggestions s
      left join public.profiles p on p.id = s.author_id
      where p_kind is null or s.kind = p_kind
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.platform_save_release(uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.platform_list_releases() from public, anon;
revoke all on function public.platform_submit_suggestion(text, text, text, text, text, smallint, boolean, boolean) from public, anon;
revoke all on function public.platform_list_suggestions(text) from public, anon;
grant execute on function public.platform_save_release(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.platform_list_releases() to authenticated;
grant execute on function public.platform_submit_suggestion(text, text, text, text, text, smallint, boolean, boolean) to authenticated;
grant execute on function public.platform_list_suggestions(text) to authenticated;
