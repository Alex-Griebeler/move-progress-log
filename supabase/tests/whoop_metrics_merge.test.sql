-- Teste COMPORTAMENTAL de replace_whoop_metrics_batch.
-- Roda em Postgres local via scripts/test-whoop-merge-sql.sh.
-- Invariante: valor NOVO nulo nunca rebaixa valor já gravado.

INSERT INTO public.students (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Aluna Teste');

DO $$
DECLARE
  v_student uuid := '11111111-1111-1111-1111-111111111111';
  v_written integer;
  r public.whoop_metrics%ROWTYPE;
BEGIN
  -- 1) Dia completo: recovery + sono.
  v_written := public.replace_whoop_metrics_batch(v_student, jsonb_build_array(jsonb_build_object(
    'date', '2026-09-18', 'cycle_id', 1001,
    'recovery_score', 62, 'hrv_rmssd', 48.5, 'resting_heart_rate', 54,
    'sleep_performance', 88, 'sleep_efficiency', 93.1, 'total_sleep_duration', 27000,
    'deep_sleep_duration', 6000, 'rem_sleep_duration', 7000, 'light_sleep_duration', 14000,
    'awake_time', 1200, 'disturbance_count', 9, 'score_state', 'SCORED'
  )));
  ASSERT v_written = 1, 'primeira gravação deveria escrever 1 linha';

  -- 2) Mesma data e mesmo ciclo, agora SEM o registro de sono (o que a coleta
  --    devolve quando primarySleepFor não acha sono com nap = false).
  v_written := public.replace_whoop_metrics_batch(v_student, jsonb_build_array(jsonb_build_object(
    'date', '2026-09-18', 'cycle_id', 1001,
    'recovery_score', 62, 'hrv_rmssd', 48.5, 'resting_heart_rate', 54,
    'day_strain', 12.4,
    'sleep_performance', NULL, 'sleep_efficiency', NULL, 'total_sleep_duration', NULL,
    'deep_sleep_duration', NULL, 'rem_sleep_duration', NULL, 'light_sleep_duration', NULL,
    'awake_time', NULL, 'disturbance_count', NULL, 'score_state', 'SCORED'
  )));

  SELECT * INTO r FROM public.whoop_metrics WHERE student_id = v_student AND date = '2026-09-18';
  ASSERT r.sleep_performance = 88, 'sono gravado foi apagado por coleta sem sono';
  ASSERT r.total_sleep_duration = 27000, 'duração de sono foi apagada';
  ASSERT r.deep_sleep_duration = 6000 AND r.rem_sleep_duration = 7000, 'estágios de sono apagados';
  ASSERT r.disturbance_count = 9, 'contagem de perturbações apagada';
  ASSERT r.day_strain = 12.4, 'valor novo não nulo deveria ter entrado';

  -- 3) Coleta SEM recovery não apaga o recovery do dia.
  v_written := public.replace_whoop_metrics_batch(v_student, jsonb_build_array(jsonb_build_object(
    'date', '2026-09-18', 'cycle_id', 1001,
    'recovery_score', NULL, 'hrv_rmssd', NULL, 'resting_heart_rate', NULL,
    'day_strain', 13.9, 'score_state', 'SCORED'
  )));
  SELECT * INTO r FROM public.whoop_metrics WHERE student_id = v_student AND date = '2026-09-18';
  ASSERT r.recovery_score = 62, 'recovery gravado foi apagado';
  ASSERT r.hrv_rmssd = 48.5, 'HRV gravado foi apagado';
  ASSERT r.day_strain = 13.9, 'strain novo deveria ter entrado';

  -- 4) Valor novo NÃO nulo substitui o antigo (o merge não congela o dado).
  v_written := public.replace_whoop_metrics_batch(v_student, jsonb_build_array(jsonb_build_object(
    'date', '2026-09-18', 'cycle_id', 1001, 'recovery_score', 71, 'score_state', 'SCORED'
  )));
  SELECT * INTO r FROM public.whoop_metrics WHERE student_id = v_student AND date = '2026-09-18';
  ASSERT r.recovery_score = 71, 'valor novo não nulo deveria substituir o gravado';

  -- 5) HRV zero é valor real (bug do null→0 de 15/09): não pode ser tratado
  --    como ausência nem rebaixado.
  v_written := public.replace_whoop_metrics_batch(v_student, jsonb_build_array(jsonb_build_object(
    'date', '2026-09-19', 'cycle_id', 1002, 'hrv_rmssd', 0, 'recovery_score', 30, 'score_state', 'SCORED'
  )));
  SELECT * INTO r FROM public.whoop_metrics WHERE student_id = v_student AND date = '2026-09-19';
  ASSERT r.hrv_rmssd = 0, 'HRV 0 deveria ter sido gravado';

  -- 6) Ciclo que MUDA de data não carrega os valores do dia anterior.
  v_written := public.replace_whoop_metrics_batch(v_student, jsonb_build_array(jsonb_build_object(
    'date', '2026-09-20', 'cycle_id', 1002, 'recovery_score', 55, 'score_state', 'SCORED'
  )));
  SELECT * INTO r FROM public.whoop_metrics WHERE student_id = v_student AND date = '2026-09-20';
  ASSERT r.hrv_rmssd IS NULL, 'o dia novo herdou o HRV do dia anterior';
  ASSERT r.recovery_score = 55, 'recovery do dia novo não gravou';
  ASSERT NOT EXISTS (SELECT 1 FROM public.whoop_metrics WHERE student_id = v_student AND date = '2026-09-19'),
    'a linha antiga do ciclo redatado deveria ter sido removida';

  -- 7) Validações preservadas.
  BEGIN
    PERFORM public.replace_whoop_metrics_batch(v_student, jsonb_build_array(
      jsonb_build_object('date', '2026-09-21', 'cycle_id', 1003, 'recovery_score', 50),
      jsonb_build_object('date', '2026-09-21', 'cycle_id', 1004, 'recovery_score', 50)
    ));
    RAISE EXCEPTION 'data repetida no lote deveria ter sido rejeitada';
  EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%repetida dentro do lote%' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'whoop_metrics_merge: todos os ASSERT passaram';
END $$;
