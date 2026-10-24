-- Formatos de liga para rugby: "Todos contra todos" y "Liga + Fase final".
-- Idempotente. Depende de tournament_competition_settings y fixtures.

-- 1. Nuevos formatos de competencia.
alter table public.tournament_competition_settings
  drop constraint if exists tournament_competition_settings_competition_format_check;
alter table public.tournament_competition_settings
  add constraint tournament_competition_settings_competition_format_check
  check (competition_format = any (array['quick_league', 'group_stage', 'knockout', 'round_robin', 'league_playoffs']));

-- 2. Vueltas del todos contra todos (1 = una vez, 2 = ida y vuelta…).
alter table public.tournament_competition_settings
  add column if not exists round_robin_legs smallint not null default 1;
alter table public.tournament_competition_settings
  drop constraint if exists tournament_competition_settings_round_robin_legs_check;
alter table public.tournament_competition_settings
  add constraint tournament_competition_settings_round_robin_legs_check
  check (round_robin_legs between 1 and 4);

-- 3. Hasta 3 canchas.
alter table public.tournament_competition_settings
  drop constraint if exists tournament_competition_settings_courts_count_check;
alter table public.tournament_competition_settings
  add constraint tournament_competition_settings_courts_count_check
  check (courts_count between 1 and 3);

-- 4. El intervalo entre partidos ya no está fijo en 10 minutos (sigue entre 0 y 120).
alter table public.tournament_competition_settings
  drop constraint if exists tournament_competition_setti_interval_between_matches_min_check;

-- 5. Etapa de cada fecha: liga, semifinal o final. La tabla solo cuenta la liga.
alter table public.fixtures
  add column if not exists stage text not null default 'league';
alter table public.fixtures
  drop constraint if exists fixtures_stage_check;
alter table public.fixtures
  add constraint fixtures_stage_check check (stage = any (array['league', 'semifinal', 'final']));

-- 6. El trigger de validación también limitaba a 2 canchas: fútbol sigue con 1 o 2, el resto hasta 3.
create or replace function public.validate_football_competition_settings()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare modality_code text; rule_id uuid; discipline_code text;
begin
  select d.code into discipline_code
  from public.tournaments t join public.disciplines d on d.id = t.discipline_id
  where t.id = new.tournament_id;
  if new.courts_count not between 1 and 3 or (discipline_code = 'futbol' and new.courts_count > 2) then
    raise exception 'El número de canchas no es válido para esta disciplina.';
  end if;
  select m.code, r.id into modality_code, rule_id
  from public.tournaments t join public.sport_modalities m on m.id = t.modality_id
  join public.disciplines d on d.id = t.discipline_id and d.id = m.discipline_id
  left join public.sport_modality_rules r on r.modality_id = m.id
  where t.id = new.tournament_id and d.code = 'futbol';
  if modality_code = 'futbol-5' and new.max_teams <> 10 then
    raise exception 'Fútbol 5 vs 5 requiere exactamente 10 equipos.';
  end if;
  if modality_code = 'futbol-8' then
    if new.max_teams <> 16 or new.competition_format <> 'knockout' then
      raise exception 'Fútbol 8 vs 8 requiere 16 equipos y eliminación directa.';
    end if;
    if rule_id is null then raise exception 'Faltan las reglas de fútbol 8.'; end if;
    new.modality_rules_id := rule_id;
  end if;
  return new;
end $function$;
