-- Repara y sincroniza equipos aceptados por una organizacion.
-- Ejecutar despues de team-organization-invitations-migration.sql.

alter table public.teams
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

update public.teams t
set organization_id = request.source_organization_id
from public.affiliation_requests request
where request.target_team_id = t.id
  and request.source_organization_id is not null
  and request.status = 'accepted'
  and (t.organization_id is null or t.organization_id = request.source_organization_id);

