-- Funde a duplicata "Swing com kettlebell Russo" no canonico "Kettlebell swing russo".
-- Deterministico + idempotente + fail-loud (consenso Claude+Codex):
--   * exige EXATAMENTE 1 canonico; 0 duplicata = no-op (ja fundida); >1 candidato = aborta.
--   * repointa o historico (public.exercises, ON DELETE SET NULL) ANTES de deletar.
--   * DELETE falha alto se a duplicata tiver vinculo em prescription_exercises /
--     exercise_adaptations (RESTRICT) -> Lovable confirma 0 dependentes no dry-run
--     (e repointa report_tracked_exercises se existir) antes do commit.
DO $$
DECLARE
  v_canon uuid; v_dup uuid; v_cn int; v_dn int;
BEGIN
  SELECT count(*), min(id) INTO v_cn, v_canon FROM public.exercises_library
    WHERE name = 'Kettlebell swing russo' AND category = 'potencia_pliometria';
  SELECT count(*), min(id) INTO v_dn, v_dup FROM public.exercises_library
    WHERE name = 'Swing com kettlebell Russo' AND category = 'potencia_pliometria';

  IF v_cn <> 1 THEN
    RAISE EXCEPTION 'merge abortado: esperado 1 canonico "Kettlebell swing russo", achei %', v_cn;
  END IF;
  IF v_dn = 0 THEN
    RAISE NOTICE 'duplicata ja removida — no-op idempotente'; RETURN;
  END IF;
  IF v_dn > 1 THEN
    RAISE EXCEPTION 'merge abortado: esperado <=1 duplicata, achei %', v_dn;
  END IF;

  UPDATE public.exercises SET exercise_library_id = v_canon WHERE exercise_library_id = v_dup;
  DELETE FROM public.exercises_library WHERE id = v_dup;
END $$;
