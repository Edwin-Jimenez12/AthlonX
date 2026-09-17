-- AthlonX: contenido editable para la seccion publica de actualizaciones.
create table if not exists public.platform_update_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  content text,
  category text not null default 'Nueva función'
    check (category in ('Nueva función', 'Mejora', 'Corrección', 'Aviso')),
  version text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_platform_update_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_update_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.touch_platform_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platform_updates_touch_updated_at on public.platform_updates;
create trigger platform_updates_touch_updated_at
before update on public.platform_updates
for each row execute function public.touch_platform_update();

alter table public.platform_update_admins enable row level security;
alter table public.platform_updates enable row level security;

drop policy if exists "Users can view own platform update admin access" on public.platform_update_admins;
create policy "Users can view own platform update admin access"
on public.platform_update_admins
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Public can view published platform updates" on public.platform_updates;
create policy "Public can view published platform updates"
on public.platform_updates
for select to anon, authenticated
using (is_published = true or public.is_platform_update_admin());

drop policy if exists "Platform admins can create platform updates" on public.platform_updates;
create policy "Platform admins can create platform updates"
on public.platform_updates
for insert to authenticated
with check (public.is_platform_update_admin() and created_by = auth.uid());

drop policy if exists "Platform admins can update platform updates" on public.platform_updates;
create policy "Platform admins can update platform updates"
on public.platform_updates
for update to authenticated
using (public.is_platform_update_admin())
with check (public.is_platform_update_admin());

drop policy if exists "Platform admins can delete platform updates" on public.platform_updates;
create policy "Platform admins can delete platform updates"
on public.platform_updates
for delete to authenticated
using (public.is_platform_update_admin());

grant select on public.platform_updates to anon, authenticated;
grant insert, update, delete on public.platform_updates to authenticated;
grant select on public.platform_update_admins to authenticated;
grant execute on function public.is_platform_update_admin() to authenticated;
