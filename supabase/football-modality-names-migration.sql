-- Actualiza las modalidades de fútbol sin afectar torneos ni equipos existentes.

-- Desactiva Fútbol sala porque Fútbol 5 será la única modalidad 5 vs 5.
update public.sport_modalities
set is_active = false
where code = 'futbol-sala';

-- Usa nombres explícitos para mostrar la cantidad de jugadores por lado.
update public.sport_modalities
set name = case code
  when 'futbol-5' then 'Fútbol 5 vs 5'
  when 'futbol-7' then 'Fútbol 7 vs 7'
  when 'futbol-8' then 'Fútbol 8 vs 8'
  when 'futbol-11' then 'Fútbol 11 vs 11'
  else name
end
where code in ('futbol-5', 'futbol-7', 'futbol-8', 'futbol-11');
