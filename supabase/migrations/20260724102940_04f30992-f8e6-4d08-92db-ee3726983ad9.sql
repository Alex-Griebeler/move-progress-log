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

UPDATE public.exercises_library SET subcategory='frente'
WHERE category='forca_hipertrofia' AND movement_pattern='passada_deslocamento'
  AND name !~* 'curtsy|caminhando|walking|revers|lateral|cossack|deslizamento'
  AND subcategory IS DISTINCT FROM 'frente';

UPDATE public.exercises_library SET movement_plane='frontal'
WHERE category='forca_hipertrofia' AND movement_pattern='agachamento_bilateral'
  AND (subcategory='agachamento_lateral' OR name ~* 'agachamento lateral|cossack')
  AND movement_plane IS DISTINCT FROM 'frontal';

UPDATE public.exercises_library SET subcategory=NULL
WHERE category='forca_hipertrofia'
  AND movement_pattern IN ('agachamento_bilateral','carregamento','isolado',
                           'empurrar_horizontal','empurrar_vertical',
                           'puxar_horizontal','puxar_vertical')
  AND subcategory IS NOT NULL;