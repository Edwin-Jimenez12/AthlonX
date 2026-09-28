-- Permite marcar como leidas las notificaciones propias.
-- El usuario no puede modificar notificaciones de otra cuenta.

grant update (read_at) on table public.user_notifications to authenticated;

drop policy if exists "Users can update their notifications" on public.user_notifications;

create policy "Users can update their notifications"
  on public.user_notifications for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());
