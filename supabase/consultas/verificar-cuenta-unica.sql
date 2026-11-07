-- Verifica que una persona tenga una sola cuenta y muestra lo que tiene esa cuenta.
-- Solo lectura. Ejecutar en el SQL Editor de Supabase (proyecto mlvtsgseneqzihwkiatg).
-- Cambia el nombre en la línea de "buscado" si quieres revisar a otra persona.

with buscado as (
  select '%edwin%jim%'::text as patron
),
cuentas as (
  select p.id, p.full_name, u.email, u.created_at, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.full_name ilike (select patron from buscado)
)
-- 1) Cuántas cuentas hay con ese nombre (debe ser 1)
select 'cuentas con ese nombre' as revision, count(*)::text as resultado from cuentas
union all
-- 2) Perfiles con ese nombre que no tienen cuenta de acceso (debe ser 0)
select 'perfiles sin cuenta de acceso', count(*)::text
from public.profiles p
where p.full_name ilike (select patron from buscado)
  and not exists (select 1 from auth.users u where u.id = p.id)
union all
-- 3) Datos de la cuenta
select 'correo de la cuenta', string_agg(email, ', ') from cuentas
union all
select 'roles', (select string_agg(r.role::text, ', ' order by r.role) from public.user_roles r where r.user_id in (select id from cuentas))
union all
select 'equipos (rol)', (select string_agg(t.name || ' (' || m.role || ')', ', ')
                         from public.team_user_memberships m join public.teams t on t.id = m.team_id
                         where m.user_id in (select id from cuentas) and m.status = 'active')
union all
select 'vinculado como jugador', (select count(*)::text from public.players pl where pl.user_id in (select id from cuentas))
union all
select 'tipos de evento personales', (select count(*)::text from public.personal_event_types x where x.user_id in (select id from cuentas))
union all
select 'actividades personales', (select count(*)::text from public.personal_activities x where x.user_id in (select id from cuentas))
union all
select 'notificaciones', (select count(*)::text from public.user_notifications n where n.recipient_user_id in (select id from cuentas))
union all
select 'planes', (select string_agg(ap.account_type || ': ' || ap.plan_code, ', ') from public.account_plans ap where ap.account_id in (select id from cuentas));
