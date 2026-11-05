-- Entrenamientos (Free), formaciones y anuncios (Pro para el entrenador con cuenta personal).
-- Decisiones por defecto (a revisar con Edwin y el entrenador):
--   · Entrenamientos: sesiones con ejercicios, asignadas a toda la división o a un equipo; plantillas reutilizables. Sin repetición en esta versión.
--   · Formaciones: por equipo y reutilizables, con deporte (rugby por defecto).
--   · Anuncios: publica el entrenador o el directivo; se ven dentro de la app (sin push).
-- Gestionan: dueño, directivo y entrenador. Ven: cualquier miembro activo del equipo.
-- Idempotente: se puede volver a ejecutar.

-- ---------- Entrenamientos ----------
create table if not exists public.team_training_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  division_id uuid references public.team_division_catalog(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  starts_at timestamptz not null,
  duration_min integer not null default 60 check (duration_min between 5 and 480),
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.team_training_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.team_training_sessions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  detail text,
  position integer not null default 0
);

create table if not exists public.team_training_responses (
  session_id uuid not null references public.team_training_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('voy', 'tal_vez', 'no_voy')),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.team_training_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  exercises jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- Formaciones (Pro) ----------
create table if not exists public.team_formations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  sport text not null default 'rugby',
  positions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Anuncios (Pro) ----------
create table if not exists public.team_announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  division_id uuid references public.team_division_catalog(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.team_announcement_views (
  announcement_id uuid not null references public.team_announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- Regla de plan: un entrenador con cuenta personal Libre no crea formaciones ni anuncios.
create or replace function public.enforce_persona_pro_for_coach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_code text;
begin
  if new.created_by is null then return new; end if;
  select m.role into v_role from public.team_user_memberships m
  where m.team_id = new.team_id and m.user_id = new.created_by and m.status = 'active'
  order by case m.role when 'owner' then 1 when 'directivo' then 2 when 'entrenador' then 3 when 'staff' then 4 else 5 end
  limit 1;
  if v_role is distinct from 'entrenador' then return new; end if;
  select p.code into v_code from public.account_plans ap
  join public.plans p on p.code = ap.plan_code
  where ap.account_type = 'persona' and ap.account_id = new.created_by and (ap.ends_at is null or ap.ends_at > now())
  limit 1;
  if coalesce(v_code, 'libre') = 'libre' then
    raise exception 'Esta función es de Pro. Mejora tu plan para usarla.';
  end if;
  return new;
end;
$$;

drop trigger if exists team_formations_pro on public.team_formations;
create trigger team_formations_pro before insert on public.team_formations
  for each row execute function public.enforce_persona_pro_for_coach();
drop trigger if exists team_announcements_pro on public.team_announcements;
create trigger team_announcements_pro before insert on public.team_announcements
  for each row execute function public.enforce_persona_pro_for_coach();

-- ---------- Seguridad por fila ----------
alter table public.team_training_sessions enable row level security;
alter table public.team_training_exercises enable row level security;
alter table public.team_training_responses enable row level security;
alter table public.team_training_templates enable row level security;
alter table public.team_formations enable row level security;
alter table public.team_announcements enable row level security;
alter table public.team_announcement_views enable row level security;

drop policy if exists "sesiones: miembros ven" on public.team_training_sessions;
create policy "sesiones: miembros ven" on public.team_training_sessions for select to authenticated
  using (public.calendar_team_role(team_id) is not null);
drop policy if exists "sesiones: gestores crean" on public.team_training_sessions;
create policy "sesiones: gestores crean" on public.team_training_sessions for insert to authenticated
  with check (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador') and created_by = auth.uid());
drop policy if exists "sesiones: gestores editan" on public.team_training_sessions;
create policy "sesiones: gestores editan" on public.team_training_sessions for update to authenticated
  using (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador'))
  with check (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador'));
drop policy if exists "sesiones: gestores borran" on public.team_training_sessions;
create policy "sesiones: gestores borran" on public.team_training_sessions for delete to authenticated
  using (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador'));

drop policy if exists "ejercicios: miembros ven" on public.team_training_exercises;
create policy "ejercicios: miembros ven" on public.team_training_exercises for select to authenticated
  using (exists (select 1 from public.team_training_sessions s where s.id = session_id and public.calendar_team_role(s.team_id) is not null));
drop policy if exists "ejercicios: gestores escriben" on public.team_training_exercises;
create policy "ejercicios: gestores escriben" on public.team_training_exercises for all to authenticated
  using (exists (select 1 from public.team_training_sessions s where s.id = session_id and public.calendar_team_role(s.team_id) in ('owner', 'directivo', 'entrenador')))
  with check (exists (select 1 from public.team_training_sessions s where s.id = session_id and public.calendar_team_role(s.team_id) in ('owner', 'directivo', 'entrenador')));

drop policy if exists "respuestas: miembros ven" on public.team_training_responses;
create policy "respuestas: miembros ven" on public.team_training_responses for select to authenticated
  using (exists (select 1 from public.team_training_sessions s where s.id = session_id and public.calendar_team_role(s.team_id) is not null));
drop policy if exists "respuestas: cada uno responde por sí mismo" on public.team_training_responses;
create policy "respuestas: cada uno responde por sí mismo" on public.team_training_responses for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.team_training_sessions s where s.id = session_id and public.calendar_team_role(s.team_id) is not null));
drop policy if exists "respuestas: cada uno cambia su respuesta" on public.team_training_responses;
create policy "respuestas: cada uno cambia su respuesta" on public.team_training_responses for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "plantillas: miembros ven" on public.team_training_templates;
create policy "plantillas: miembros ven" on public.team_training_templates for select to authenticated
  using (public.calendar_team_role(team_id) is not null);
drop policy if exists "plantillas: gestores escriben" on public.team_training_templates;
create policy "plantillas: gestores escriben" on public.team_training_templates for all to authenticated
  using (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador'))
  with check (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador'));

drop policy if exists "formaciones: miembros ven" on public.team_formations;
create policy "formaciones: miembros ven" on public.team_formations for select to authenticated
  using (public.calendar_team_role(team_id) is not null);
drop policy if exists "formaciones: gestores escriben" on public.team_formations;
create policy "formaciones: gestores escriben" on public.team_formations for all to authenticated
  using (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador'))
  with check (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador'));

drop policy if exists "anuncios: ven los de su división" on public.team_announcements;
create policy "anuncios: ven los de su división" on public.team_announcements for select to authenticated
  using (
    public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador')
    or (public.calendar_team_role(team_id) is not null and (
      division_id is null
      or exists (select 1 from public.team_user_memberships m
                 where m.team_id = team_announcements.team_id and m.user_id = auth.uid() and m.status = 'active'
                   and (m.division_id = team_announcements.division_id or m.division_id is null))))
  );
drop policy if exists "anuncios: gestores escriben" on public.team_announcements;
create policy "anuncios: gestores escriben" on public.team_announcements for all to authenticated
  using (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador'))
  with check (public.calendar_team_role(team_id) in ('owner', 'directivo', 'entrenador') and created_by = auth.uid());

drop policy if exists "vistas: cada uno registra la suya" on public.team_announcement_views;
create policy "vistas: cada uno registra la suya" on public.team_announcement_views for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.team_announcements a where a.id = announcement_id));
drop policy if exists "vistas: ven las suyas o los gestores" on public.team_announcement_views;
create policy "vistas: ven las suyas o los gestores" on public.team_announcement_views for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.team_announcements a where a.id = announcement_id and public.calendar_team_role(a.team_id) in ('owner', 'directivo', 'entrenador')));

grant select, insert, update, delete on public.team_training_sessions, public.team_training_exercises, public.team_training_responses, public.team_training_templates, public.team_formations, public.team_announcements to authenticated;
grant select, insert on public.team_announcement_views to authenticated;
