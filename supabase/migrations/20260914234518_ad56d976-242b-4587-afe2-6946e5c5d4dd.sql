-- oura_workouts: a API Oura v2 (usercollection/workout) devolve calories e distance como número decimal.
-- As colunas INTEGER (desde 20251030122131) faziam o upsert do oura-sync falhar com 22P02 antes de qualquer
-- trigger; o erro virava só o aviso "Falha ao salvar treinos do Oura (não bloqueante)" e nenhum treino foi gravado.
-- numeric sem escala guarda o valor exato que a API mandou; integer→numeric não perde nada.
SET lock_timeout = '5s';
ALTER TABLE public.oura_workouts
  ALTER COLUMN calories TYPE numeric USING calories::numeric,
  ALTER COLUMN distance TYPE numeric USING distance::numeric;
NOTIFY pgrst, 'reload schema';