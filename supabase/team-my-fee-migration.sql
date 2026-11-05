-- Cuota propia del jugador: cada atleta ve su monto, su estado del mes y sus meses pendientes.
-- Solo ve sus propios datos (auth.uid()). El tesorero sigue usando team_fee_board.
-- Idempotente: se puede volver a ejecutar.

create or replace function public.team_my_fee(p_team uuid, p_month date)
returns table (fee numeric, status text, pending_months integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
  v_division uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  select m.division_id into v_division from public.team_user_memberships m
  where m.team_id = p_team and m.user_id = v_uid and m.status = 'active' and m.role = 'atleta'
  order by m.created_at limit 1;
  if not found then raise exception 'Solo los jugadores del equipo ven su cuota.'; end if;

  return query
  select
    coalesce((select s.amount from public.team_fee_settings s where s.team_id = p_team and s.division_id = v_division),
             (select s.amount from public.team_fee_settings s where s.team_id = p_team and s.division_id is null), 0),
    coalesce((select fp.status from public.team_fee_payments fp where fp.team_id = p_team and fp.user_id = v_uid and fp.month = v_month), 'pendiente'),
    (select count(*)::integer from public.team_fee_payments x where x.team_id = p_team and x.user_id = v_uid and x.status = 'pendiente' and x.month <= v_month);
end;
$$;

revoke all on function public.team_my_fee(uuid, date) from public, anon;
grant execute on function public.team_my_fee(uuid, date) to authenticated;
