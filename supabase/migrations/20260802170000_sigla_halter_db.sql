-- SIGLAS — polish final: halter/halteres -> DB, kettlebell(s) soltos -> KB
-- (residual do mapa de julho que mantinha "1 KB ou halter"). 35 renames JA
-- APLICADOS via REST (35/35, reconciliacao 0, 0 colisoes; zero ocorrencias
-- restantes por extenso). Registro idempotente.
UPDATE public.exercises_library SET name = regexp_replace(name, '\mhalteres\M', 'DB', 'gi')
WHERE name ~* '\mhalteres\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mhalter\M', 'DB', 'gi')
WHERE name ~* '\mhalter\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mkettlebells\M', 'KB', 'gi')
WHERE name ~* '\mkettlebells\M';

UPDATE public.exercises_library SET name = regexp_replace(name, '\mkettlebell\M', 'KB', 'gi')
WHERE name ~* '\mkettlebell\M';
