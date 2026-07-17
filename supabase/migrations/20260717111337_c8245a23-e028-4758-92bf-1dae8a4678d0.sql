-- Leva 4: normalizacao do vocabulario de musculos (primary_muscles, text[]).
UPDATE public.exercises_library SET primary_muscles = ARRAY['quadriceps','gluteo','isquiotibial']::text[]
WHERE left(id::text,8)='70c4349c' AND name='Agachamento com Barra (High Bar)'
  AND primary_muscles IS DISTINCT FROM ARRAY['quadriceps','gluteo','isquiotibial']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['flexor_quadril']::text[]
WHERE left(id::text,8)='72a1cdfc' AND name='Ativação de flexor de quadril (marcha)'
  AND primary_muscles IS DISTINCT FROM ARRAY['flexor_quadril']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['adutores']::text[]
WHERE left(id::text,8)='3516905d' AND name='Butterfly Alongamento'
  AND primary_muscles IS DISTINCT FROM ARRAY['adutores']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','quadriceps','gastrocnemio']::text[]
WHERE left(id::text,8)='a2bd5f91' AND name='Empurrar trenó'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','quadriceps','gastrocnemio']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['adutores']::text[]
WHERE left(id::text,8)='a63a2c5a' AND name='Groin Alongamento Dinâmico'
  AND primary_muscles IS DISTINCT FROM ARRAY['adutores']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['flexor_quadril']::text[]
WHERE left(id::text,8)='c1f9d3d0' AND name='Half-Kneeling flexor de quadril Alongamento'
  AND primary_muscles IS DISTINCT FROM ARRAY['flexor_quadril']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','quadriceps','gastrocnemio']::text[]
WHERE left(id::text,8)='6414e2fc' AND name='Lateral Saltos sobre barreira'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','quadriceps','gastrocnemio']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['TFL']::text[]
WHERE left(id::text,8)='229f9190' AND name='Liberação miofascial TFL'
  AND primary_muscles IS DISTINCT FROM ARRAY['TFL']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['quadriceps','flexor_quadril']::text[]
WHERE left(id::text,8)='e7821c16' AND name='Liberação miofascial flexores do quadril/quadríceps'
  AND primary_muscles IS DISTINCT FROM ARRAY['quadriceps','flexor_quadril']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','gluteo_medio']::text[]
WHERE left(id::text,8)='6b4a8164' AND name='Liberação miofascial glúteos'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','gluteo_medio']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo']::text[]
WHERE left(id::text,8)='c8547f5f' AND name='Liberação miofascial latíssimo'
  AND primary_muscles IS DISTINCT FROM ARRAY['latissimo']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','peitoral_menor']::text[]
WHERE left(id::text,8)='82e52160' AND name='Liberação miofascial peitoral'
  AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','peitoral_menor']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['isquiotibial']::text[]
WHERE left(id::text,8)='dbd96222' AND name='Liberação miofascial posteriores da coxa'
  AND primary_muscles IS DISTINCT FROM ARRAY['isquiotibial']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['flexor_quadril']::text[]
WHERE left(id::text,8)='8e5dde49' AND name='Loaded Alongamento (flexor de quadril com kettlebell)'
  AND primary_muscles IS DISTINCT FROM ARRAY['flexor_quadril']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','quadriceps','gastrocnemio']::text[]
WHERE left(id::text,8)='15befb21' AND name='Salto lateral (patinador) (salto patinador)'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','quadriceps','gastrocnemio']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','quadriceps','gastrocnemio']::text[]
WHERE left(id::text,8)='5b896a12' AND name='Salto lateral alternado pausado'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','quadriceps','gastrocnemio']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','quadriceps','gastrocnemio']::text[]
WHERE left(id::text,8)='5131a700' AND name='Salto vertical (CMJ)'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','quadriceps','gastrocnemio']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','quadriceps','gastrocnemio']::text[]
WHERE left(id::text,8)='2ec83e16' AND name='Saltos sobre barreira Bilateral'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','quadriceps','gastrocnemio']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','quadriceps','gastrocnemio']::text[]
WHERE left(id::text,8)='27a271ac' AND name='Saltos sobre barreira Unilateral'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','quadriceps','gastrocnemio']::text[];