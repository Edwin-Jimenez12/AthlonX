-- AthlonX: se elimina la sección pública de novedades anterior (actualizaciones editables).
-- Reemplazada por release_notes en el panel administrativo.
-- Verificado antes de ejecutar: platform_updates y platform_update_admins tenían 0 filas.
-- Idempotente.

drop table if exists public.platform_updates;
drop table if exists public.platform_update_admins;
drop function if exists public.is_platform_update_admin();
drop function if exists public.touch_platform_update();
