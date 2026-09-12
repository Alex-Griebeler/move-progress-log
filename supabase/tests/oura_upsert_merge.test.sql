-- Testes comportamentais de public.upsert_oura_row_merge (rodar via
-- scripts/test-oura-merge-sql.sh, que cria as tabelas com o DDL real).
-- Cada bloco ASSERT aborta o script (exit != 0) se a expectativa falhar.
INSERT INTO public.students(id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Teste');

-- 1) inserção parcial: colunas omitidas ficam null; casts date/numeric/integer
SELECT public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","readiness_score":80,"sleep_efficiency":91.5,"temperature_deviation":-0.2}');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_metrics WHERE date = '2026-09-10';
  ASSERT r.readiness_score = 80 AND r.sleep_score IS NULL AND r.sleep_efficiency = 91.5 AND r.temperature_deviation = -0.2, 'T1 inserção parcial';
END $$;

-- 2) merge: null novo NÃO rebaixa; valor novo substitui; coluna omitida intocada; sem duplicar
SELECT public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","readiness_score":null,"sleep_score":77,"steps":4000}');
DO $$ DECLARE r record; n int; BEGIN
  SELECT * INTO r FROM public.oura_metrics WHERE date = '2026-09-10';
  SELECT count(*) INTO n FROM public.oura_metrics;
  ASSERT r.readiness_score = 80 AND r.sleep_score = 77 AND r.steps = 4000 AND r.sleep_efficiency = 91.5 AND n = 1, 'T2 merge preserva/substitui';
END $$;

-- 3) zero é valor, não null: substitui
SELECT public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","temperature_deviation":0,"steps":0}');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_metrics WHERE date = '2026-09-10';
  ASSERT r.temperature_deviation = 0 AND r.steps = 0, 'T3 zero substitui';
END $$;

-- 4) agudas: linha nova com grupo HRV PODADO -> contador DEFAULT 0, sem violar NOT NULL
SELECT public.upsert_oura_row_merge('oura_acute_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","day_hr_series":{"samples":[{"bpm":60}]},"hr_day_avg":60,"samples_count_hr_day":1,"sleep_phase_5min":null}');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_acute_metrics WHERE date = '2026-09-10';
  ASSERT r.samples_count_hrv = 0 AND r.samples_count_hr_day = 1 AND r.hrv_night_last IS NULL AND r.day_hr_series->'samples'->0->>'bpm' = '60' AND r.updated_at = r.created_at, 'T4 agudas linha nova';
END $$;

-- 5) agudas: chega o grupo HRV, grupo do dia omitido -> dia preservado, HRV gravado, updated_at avança
SELECT pg_sleep(0.02);
SELECT public.upsert_oura_row_merge('oura_acute_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","sleep_hrv_series":{"values":[20,21]},"hrv_night_last":21,"samples_count_hrv":2}');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_acute_metrics WHERE date = '2026-09-10';
  ASSERT r.samples_count_hrv = 2 AND r.samples_count_hr_day = 1 AND r.hrv_night_last = 21 AND r.day_hr_series IS NOT NULL AND r.updated_at > r.created_at, 'T5 agudas merge';
END $$;

-- 6) o cenário do Alto da #322: sleep falha (grupo HRV podado), só HR do dia -> HRV gravado sobrevive
SELECT public.upsert_oura_row_merge('oura_acute_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","day_hr_series":{"samples":[{"bpm":70}]},"samples_count_hr_day":1}');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_acute_metrics WHERE date = '2026-09-10';
  ASSERT r.samples_count_hrv = 2 AND r.hrv_night_last = 21, 'T6 HRV sobrevive à reconsulta esparsa';
END $$;

-- 7) null EXPLÍCITO em contador NOT NULL: vale como ausente (preserva / DEFAULT), e o resto do payload grava
SELECT public.upsert_oura_row_merge('oura_acute_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","samples_count_hrv":null,"hr_day_avg":65}');
SELECT public.upsert_oura_row_merge('oura_acute_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-13","samples_count_hrv":null,"samples_count_hr_day":null,"hr_day_avg":70}');
DO $$ DECLARE a record; b record; BEGIN
  SELECT * INTO a FROM public.oura_acute_metrics WHERE date = '2026-09-10';
  SELECT * INTO b FROM public.oura_acute_metrics WHERE date = '2026-09-13';
  ASSERT a.samples_count_hrv = 2 AND a.hr_day_avg = 65, 'T7a null explícito preserva contador';
  ASSERT b.samples_count_hrv = 0 AND b.samples_count_hr_day = 0 AND b.hr_day_avg = 70, 'T7b null explícito em linha nova -> DEFAULT';
END $$;

-- 7c) tipos REAIS de produção nas agudas: NUMERIC(6,2) arredonda; INTEGER rejeita decimal
SELECT public.upsert_oura_row_merge('oura_acute_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-13","hr_day_avg":60.12345,"hrv_night_stddev":1.23456,"hr_day_max":150}');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_acute_metrics WHERE date = '2026-09-13';
  ASSERT r.hr_day_avg = 60.12 AND r.hrv_night_stddev = 1.235 AND r.hr_day_max = 150, 'T7c numeric(p,s) arredonda, integer aceita inteiro';
END $$;
DO $$ BEGIN
  BEGIN PERFORM public.upsert_oura_row_merge('oura_acute_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-13","hr_night_min":91.5}'); RAISE EXCEPTION 'T7d devia falhar: decimal em INTEGER'; EXCEPTION WHEN invalid_text_representation THEN NULL; END;
END $$;
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_acute_metrics WHERE date = '2026-09-13';
  ASSERT r.hr_night_min IS NULL AND r.hr_day_avg = 60.12, 'T7e erro de cast não grava nada';
END $$;

-- 8) erros esperados (cada um tem de LANÇAR)
DO $$ BEGIN
  BEGIN PERFORM public.upsert_oura_row_merge('students', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10"}'); RAISE EXCEPTION 'T8a devia falhar'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","typo_col":1}'); RAISE EXCEPTION 'T8b devia falhar'; EXCEPTION WHEN undefined_column THEN NULL; END;
  BEGIN PERFORM public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111"}'); RAISE EXCEPTION 'T8c devia falhar'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.upsert_oura_row_merge('oura_metrics', '{"student_id":null,"date":"2026-09-10"}'); RAISE EXCEPTION 'T8d devia falhar'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","id":"22222222-2222-2222-2222-222222222222"}'); RAISE EXCEPTION 'T8e devia falhar'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-10","readiness_score":150}'); RAISE EXCEPTION 'T8f devia falhar'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM public.upsert_oura_row_merge('oura_metrics', '[1,2]'); RAISE EXCEPTION 'T8g devia falhar'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
-- nada dos erros acima pode ter gravado
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_metrics WHERE date = '2026-09-10';
  ASSERT r.readiness_score = 80 AND r.sleep_score = 77, 'T8h erros não gravam';
END $$;

-- 9) permissões: authenticated não executa; service_role executa
DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-11","sleep_score":1}'); RAISE EXCEPTION 'T9a authenticated devia ser negado'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
END $$;
SET ROLE service_role;
SELECT public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-11","sleep_score":1}');
RESET ROLE;
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.oura_metrics WHERE date = '2026-09-11' AND sleep_score = 1;
  ASSERT n = 1, 'T9b service_role grava';
END $$;

-- 10) só chaves: não falha, não duplica
SELECT public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-11"}');
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.oura_metrics WHERE date = '2026-09-11';
  ASSERT n = 1, 'T10 só chaves';
END $$;

-- 11) reaplicação da migration é idempotente (CREATE OR REPLACE + grants)
\i supabase/migrations/20260912150000_oura_upsert_merge_rpc.sql
SELECT public.upsert_oura_row_merge('oura_metrics', '{"student_id":"11111111-1111-1111-1111-111111111111","date":"2026-09-11","steps":10}');
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.oura_metrics WHERE date = '2026-09-11';
  ASSERT r.steps = 10 AND r.sleep_score = 1, 'T11 idempotente';
END $$;
