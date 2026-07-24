-- Funde a duplicata "Swing com kettlebell Russo" no canonico "Kettlebell swing russo".
-- Deterministico + idempotente + fail-loud (consenso Claude+Codex):
--   * exige EXATAMENTE 1 canonico; 0 duplicata = no-op (ja fundida); >1 candidato = aborta.
--   * repointa o historico (public.exercises, ON DELETE SET NULL) ANTES de deletar.
--   * DELETE falha alto se a duplicata tiver vinculo em prescription_exercises /
--     exercise_adaptations (RESTRICT).
-- FIX 2026-07-24: Postgres NAO tem agregado min(uuid) — o bloco original usava
-- min(id) e ERRAVA em todo re-run do auto-sync (42883). Agora count e pick sao
-- consultas separadas; o pick e deterministico por ORDER BY id::text LIMIT 1.
-- Dado ja aplicado em prod (dup removida em 2026-07-23) -> re-run cai no no-op.
DO $$
DECLARE
  v_canon uuid; v_dup uuid; v_cn int; v_dn int;
BEGIN
  SELECT count(*) INTO v_cn FROM public.exercises_library
    WHERE name = 'Kettlebell swing russo' AND category = 'potencia_pliometria';
  SELECT count(*) INTO v_dn FROM public.exercises_library
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

  SELECT id INTO v_canon FROM public.exercises_library
    WHERE name = 'Kettlebell swing russo' AND category = 'potencia_pliometria'
    ORDER BY id::text LIMIT 1;
  SELECT id INTO v_dup FROM public.exercises_library
    WHERE name = 'Swing com kettlebell Russo' AND category = 'potencia_pliometria'
    ORDER BY id::text LIMIT 1;

  UPDATE public.exercises SET exercise_library_id = v_canon WHERE exercise_library_id = v_dup;
  DELETE FROM public.exercises_library WHERE id = v_dup;
END $$;
