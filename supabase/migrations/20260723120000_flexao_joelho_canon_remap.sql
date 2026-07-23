-- Remap das subcategorias de flexao_joelho para o canon que JA existe no codigo
-- (STRENGTH_SUBCATEGORIES.flexao_joelho = {nordica, leg_curl, sliding_curl}).
-- Substitui os baldes fora do canon: 'flexao_joelhos_nordica' (9, misturava
-- nordicas com slides), 'enfase_joelho' (7, idem) e 'agachamento_unilateral' (1).
-- 'leg_curl' fica familia reservada: as maquinas (mesa flexora/leg curl) foram
-- removidas do catalogo em levas anteriores. Idempotente. So dados (canon ja no codigo).

-- nordica (8): nordicas e variantes (razor curl, nordica inversa)
UPDATE public.exercises_library SET subcategory='nordica'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Nordic curl'
  AND subcategory IS DISTINCT FROM 'nordica';
UPDATE public.exercises_library SET subcategory='nordica'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão Nórdica ECC'
  AND subcategory IS DISTINCT FROM 'nordica';
UPDATE public.exercises_library SET subcategory='nordica'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão Nórdica ECC + CC'
  AND subcategory IS DISTINCT FROM 'nordica';
UPDATE public.exercises_library SET subcategory='nordica'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão Nórdica ECC com auxílio super band'
  AND subcategory IS DISTINCT FROM 'nordica';
UPDATE public.exercises_library SET subcategory='nordica'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Nordic Hamstring Curl'
  AND subcategory IS DISTINCT FROM 'nordica';
UPDATE public.exercises_library SET subcategory='nordica'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Nordic Hamstring Curl com Band'
  AND subcategory IS DISTINCT FROM 'nordica';
UPDATE public.exercises_library SET subcategory='nordica'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Razor curl'
  AND subcategory IS DISTINCT FROM 'nordica';
UPDATE public.exercises_library SET subcategory='nordica'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão nórdica inversa'
  AND subcategory IS DISTINCT FROM 'nordica';

-- sliding_curl (10): slide board / slide / bola (curl deslizante)
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão ECC dos joelhos no Slide'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão do joelho unilateral em ponte com slide'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão dos joelhos em ponte com slide'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão dos joelhos na bola'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão dos joelhos no slide'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Flexão dos joelhos unilateral no Slide'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Gliding Leg Curl'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Slide board curl bilateral'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Slide board curl unilateral'
  AND subcategory IS DISTINCT FROM 'sliding_curl';
UPDATE public.exercises_library SET subcategory='sliding_curl'
WHERE category='forca_hipertrofia' AND movement_pattern='flexao_joelho' AND name='Swiss Ball Leg Curl'
  AND subcategory IS DISTINCT FROM 'sliding_curl';

-- MISCATALOG: 'Extensao terminal de joelho (TKE)' e EXTENSAO de joelho
-- (primary_muscles = quadriceps/VMO), nao flexao. E acessorio isolado de quadriceps.
UPDATE public.exercises_library SET movement_pattern='isolado', subcategory=NULL
WHERE category='forca_hipertrofia' AND name='Extensão terminal de joelho (TKE)'
  AND movement_pattern='flexao_joelho';
