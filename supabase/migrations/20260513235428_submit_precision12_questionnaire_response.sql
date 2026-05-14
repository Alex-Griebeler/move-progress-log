-- ============================================================================
-- PRECISION 12 — RPC transacional de submit do Questionário (E3.5)
-- ============================================================================
-- Atomiza o submit final do Questionário Precision 12 em 4 escritas
-- relacionadas que precisam ser consistentes:
--
--   1. Validar token (link válido, não usado, não revogado, não expirado)
--   2. Validar assessment (existe, tipo correto, status compatível)
--   3. INSERT em questionnaire_responses (com assessment_id, version,
--      submitted_at server-side e nunca parq_blocked — generated column)
--   4. UPDATE em assessments (status baseado em parq_blocked + completed_at)
--   5. UPDATE em precision12_questionnaire_links (used_at = now())
--
-- Tudo dentro de uma única transação Postgres — se qualquer passo falhar,
-- nenhuma escrita persiste (sem assessments completados sem response,
-- sem links marcados como used sem dados, etc.).
--
-- SECURITY INVOKER: chamada APENAS via service_role (edge function
-- submit-precision12-questionnaire). GRANT EXECUTE concedido somente
-- a service_role; anon/authenticated/public ficam REVOKE.
--
-- ATENÇÃO: como o caller efetivo é service_role (que bypassa RLS),
-- RLS NÃO é defesa adicional dentro desta RPC. A defesa real está em:
--   a) GRANT EXECUTE restrito a service_role
--   b) Validação por token_hash (link existe, não usado, não revogado,
--      não expirado)
--   c) Validação de status do assessment (in_progress ou blocked)
--   d) Transação Postgres atomica via plpgsql + SELECT FOR UPDATE
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — Função
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.submit_precision12_questionnaire_response(
  p_token_hash text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  v_link public.precision12_questionnaire_links%rowtype;
  v_assessment public.assessments%rowtype;
  v_response public.questionnaire_responses%rowtype;
  v_rec public.questionnaire_responses%rowtype;
  v_response_exists boolean;
  v_final_status text;
begin
  -- ─── Validação básica de input ──────────────────────────────────────────
  if p_token_hash is null or length(p_token_hash) = 0 then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  -- ─── 1. Lookup do link por hash (SELECT FOR UPDATE pra serializar
  --        submits simultâneos do mesmo token) ────────────────────────────
  select * into v_link
    from public.precision12_questionnaire_links
   where token_hash = p_token_hash
   for update;

  if not found then
    -- Erro genérico (não diferencia entre 'não existe' / 'expirado' /
    -- 'revogado' / 'usado' pra evitar enumeração)
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if v_link.revoked_at is not null then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if v_link.used_at is not null then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if v_link.expires_at <= now() then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;

  -- ─── 2. Lookup do assessment vinculado ──────────────────────────────────
  select * into v_assessment
    from public.assessments
   where id = v_link.assessment_id
   for update;

  if not found then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if v_assessment.assessment_type is distinct from 'questionnaire_precision12' then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if v_assessment.status not in ('in_progress', 'blocked') then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;

  -- ─── 3. Bloquear submit duplicado ───────────────────────────────────────
  -- Bloqueia QUALQUER row pré-existente para esse assessment_id, mesmo
  -- sem submitted_at. Por convenção de produto (D4 do PR #127),
  -- questionnaire_responses NÃO é criada no E3.4 — então nenhum
  -- placeholder vazio deve existir. Qualquer row presente nesse ponto
  -- significa "já houve submit anterior" ou "estado inconsistente";
  -- nos dois casos a resposta correta é 409 already_submitted (e o
  -- coach precisa gerar novo link).
  select exists (
    select 1 from public.questionnaire_responses
     where assessment_id = v_assessment.id
  ) into v_response_exists;

  if v_response_exists then
    raise exception 'already_submitted' using errcode = '23505';
  end if;

  -- ─── 4. INSERT em questionnaire_responses ───────────────────────────────
  -- Estratégia (após patches in-place do Lovable em 2026-05-14):
  --   a) jsonb_populate_record só pra COERÇÃO DE TIPOS do payload em
  --      um record variable (sem inserir nada ainda).
  --   b) INSERT EXPLÍCITO listando colunas (omitindo parq_blocked
  --      generated, created_at e updated_at — defaults do schema).
  --   c) assessment_id, questionnaire_version e submitted_at forçados
  --      server-side (não vêm do payload do aluno).
  --
  -- Por que não `INSERT ... SELECT * FROM jsonb_populate_record(...)`:
  -- esse atalho inclui TODAS as colunas no SELECT, incluindo
  -- parq_blocked (generated) → Postgres rejeita.
  v_rec := jsonb_populate_record(
    null::public.questionnaire_responses,
    p_payload - 'parq_blocked' - 'created_at' - 'updated_at'
      || jsonb_build_object(
        'assessment_id', v_assessment.id,
        'questionnaire_version', 'precision12_v1',
        'submitted_at', now()
      )
  );

  insert into public.questionnaire_responses (
    assessment_id, questionnaire_version,
    full_name, email, phone, birthdate, gender, profession, routine,
    parq_q8_heart_condition, parq_q9_chest_pain_exercise, parq_q10_chest_pain_recent,
    parq_q11_loss_consciousness_or_dizziness_fall, parq_q12_bone_joint,
    parq_q13_blood_pressure_meds, parq_q14_other_health_reason,
    goals, goal_details, previous_attempts, exercise_history,
    fitness_self_rating, body_satisfaction,
    session_duration, weekly_frequency, training_available_days, training_period,
    frequent_traveler, external_training_resources, routine_description,
    primary_adherence_barrier,
    pain_status, pain_movements, pain_location, biggest_difficulty,
    has_medical_condition, medical_condition_details,
    uses_medications, medications_continuous, injury_surgery_history,
    recovery_strategies, alcohol, tobacco, caffeine_doses,
    sleep_hours, sleep_quality, stress_level, energy_level, recovery_quality,
    uses_wearable, wearable_brand, share_data,
    motivations, discomfort_response, difficulty_helper, missed_session_response,
    firm_professional_response, accompaniment_preference, correction_preference,
    consistency_self_rating, life_stability, deal_breaker,
    consent_truthful, consent_not_medical, consent_data_use, consent_terms,
    submitted_at
  ) values (
    v_assessment.id, 'precision12_v1',
    v_rec.full_name, v_rec.email, v_rec.phone, v_rec.birthdate, v_rec.gender, v_rec.profession, v_rec.routine,
    v_rec.parq_q8_heart_condition, v_rec.parq_q9_chest_pain_exercise, v_rec.parq_q10_chest_pain_recent,
    v_rec.parq_q11_loss_consciousness_or_dizziness_fall, v_rec.parq_q12_bone_joint,
    v_rec.parq_q13_blood_pressure_meds, v_rec.parq_q14_other_health_reason,
    v_rec.goals, v_rec.goal_details, v_rec.previous_attempts, v_rec.exercise_history,
    v_rec.fitness_self_rating, v_rec.body_satisfaction,
    v_rec.session_duration, v_rec.weekly_frequency, v_rec.training_available_days, v_rec.training_period,
    v_rec.frequent_traveler, v_rec.external_training_resources, v_rec.routine_description,
    v_rec.primary_adherence_barrier,
    v_rec.pain_status, v_rec.pain_movements, v_rec.pain_location, v_rec.biggest_difficulty,
    v_rec.has_medical_condition, v_rec.medical_condition_details,
    v_rec.uses_medications, v_rec.medications_continuous, v_rec.injury_surgery_history,
    v_rec.recovery_strategies, v_rec.alcohol, v_rec.tobacco, v_rec.caffeine_doses,
    v_rec.sleep_hours, v_rec.sleep_quality, v_rec.stress_level, v_rec.energy_level, v_rec.recovery_quality,
    v_rec.uses_wearable, v_rec.wearable_brand, v_rec.share_data,
    v_rec.motivations, v_rec.discomfort_response, v_rec.difficulty_helper, v_rec.missed_session_response,
    v_rec.firm_professional_response, v_rec.accompaniment_preference, v_rec.correction_preference,
    v_rec.consistency_self_rating, v_rec.life_stability, v_rec.deal_breaker,
    v_rec.consent_truthful, v_rec.consent_not_medical, v_rec.consent_data_use, v_rec.consent_terms,
    now()
  );

  -- Re-read pra obter o parq_blocked computado pela generated column
  select * into v_response
    from public.questionnaire_responses
   where assessment_id = v_assessment.id;

  -- ─── 5. UPDATE assessment status ────────────────────────────────────────
  v_final_status := case
    when coalesce(v_response.parq_blocked, false) then 'blocked'
    else 'completed'
  end;

  update public.assessments
     set status = v_final_status,
         completed_at = now(),
         updated_at = now()
   where id = v_assessment.id;

  -- ─── 6. Marcar link como usado (single-use) ─────────────────────────────
  update public.precision12_questionnaire_links
     set used_at = now()
   where id = v_link.id;

  -- ─── 7. Retornar resposta segura (sem payload, sem token) ───────────────
  return jsonb_build_object(
    'ok', true,
    'assessment_id', v_assessment.id,
    'status', v_final_status,
    'parq_blocked', coalesce(v_response.parq_blocked, false),
    'submitted_at', v_response.submitted_at
  );
end;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — Grants (apenas service_role executa)
-- ────────────────────────────────────────────────────────────────────────────

revoke all on function public.submit_precision12_questionnaire_response(text, jsonb)
  from public, anon, authenticated;

grant execute on function public.submit_precision12_questionnaire_response(text, jsonb)
  to service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — COMMENT (string literal única, sem `||` — gotcha Lovable)
-- ────────────────────────────────────────────────────────────────────────────

comment on function public.submit_precision12_questionnaire_response(text, jsonb) is 'RPC atomico de submit do Questionario Precision 12. Defesa em camadas: GRANT EXECUTE restrito a service_role (anon/authenticated/public revogados); valida token via hash (lookup, nao usado/nao revogado/nao expirado); valida assessment (tipo questionnaire_precision12, status in_progress ou blocked); bloqueia QUALQUER row pre-existente em questionnaire_responses (already_submitted); INSERT forcando assessment_id/questionnaire_version/submitted_at server-side; parq_blocked nunca aceita do payload (generated column); UPDATE em assessments.status (completed/blocked baseado em parq_blocked) + completed_at; UPDATE em precision12_questionnaire_links.used_at. Tudo numa unica transacao plpgsql com SELECT FOR UPDATE no link. SECURITY INVOKER mas chamada efetiva e por service_role (RLS bypass), entao a defesa real esta em GRANT + validacoes explicitas. Erros de token sao genericos (invalid_token) para nao ajudar enumeracao.';
