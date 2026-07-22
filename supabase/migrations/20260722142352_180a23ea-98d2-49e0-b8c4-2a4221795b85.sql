UPDATE public.exercises_library SET movement_pattern='salto_pliometria' WHERE name='Afundo com Salto' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria' WHERE name='Agachamento com Salto' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria' WHERE name='Lateral Saltos sobre barreira' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria' WHERE name='Salto em distância' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria' WHERE name='Salto na caixa Bilateral' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria' WHERE name='Salto na caixa Unilateral' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria' WHERE name='Salto unilateral lateral alternado com medball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria' WHERE name='Saltos sobre barreira Unilateral' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Arremesso Overhead Ajoelhado medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Arremesso Overhead Semi-Ajoelhado medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Arremesso Overhead Split Stance medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Arremesso Overhead Supino medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Arremesso Overhead em Pé medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Arremesso Overhead unilateral em Pé medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Arremesso Peito Supino medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Slam medball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso' WHERE name='Slam na corda naval' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='levantamento_potencia' WHERE name='Agachamento + press (thruster) com kettlebell (2 kettlebells)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='levantamento_potencia' WHERE name='Arranco com kettlebell' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='levantamento_potencia' WHERE name='Arremesso + press com kettlebell (clean & press)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='levantamento_potencia' WHERE name='Puxada alta com kettlebell' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril' WHERE name='Hip hinge com strap (bastão)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril' WHERE name='Kettlebell swing diagonal base assimétrica' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril' WHERE name='Kettlebell swing russo' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril' WHERE name='SLDL com apoio (PT)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril' WHERE name='SLDL com apoio (PT) + flexão quadril CTRL' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril' WHERE name='SLDL com rotação do tronco' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='tecnica_locomocao' WHERE name='Empurrar trenó' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='tecnica_locomocao' WHERE name='Puxar trenó' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='tecnica_locomocao' WHERE name='Sprint (10-20m)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='empurrar_horizontal' WHERE name='Flexão de braços pliométrica' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='rotacao_potencia' WHERE name='Arremesso Rotacional Supino medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;

UPDATE public.exercises_library SET category='core_ativacao', subcategory='controle_motor_tecnica'
WHERE name='Figura 8 com kettlebell' AND category='potencia_pliometria';

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
    ORDER BY id LIMIT 1;
  SELECT id INTO v_dup FROM public.exercises_library
    WHERE name = 'Swing com kettlebell Russo' AND category = 'potencia_pliometria'
    ORDER BY id LIMIT 1;

  UPDATE public.exercises SET exercise_library_id = v_canon WHERE exercise_library_id = v_dup;
  DELETE FROM public.exercises_library WHERE id = v_dup;
END $$;