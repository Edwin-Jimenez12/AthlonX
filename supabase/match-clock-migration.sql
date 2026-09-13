-- Ejecuta este bloque para sincronizar pausa y período del reloj.
-- No modifica fixtures ni agrega is_locked.

alter table public.matches
  add column if not exists period text not null default 'first_half';

alter table public.matches
  add column if not exists is_paused boolean not null default false;

alter table public.matches
  drop constraint if exists matches_period_check;

alter table public.matches
  add constraint matches_period_check
  check (period in ('first_half', 'second_half'));

grant select, update on public.matches to authenticated;
