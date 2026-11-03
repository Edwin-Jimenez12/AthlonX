-- AthlonX: permiso de lectura sobre el catálogo de planes.
-- La política RLS "Anyone can read active plans" ya limita la lectura a los planes activos,
-- pero sin este GRANT el rol authenticated recibe "permission denied for table plans".
-- Idempotente.

grant select on public.plans to anon, authenticated;
