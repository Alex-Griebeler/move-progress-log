-- Leva final: remove Stiff-leg deadlift redundante + preenche 14 primary_muscles vazios

-- M1: Remove Stiff-leg deadlift (id8 265e2ba6). 0 dependentes confirmados.
DELETE FROM public.exercises_library
WHERE left(id::text, 8) = '265e2ba6'
  AND name = 'Stiff-leg deadlift';

-- M2: Preenche 14 primary_muscles vazios restantes

-- Respiração → diafragma
UPDATE public.exercises_library SET primary_muscles = ARRAY['diafragma']::text[]
WHERE left(id::text,8)='90786b90' AND name='Mindfulness'
  AND primary_muscles IS DISTINCT FROM ARRAY['diafragma']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['diafragma']::text[]
WHERE left(id::text,8)='cd5fb9d9' AND name='Respiração 2:1 ativadora'
  AND primary_muscles IS DISTINCT FROM ARRAY['diafragma']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['diafragma']::text[]
WHERE left(id::text,8)='8d67da19' AND name='Respiração nasal em pé (inspira 4 / expira 6)'
  AND primary_muscles IS DISTINCT FROM ARRAY['diafragma']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['diafragma']::text[]
WHERE left(id::text,8)='86b7e9e0' AND name='Respiração ressonância 5:5 em pé'
  AND primary_muscles IS DISTINCT FROM ARRAY['diafragma']::text[];

-- Condicionamento metabólico
UPDATE public.exercises_library SET primary_muscles = ARRAY['quadriceps','gluteo','core']::text[]
WHERE left(id::text,8)='f42b0775' AND name='Air Bike'
  AND primary_muscles IS DISTINCT FROM ARRAY['quadriceps','gluteo','core']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','core','quadriceps']::text[]
WHERE left(id::text,8)='052ac02b' AND name='Polichinelo na corda naval'
  AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','core','quadriceps']::text[];

-- Força
UPDATE public.exercises_library SET primary_muscles = ARRAY['quadriceps','gluteo','isquiotibial']::text[]
WHERE left(id::text,8)='5d5d656c' AND name='Afundo com halteres'
  AND primary_muscles IS DISTINCT FROM ARRAY['quadriceps','gluteo','isquiotibial']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['adutores','gluteo','quadriceps']::text[]
WHERE left(id::text,8)='04d723ee' AND name='Cossack lunge taça'
  AND primary_muscles IS DISTINCT FROM ARRAY['adutores','gluteo','quadriceps']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','deltoide_anterior']::text[]
WHERE left(id::text,8)='2473243b' AND name='Press unilateral semi-ajoelhado'
  AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','deltoide_anterior']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','deltoide_anterior']::text[]
WHERE left(id::text,8)='a7b97c17' AND name='Push Press unilateral Landmine'
  AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','deltoide_anterior']::text[];

-- Core ativação
UPDATE public.exercises_library SET primary_muscles = ARRAY['core','transverso_abdominal']::text[]
WHERE left(id::text,8)='c06db359' AND name='ABD inverso com super band no solo'
  AND primary_muscles IS DISTINCT FROM ARRAY['core','transverso_abdominal']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['core','transverso_abdominal']::text[]
WHERE left(id::text,8)='7ac992e8' AND name='Anti-extensão overhead com super band ajoelhado'
  AND primary_muscles IS DISTINCT FROM ARRAY['core','transverso_abdominal']::text[];

UPDATE public.exercises_library SET primary_muscles = ARRAY['core','obliquo','gluteo']::text[]
WHERE left(id::text,8)='6938dc29' AND name='Lunge lateral + pallof press'
  AND primary_muscles IS DISTINCT FROM ARRAY['core','obliquo','gluteo']::text[];

-- Potência
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','quadriceps','panturrilha']::text[]
WHERE left(id::text,8)='5b896a12' AND name='Salto lateral alternado pausado'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','quadriceps','panturrilha']::text[];
