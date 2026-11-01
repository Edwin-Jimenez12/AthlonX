-- Imágenes de perfil y banners: permisos de subida en el bucket "avatars" y columna de imagen de perfil del torneo.
-- Rutas: persona/{user_id}/..., jugador/{player_id}/..., equipo/{team_id}/..., organizacion/{organization_id}/...,
-- torneo/{tournament_id}/... (logo.webp y banner.webp). Idempotente.

begin;

alter table public.tournaments add column if not exists logo_url text;

create or replace function public.can_upload_profile_image(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  kind text;
  owner_id text;
begin
  if auth.uid() is null then return false; end if;
  parts := storage.foldername(object_name);
  if array_length(parts, 1) is null or array_length(parts, 1) < 2 then return false; end if;
  kind := parts[1];
  owner_id := parts[2];

  if kind = 'persona' then return owner_id = auth.uid()::text; end if;
  if owner_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;

  if kind = 'jugador' then
    return exists (select 1 from public.players p where p.id = owner_id::uuid and p.user_id = auth.uid());
  end if;
  if kind = 'equipo' then
    return exists (
      select 1 from public.teams t
      where t.id = owner_id::uuid
        and (t.created_by = auth.uid()
          or (t.organization_id is not null and public.is_organization_manager(t.organization_id)))
    );
  end if;
  if kind = 'organizacion' then
    return public.is_organization_manager(owner_id::uuid);
  end if;
  if kind = 'torneo' then
    return exists (select 1 from public.tournaments t where t.id = owner_id::uuid and t.created_by = auth.uid());
  end if;
  return false;
end;
$$;

revoke all on function public.can_upload_profile_image(text) from public, anon;
grant execute on function public.can_upload_profile_image(text) to authenticated;

drop policy if exists "avatars_owner_insert" on storage.objects;
drop policy if exists "avatars_owner_update" on storage.objects;
drop policy if exists "avatars_owner_delete" on storage.objects;

create policy "avatars_manage_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.can_upload_profile_image(name));

create policy "avatars_manage_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.can_upload_profile_image(name))
  with check (bucket_id = 'avatars' and public.can_upload_profile_image(name));

create policy "avatars_manage_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.can_upload_profile_image(name));

update storage.buckets set file_size_limit = 2097152 where id = 'avatars';

commit;
