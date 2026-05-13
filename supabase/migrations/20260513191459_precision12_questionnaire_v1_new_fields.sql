-- ============================================================================
-- PRECISION 12 — Questionnaire v1 new fields (E3.2)
-- ============================================================================
-- Migration aditiva referente à especificação canônica congelada em
-- docs/precision12_questionnaire_v1.md (PR #124).
--
-- Adiciona 6 colunas à tabela public.questionnaire_responses para suportar
-- as perguntas novas/refinadas das telas 4, 5 e 9 do fluxo Precision 12:
--
--   1. training_available_days     (text[])  - Tela 4.3  - D6
--   2. external_training_resources (text[])  - Tela 4.6  - D7
--   3. primary_adherence_barrier   (text)    - Tela 4.8  - D8
--   4. uses_medications            (boolean) - Tela 5.7  - D9
--   5. medications_continuous      (text)    - Tela 5.8  - D9
--   6. injury_surgery_history      (text)    - Tela 5.9  - D5
--
-- Regras aplicadas:
--   - Todos os campos NULLABLE (compat com 3 questionários legacy backfilled
--     em E1 que não têm essas respostas).
--   - ADD COLUMN IF NOT EXISTS em todos (idempotente).
--   - COMMENT ON COLUMN como string literal única (sem `||` — gotcha Lovable,
--     vide memory Section 9.5 / PR #118).
--   - SEM CHECK constraints: validação de códigos estáveis fica no Zod/TS
--     na E3.3 (precision12Questionnaire.ts).
--   - SEM alteração de RLS: políticas atuais de questionnaire_responses
--     continuam valendo (acesso via JOIN com assessments+students.trainer_id
--     ou role admin).
--   - SEM alteração de questionnaire_version (continua 'precision12_v1').
--
-- Pós-merge (E3.2 fluxo):
--   1. Lovable aplica esta migration via tool supabase--migration.
--   2. Lovable regenera src/integrations/supabase/types.ts.
--   3. Smoke SQL confirma 6 colunas presentes.
--   4. E3.3 implementa constants/zod usando os codes documentados em
--      docs/precision12_questionnaire_v1.md Seção 5.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 1 - ADD COLUMNS (idempotentes)
-- ────────────────────────────────────────────────────────────────────────────

alter table public.questionnaire_responses
  add column if not exists training_available_days text[];

alter table public.questionnaire_responses
  add column if not exists external_training_resources text[];

alter table public.questionnaire_responses
  add column if not exists primary_adherence_barrier text;

alter table public.questionnaire_responses
  add column if not exists uses_medications boolean;

alter table public.questionnaire_responses
  add column if not exists medications_continuous text;

alter table public.questionnaire_responses
  add column if not exists injury_surgery_history text;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 2 - COMMENTS (string literal única, sem `||` — gotcha Lovable)
-- ────────────────────────────────────────────────────────────────────────────

comment on column public.questionnaire_responses.training_available_days is 'Dias da semana disponiveis para treinar. Codes em precision12Questionnaire.TRAINING_AVAILABLE_DAYS.';

comment on column public.questionnaire_responses.external_training_resources is 'Recursos de treino fora da Fabrik. Codes em precision12Questionnaire.EXTERNAL_TRAINING_RESOURCES.';

comment on column public.questionnaire_responses.primary_adherence_barrier is 'Maior risco de tirar o aluno do programa. Codes em precision12Questionnaire.PRIMARY_ADHERENCE_BARRIER.';

comment on column public.questionnaire_responses.uses_medications is 'Flag explicito de uso continuo de medicamentos. Campo medications_continuous e obrigatorio na UI quando true.';

comment on column public.questionnaire_responses.medications_continuous is 'Medicamentos de uso continuo informados pelo aluno. Texto livre opcional quando uses_medications=false.';

comment on column public.questionnaire_responses.injury_surgery_history is 'Lesao, cirurgia ou restricao clinica relevante, mesmo antiga, que ainda possa influenciar treino.';
