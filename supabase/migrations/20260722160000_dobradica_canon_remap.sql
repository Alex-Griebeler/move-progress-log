-- Remap das subcategorias de dobradica_quadril (forca) para o canon ratificado
-- {deadlift, rdl_stiff, ponte_hip_thrust, hinge_tecnico}. bi/uni vive no laterality,
-- nao na subcategoria. Corrige o typo 'dobradura_quadril' e a mistura 'enfase_quadril'.
-- Oddballs (decisao do dono/Claude): 'Deslizamento lateral' era miscatalog -> passada_deslocamento/lateral;
-- 'Extensao lombar 45' x2 e 'Pull-through' -> rdl_stiff. Casa por name+pattern, idempotente.

-- deadlift_bilateral/unilateral -> deadlift (bi/uni ja esta no laterality)
UPDATE public.exercises_library SET subcategory='deadlift'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril'
  AND subcategory IN ('deadlift_bilateral','deadlift_unilateral');

-- ambiguos (enfase_quadril / dobradura_quadril) reclassificados por nome
UPDATE public.exercises_library SET movement_pattern='passada_deslocamento', subcategory='lateral'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Deslizamento lateral alternado (slide board)'
  AND (movement_pattern, subcategory) IS DISTINCT FROM ('passada_deslocamento','lateral');
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Elevação de quadril (hip thrust) Isométrico'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Elevação de quadril (hip thrust) com Kettlebell'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Elevação de quadril (hip thrust) com banda elástica'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Elevação de quadril (hip thrust) com barra'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Extensão lombar 45°'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Glute Bridge Bilateral'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Good Morning com Barra'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Hip Thrust barra com banda elástica'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Hip thrust (bulgarian Bag)'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Hip thrust peso corporal bilateral'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='deadlift'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Levantamento terra (barra) — convencional'
  AND subcategory IS DISTINCT FROM 'deadlift';
UPDATE public.exercises_library SET subcategory='deadlift'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Levantamento terra (barra) — sumô'
  AND subcategory IS DISTINCT FROM 'deadlift';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Levantamento terra Romeno com Kettlebell'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Levantamento terra romeno (RDL) com barra'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Levantamento terra romeno (RDL) com halteres'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='RDL base assimétrica (halter/kettlebell)'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Rear Foot Elevated Hip Hinge (RFE-RDL)'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Single Leg Elevação de quadril (hip thrust)'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Single Leg Extensão lombar 45°'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Single Leg Glute Bridge'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Single Leg RDL com 2 Halteres'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Single Leg RDL com Barra'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Single Leg RDL com Halter'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Single Leg RDL com Peso Corporal'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='deadlift'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Trap Bar Levantamento terra'
  AND subcategory IS DISTINCT FROM 'deadlift';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Bom dia com barra'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Elevação de quadril (hip thrust) base assimétrica'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Elevação de quadril (hip thrust) base assimétrica unilateral'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Good morning base assimétrica'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Hip thrust unilateral peso corporal'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='deadlift'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Levantamento terra (elevado/assistido)'
  AND subcategory IS DISTINCT FROM 'deadlift';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Ponte caminhando com calcanhar'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Ponte com pés no slide'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Ponte com pés no slide unilateral'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Ponte isométrica (topo)'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Ponte no solo'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='ponte_hip_thrust'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Ponte no solo unilateral'
  AND subcategory IS DISTINCT FROM 'ponte_hip_thrust';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Pull-through'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='RDL (romeno) — barra'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='RDL (romeno) — kettlebell/halter'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='RDL base assimétrica'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='RDL base assimétrica unilateral'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';
UPDATE public.exercises_library SET subcategory='rdl_stiff'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='RDL unilateral'
  AND subcategory IS DISTINCT FROM 'rdl_stiff';

-- Rack Pull (deadlift parcial, estava com subcategoria vazia) -> deadlift
UPDATE public.exercises_library SET subcategory='deadlift'
WHERE category='forca_hipertrofia' AND movement_pattern='dobradica_quadril' AND name='Rack Pull'
  AND subcategory IS DISTINCT FROM 'deadlift';

-- Nordic curl: e flexao_joelho, mas carregava o typo 'dobradura_quadril' da
-- dobradica. Canon do flexao_joelho -> 'nordica'. (Pego na auditoria do Codex.)
UPDATE public.exercises_library SET subcategory='nordica'
WHERE name='Nordic curl' AND movement_pattern='flexao_joelho'
  AND subcategory IS DISTINCT FROM 'nordica';
