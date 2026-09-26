-- Elimina la firma antigua de create_affiliation_request.
-- Ejecutar despues de identity-affiliations-migration.sql y
-- team-organization-invitations-migration.sql.

drop function if exists public.create_affiliation_request(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid
);

-- Conserva como unica firma la version actual, que tambien soporta invitaciones
-- a equipos y organizaciones.
revoke all on function public.create_affiliation_request(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid
) from public;

grant execute on function public.create_affiliation_request(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid
) to authenticated;
