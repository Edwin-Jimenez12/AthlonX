-- Al borrar un torneo (o una división), sus partidos se borran con ella.
-- Antes matches.division_id no tenía ON DELETE, y borrar un borrador con
-- fixture generado fallaba con "violates foreign key constraint matches_division_id_fkey".
-- Idempotente.
alter table public.matches drop constraint if exists matches_division_id_fkey;
alter table public.matches
  add constraint matches_division_id_fkey
  foreign key (division_id) references public.tournament_divisions(id) on delete cascade;
