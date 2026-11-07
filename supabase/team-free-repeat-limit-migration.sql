-- Plan Free de equipo: 2 eventos repetidos (antes 1). Actualiza el límite y el texto que muestra la página de planes.
-- Idempotente: se puede volver a ejecutar.

update public.plans
set limits = jsonb_set(limits, '{eventos_repetidos}', '2'::jsonb, true),
    features = replace(features::text, '10 eventos al mes y 1 evento repetido', '10 eventos al mes y 2 eventos repetidos')::jsonb
where code = 'team_free';
