-- Añade modalidad a los equipos para que las organizaciones puedan filtrar
-- sus equipos afiliados por disciplina y modalidad.

alter table if exists public.teams
  add column if not exists modality_id uuid references public.sport_modalities(id) on delete set null;

create index if not exists teams_modality_id_idx on public.teams (modality_id);

grant select on public.teams to authenticated;

-- Permite que los nuevos registros de equipo envíen team_modality en los
-- metadatos de Supabase Auth sin reemplazar el trigger existente de equipos.
create or replace function public.assign_new_team_modality()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modality_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', 'persona') <> 'equipo' then
    return new;
  end if;

  select id into v_modality_id
  from public.sport_modalities
  where id::text = nullif(new.raw_user_meta_data ->> 'team_modality', '')
    and is_active = true;

  if v_modality_id is not null then
    update public.teams
    set modality_id = v_modality_id
    where id = (
      select id
      from public.teams
      where created_by = new.id
      order by created_at desc
      limit 1
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_team_modality on auth.users;
create trigger on_auth_user_created_team_modality
  after insert on auth.users
  for each row execute procedure public.assign_new_team_modality();

grant execute on function public.assign_new_team_modality() to authenticated;
