-- Canal de avisos de cada persona: solo en la app, o en la app y por correo.
-- El envío por correo se activará cuando esté listo el proveedor de correo; la preferencia ya queda guardada.
-- Idempotente: se puede volver a ejecutar.

alter table public.account_preferences
  add column if not exists notification_channel text not null default 'app';

alter table public.account_preferences drop constraint if exists account_preferences_notification_channel_check;
alter table public.account_preferences add constraint account_preferences_notification_channel_check
  check (notification_channel in ('app', 'app_email'));
