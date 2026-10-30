-- Rugby: reglas de tiempo de los partidos validadas en la base de datos (equivalente a fútbol 8).
-- Ejecutar después de football-eight-knockout-migration.sql (usa early_finish_confirmed)
-- y de rugby-overtime-migration.sql. Idempotente.
--
-- Reglas para partidos de rugby cuando el cambio lo hace un usuario de la app:
--   * Un resultado final no se modifica.
--   * El 1.er tiempo solo pasa a descanso si cumplió su duración o se confirmó el cierre anticipado.
--   * Al reanudar el 2.º tiempo el reloj parte de cero.
--   * El partido solo finaliza en vivo, en el 2.º tiempo, cumplido el tiempo o con cierre confirmado.
-- No se aplican a cambios hechos directamente en SQL (siembras, correcciones del administrador),
-- porque ahí no hay usuario de sesión, ni a la prórroga de muerte súbita, que tiene sus funciones.
-- Tolerancia de 2 segundos entre el reloj del navegador y el del servidor.

begin;

alter table public.matches
  add column if not exists early_finish_confirmed boolean not null default false;

create or replace function public.validate_rugby_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_rugby boolean;
  half_minutes integer;
  elapsed integer;
begin
  if auth.uid() is null then return new; end if;
  if old.match_phase in ('overtime', 'overtime_finished')
     or new.match_phase in ('overtime', 'overtime_finished') then
    return new;
  end if;

  select exists (
    select 1
    from public.fixtures f
    join public.tournaments t on t.id = f.tournament_id
    join public.disciplines d on d.id = t.discipline_id
    where f.id = new.fixture_id and d.code = 'rugby'
  ) into is_rugby;
  if not is_rugby then return new; end if;

  select s.half_duration_minutes into half_minutes
  from public.tournament_competition_settings s
  join public.fixtures f on f.tournament_id = s.tournament_id
  where f.id = new.fixture_id;
  half_minutes := coalesce(half_minutes, 7);

  elapsed := coalesce(old.elapsed_seconds, 0) + case
    when old.status = 'live' and not coalesce(old.is_paused, false) and old.started_at is not null
      then greatest(0, floor(extract(epoch from now() - old.started_at))::integer)
    else 0 end;

  if old.status = 'finished'
     and (new.status, new.local_score, new.visitor_score)
       is distinct from (old.status, old.local_score, old.visitor_score) then
    raise exception 'No se puede modificar un resultado final.';
  end if;

  if old.period = 'first_half' and new.period = 'second_half' then
    if old.status <> 'live' or coalesce(old.is_paused, false) then
      raise exception 'El primer tiempo no está en juego.';
    end if;
    if elapsed < half_minutes * 60 - 2 and not coalesce(new.early_finish_confirmed, false) then
      raise exception 'El primer tiempo aún no ha terminado.';
    end if;
    new.is_paused := true;
    new.started_at := now();
    new.elapsed_seconds := 0;
    new.early_finish_confirmed := false;
  end if;

  if old.period = 'second_half' and coalesce(old.is_paused, false)
     and not coalesce(new.is_paused, false) and new.status = 'live' then
    new.started_at := now();
    new.elapsed_seconds := 0;
  end if;

  if new.status = 'finished' and old.status <> 'finished'
     and old.period in ('first_half', 'second_half') then
    if old.status <> 'live' or coalesce(old.is_paused, false) or old.period <> 'second_half'
       or (elapsed < half_minutes * 60 - 2 and not coalesce(new.early_finish_confirmed, false)) then
      raise exception 'Cumple el tiempo reglamentario antes de finalizar el partido.';
    end if;
    new.early_finish_confirmed := false;
  end if;

  return new;
end $$;

drop trigger if exists validate_rugby_match_trigger on public.matches;
create trigger validate_rugby_match_trigger before update on public.matches
for each row execute function public.validate_rugby_match();

commit;
