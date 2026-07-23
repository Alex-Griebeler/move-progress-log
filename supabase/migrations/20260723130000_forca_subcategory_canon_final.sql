-- Fecha a taxonomia de subcategoria da FORCA. Regra do contrato (ratificada):
--   * padrao COM canon em STRENGTH_SUBCATEGORIES -> so valores do canon
--   * padrao SEM canon -> subcategoria NULL (ela so repetiria o proprio padrao)
-- Usa as mesmas regras de nome do classificador. Idempotente. Ja aplicado via
-- REST em producao; fica aqui para registro / re-sync no-op do Lovable.

-- ============ agachamento_unilateral -> {step_up_step_down, single_leg_squat, caixa_banco}
UPDATE public.exercises_library SET subcategory='step_up_step_down'
WHERE category='forca_hipertrofia' AND movement_pattern='agachamento_unilateral'
  AND name ~* 'step.?up|step.?down' AND subcategory IS DISTINCT FROM 'step_up_step_down';

UPDATE public.exercises_library SET subcategory='caixa_banco'
WHERE category='forca_hipertrofia' AND movement_pattern='agachamento_unilateral'
  AND name !~* 'step.?up|step.?down' AND name ~* 'caixa|box'
  AND subcategory IS DISTINCT FROM 'caixa_banco';

UPDATE public.exercises_library SET subcategory='single_leg_squat'
WHERE category='forca_hipertrofia' AND movement_pattern='agachamento_unilateral'
  AND name !~* 'step.?up|step.?down' AND name !~* 'caixa|box'
  AND subcategory IS DISTINCT FROM 'single_leg_squat';

-- ============ base_assimetrica -> {bulgaro, split_squat, afundo_parado}
UPDATE public.exercises_library SET subcategory='bulgaro'
WHERE category='forca_hipertrofia' AND movement_pattern='base_assimetrica'
  AND name ~* 'b[uú]lgar' AND subcategory IS DISTINCT FROM 'bulgaro';

UPDATE public.exercises_library SET subcategory='split_squat'
WHERE category='forca_hipertrofia' AND movement_pattern='base_assimetrica'
  AND name !~* 'b[uú]lgar' AND name ~* 'split squat'
  AND subcategory IS DISTINCT FROM 'split_squat';

UPDATE public.exercises_library SET subcategory='afundo_parado'
WHERE category='forca_hipertrofia' AND movement_pattern='base_assimetrica'
  AND name !~* 'b[uú]lgar' AND name !~* 'split squat' AND name ~* 'afundo|lunge'
  AND subcategory IS DISTINCT FROM 'afundo_parado';

-- ============ passada_deslocamento -> {curtsy, walking, reversa, lateral, frente}
UPDATE public.exercises_library SET subcategory='curtsy'
WHERE category='forca_hipertrofia' AND movement_pattern='passada_deslocamento'
  AND name ~* 'curtsy' AND subcategory IS DISTINCT FROM 'curtsy';

UPDATE public.exercises_library SET subcategory='walking'
WHERE category='forca_hipertrofia' AND movement_pattern='passada_deslocamento'
  AND name !~* 'curtsy' AND name ~* 'caminhando|walking'
  AND subcategory IS DISTINCT FROM 'walking';

UPDATE public.exercises_library SET subcategory='reversa'
WHERE category='forca_hipertrofia' AND movement_pattern='passada_deslocamento'
  AND name !~* 'curtsy|caminhando|walking' AND name ~* 'revers'
  AND subcategory IS DISTINCT FROM 'reversa';

UPDATE public.exercises_library SET subcategory='lateral'
WHERE category='forca_hipertrofia' AND movement_pattern='passada_deslocamento'
  AND name !~* 'curtsy|caminhando|walking|revers' AND name ~* 'lateral|cossack|deslizamento'
  AND subcategory IS DISTINCT FROM 'lateral';

-- resto = frente (direcao default de uma passada sem direcao explicita)
UPDATE public.exercises_library SET subcategory='frente'
WHERE category='forca_hipertrofia' AND movement_pattern='passada_deslocamento'
  AND name !~* 'curtsy|caminhando|walking|revers|lateral|cossack|deslizamento'
  AND subcategory IS DISTINCT FROM 'frente';

-- ============ agachamento_bilateral: corrige o PLANO dos laterais/cossack antes de zerar
-- (estavam como 'sagital', mas agachamento lateral/cossack e plano FRONTAL —
--  sem isso, zerar a subcategoria destruiria a informacao 'lateral')
UPDATE public.exercises_library SET movement_plane='frontal'
WHERE category='forca_hipertrofia' AND movement_pattern='agachamento_bilateral'
  AND (subcategory='agachamento_lateral' OR name ~* 'agachamento lateral|cossack')
  AND movement_plane IS DISTINCT FROM 'frontal';

-- ============ padroes SEM canon -> subcategoria NULL (era pura repeticao do padrao)
UPDATE public.exercises_library SET subcategory=NULL
WHERE category='forca_hipertrofia'
  AND movement_pattern IN ('agachamento_bilateral','carregamento','isolado',
                           'empurrar_horizontal','empurrar_vertical',
                           'puxar_horizontal','puxar_vertical')
  AND subcategory IS NOT NULL;
