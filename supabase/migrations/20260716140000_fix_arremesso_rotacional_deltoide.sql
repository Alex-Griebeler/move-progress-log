-- Consistência da família "arremesso rotacional": alinha o token de ombro a
-- deltoide_anterior (igual aos demais arremessos rotacionais), resolvendo o
-- conflito entre 20260716120000 (leva 3b) e 20260716130000 (normalização de
-- acento, gerada de snapshot pré-leva3b). Timestamp posterior → valor final.
-- Idempotente: só atualiza se o array atual for diferente do alvo.
UPDATE public.exercises_library
SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text, 8) = '29d693e2'
  AND name = 'Bola medicinal — arremesso rotacional'
  AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
