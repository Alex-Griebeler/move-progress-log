-- Backfill restrito: reclassifica APENAS exercicios com
-- movement_pattern = 'cadeia_posterior' (valor legado da taxonomia v1)
-- para os novos padroes da taxonomia v2:
--   * dobradica_quadril : hinge (deadlift, RDL, stiff, good morning, hip
--                         thrust, ponte, glute bridge, extensao de quadril).
--   * flexao_joelho     : flexao excentrica/isolada de joelho (nordica,
--                         leg curl, mesa/cadeira flexora, hamstring curl,
--                         sliding curl).
--
-- Escopo intencionalmente estreito:
--   - Filtra SEMPRE por movement_pattern = 'cadeia_posterior' — outros
--     padroes (incluindo legados como 'lunge', 'dominancia_joelho', ou
--     valores ja na taxonomia v2) NAO sao tocados.
--   - Atualiza APENAS a coluna movement_pattern. Nao mexe em category,
--     subcategory, boyle_score, dimensoes (axial_load, lumbar_demand,
--     technical_complexity, metabolic_potential, knee_dominance,
--     hip_dominance), tags, primary_muscles, emphasis ou qualquer outro
--     campo.
--   - Exercicios cujo `name` nao bate com nenhum dos padroes textuais
--     listados continuam como 'cadeia_posterior' (legado). Trainers
--     reclassificarao manualmente via Edit dialog se necessario.
--
-- Idempotente por construcao: ambos os UPDATEs filtram por
-- movement_pattern = 'cadeia_posterior'. Apos a primeira execucao bem
-- sucedida as linhas afetadas tem outro movement_pattern e nao casam
-- mais no WHERE. Re-rodar a migration e no-op (zero linhas afetadas).
--
-- Sem unaccent: a extensao nao esta listada em nenhuma migration deste
-- repo. Em vez disso, listamos variacoes acentuadas e nao-acentuadas
-- explicitamente em lower(name) LIKE.
--
-- Sem ALTER TABLE. Sem CREATE FUNCTION. Sem edge function. Sem touch em
-- Supabase types.

BEGIN;

-- 1) Hinge / extensao de quadril / ponte / hip thrust -> dobradica_quadril
UPDATE public.exercises_library
SET movement_pattern = 'dobradica_quadril'
WHERE movement_pattern = 'cadeia_posterior'
  AND (
       lower(name) LIKE '%deadlift%'
    OR lower(name) LIKE '%levantamento terra%'
    OR lower(name) LIKE '%rdl%'
    OR lower(name) LIKE '%stiff%'
    OR lower(name) LIKE '%good morning%'
    OR lower(name) LIKE '%hip hinge%'
    OR lower(name) LIKE '%hinge%'
    OR lower(name) LIKE '%hip thrust%'
    OR lower(name) LIKE '%ponte%'
    OR lower(name) LIKE '%glute bridge%'
    OR lower(name) LIKE '%extensão de quadril%'
    OR lower(name) LIKE '%extensao de quadril%'
  );

-- 2) Nordica / leg curl / mesa flexora / cadeira flexora / sliding curl
--    / hamstring curl / flexao de joelho -> flexao_joelho
--
-- O WHERE mantem movement_pattern = 'cadeia_posterior' — ou seja, linhas
-- ja convertidas para 'dobradica_quadril' no passo 1 nao casam aqui. Os
-- dois UPDATEs sao comutativos (ordem nao importa por causa do filtro).
UPDATE public.exercises_library
SET movement_pattern = 'flexao_joelho'
WHERE movement_pattern = 'cadeia_posterior'
  AND (
       lower(name) LIKE '%nórdica%'
    OR lower(name) LIKE '%nordica%'
    OR lower(name) LIKE '%nordic%'
    OR lower(name) LIKE '%leg curl%'
    OR lower(name) LIKE '%mesa flexora%'
    OR lower(name) LIKE '%cadeira flexora%'
    OR lower(name) LIKE '%flexão de joelho%'
    OR lower(name) LIKE '%flexao de joelho%'
    OR lower(name) LIKE '%sliding curl%'
    OR lower(name) LIKE '%hamstring curl%'
  );

COMMIT;
