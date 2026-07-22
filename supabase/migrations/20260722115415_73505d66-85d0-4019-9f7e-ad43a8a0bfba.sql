UPDATE public.exercises_library SET category='potencia_pliometria', subcategory='potencia'
WHERE left(id::text,8)='f30b1732' AND name='Kettlebell swing americano'
  AND (category, subcategory) IS DISTINCT FROM ('potencia_pliometria','potencia');

UPDATE public.exercises_library SET category='potencia_pliometria', subcategory='potencia'
WHERE left(id::text,8)='2716450b' AND name='Single Leg Swing com kettlebell'
  AND (category, subcategory) IS DISTINCT FROM ('potencia_pliometria','potencia');

UPDATE public.exercises_library SET category='potencia_pliometria', subcategory='potencia'
WHERE left(id::text,8)='17a99d0c' AND name='Push press (halter/kettlebell)'
  AND (category, subcategory) IS DISTINCT FROM ('potencia_pliometria','potencia');

UPDATE public.exercises_library SET category='potencia_pliometria', subcategory='potencia'
WHERE left(id::text,8)='debb7563' AND name='Push Press 1 kettlebell ou halter'
  AND (category, subcategory) IS DISTINCT FROM ('potencia_pliometria','potencia');

UPDATE public.exercises_library SET category='potencia_pliometria', subcategory='potencia'
WHERE left(id::text,8)='ff2855f3' AND name='Push Press 2 kettlebells ou halteres'
  AND (category, subcategory) IS DISTINCT FROM ('potencia_pliometria','potencia');

UPDATE public.exercises_library SET category='potencia_pliometria', subcategory='potencia'
WHERE left(id::text,8)='2e084fe5' AND name='Push Press barra'
  AND (category, subcategory) IS DISTINCT FROM ('potencia_pliometria','potencia');

UPDATE public.exercises_library SET category='potencia_pliometria', subcategory='potencia'
WHERE left(id::text,8)='7d7c2fcc' AND name='Push Press com barra'
  AND (category, subcategory) IS DISTINCT FROM ('potencia_pliometria','potencia');

UPDATE public.exercises_library SET category='potencia_pliometria', subcategory='potencia'
WHERE left(id::text,8)='a7b97c17' AND name='Push Press unilateral Landmine'
  AND (category, subcategory) IS DISTINCT FROM ('potencia_pliometria','potencia');

UPDATE public.exercises_library SET movement_pattern='empurrar_vertical', subcategory='potencia'
WHERE left(id::text,8)='9fa26521' AND name='Push press'
  AND (movement_pattern, subcategory) IS DISTINCT FROM ('empurrar_vertical','potencia');