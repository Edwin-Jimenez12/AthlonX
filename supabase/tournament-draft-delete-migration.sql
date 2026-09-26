-- Permite eliminar solamente borradores creados por la cuenta autenticada.
-- Ejecutar despues de competition-security-migration.sql si esa migracion ya fue aplicada.

grant delete on public.tournaments to authenticated;

drop policy if exists "Tournament owners can delete tournaments" on public.tournaments;
drop policy if exists "Tournament owners can delete drafts" on public.tournaments;

create policy "Tournament owners can delete drafts"
  on public.tournaments for delete to authenticated
  using (created_by = auth.uid() and status = 'draft');
