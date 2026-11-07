-- Orden de los tipos de evento de cada persona (lo usan la hoja de tipos, los filtros y el selector del formulario).
-- Idempotente: se puede volver a ejecutar.

alter table public.personal_event_types add column if not exists sort_order integer not null default 0;

-- Orden inicial: el orden en que se crearon, por persona.
update public.personal_event_types t set sort_order = o.pos
from (select id, row_number() over (partition by user_id order by created_at, label) as pos from public.personal_event_types) o
where t.id = o.id and t.sort_order = 0;

-- Predefinidos y listado en el orden guardado por la persona.
create or replace function public.personal_types_ensure()
returns setof public.personal_event_types
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión para ver tus tipos de evento.'; end if;
  insert into public.personal_event_types (user_id, category, label, color, default_key, sort_order) values
    (auth.uid(), 'training', 'Entrenamiento', '#4ea8ff', 'training', 1),
    (auth.uid(), 'match', 'Partido', '#b4ff45', 'match', 2),
    (auth.uid(), 'meeting', 'Reunión', '#a78bfa', 'meeting', 3),
    (auth.uid(), 'personal', 'Personal', '#94a3b8', 'personal', 4),
    (auth.uid(), 'other', 'Otro', '#ff9f43', 'other', 5)
  on conflict do nothing;
  return query select * from public.personal_event_types where user_id = auth.uid() order by sort_order, created_at;
end;
$$;

-- Guarda el nuevo orden: p_ids lleva los ids en el orden deseado. Solo cambia los tipos de la persona.
create or replace function public.personal_types_reorder(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pos integer;
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  for v_pos in 1..coalesce(array_length(p_ids, 1), 0) loop
    update public.personal_event_types set sort_order = v_pos
    where id = p_ids[v_pos] and user_id = auth.uid();
  end loop;
end;
$$;

revoke all on function public.personal_types_reorder(uuid[]) from public, anon;
grant execute on function public.personal_types_reorder(uuid[]) to authenticated;
