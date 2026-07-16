-- Preenche primary_muscles vazio ([]) em 4 exercícios (gaps pré-existentes,
-- fora das levas de metadata). Valores por consistência com as famílias já
-- corretas — consenso Claude+Codex. Todos os tokens já existem no vocabulário
-- sem acento da tabela. Idempotente: só atualiza se ainda estiver diferente.

UPDATE public.exercises_library
SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text, 8) = 'b6b834c8'
  AND name = 'Hip Thrust barra com banda elástica'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];

UPDATE public.exercises_library
SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text, 8) = '69e19c16'
  AND name = 'Ponte dinâmica com medicine ball'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];

UPDATE public.exercises_library
SET primary_muscles = ARRAY['gluteo','isquiotibial','romboides']::text[]
WHERE left(id::text, 8) = '0937f27c'
  AND name = 'Hip hinge + ativação escapular com super band'
  AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial','romboides']::text[];

UPDATE public.exercises_library
SET primary_muscles = ARRAY['quadriceps','gluteo','core']::text[]
WHERE left(id::text, 8) = 'df97c170'
  AND name = 'Agachamento com anilha + medicine ball'
  AND primary_muscles IS DISTINCT FROM ARRAY['quadriceps','gluteo','core']::text[];
