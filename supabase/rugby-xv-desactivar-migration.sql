-- Oculta temporalmente la modalidad Rugby 15s (xv). No se borra: los formularios
-- solo listan modalidades activas. Para reactivarla, poner is_active = true.
update public.sport_modalities m
set is_active = false
from public.disciplines d
where d.id = m.discipline_id
  and d.code = 'rugby'
  and m.code = 'xv';
