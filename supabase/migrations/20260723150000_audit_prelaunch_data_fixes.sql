-- Auditoria final pre-launch (2026-07-23): fixes de dados aplicados via REST,
-- registrados aqui p/ re-sync no-op do Lovable. Todos idempotentes.

-- ===== movement_plane: ultimos 4 nulos (909/909 preenchido) =====
UPDATE public.exercises_library SET movement_plane='sagital'
WHERE category='respiracao' AND movement_plane IS NULL;
UPDATE public.exercises_library SET movement_plane='frontal'
WHERE name='Salto lateral alternado pausado' AND movement_plane IS NULL;
UPDATE public.exercises_library SET movement_plane='sagital'
WHERE name='Rack Pull' AND movement_plane IS NULL;

-- ===== LMF: conforma ao canon de 8 (tokens que o gerador casa por igualdade) =====
UPDATE public.exercises_library SET subcategory='coluna'
WHERE category='lmf' AND name IN ('Liberação miofascial com rolo — Coluna Torácica','Liberação miofascial coluna torácica','Liberação miofascial latíssimo')
  AND subcategory IS DISTINCT FROM 'coluna';
UPDATE public.exercises_library SET subcategory='gluteos'
WHERE category='lmf' AND name IN ('Liberação miofascial com bola de lacrosse — Glúteo/Piriforme','Liberação miofascial com rolo — Quadril/TFL','Liberação miofascial TFL','Liberação miofascial glúteos')
  AND subcategory IS DISTINCT FROM 'gluteos';
UPDATE public.exercises_library SET subcategory='ombro'
WHERE category='lmf' AND name IN ('Liberação miofascial com bola de lacrosse — Peitoral/Subclávio','Liberação miofascial peitoral')
  AND subcategory IS DISTINCT FROM 'ombro';
UPDATE public.exercises_library SET subcategory='adutores'
WHERE category='lmf' AND name='Liberação miofascial adutores' AND subcategory IS DISTINCT FROM 'adutores';
UPDATE public.exercises_library SET subcategory='quadriceps'
WHERE category='lmf' AND name='Liberação miofascial flexores do quadril/quadríceps' AND subcategory IS DISTINCT FROM 'quadriceps';
UPDATE public.exercises_library SET subcategory='panturrilha'
WHERE category='lmf' AND name='Liberação miofascial panturrilha' AND subcategory IS DISTINCT FROM 'panturrilha';
UPDATE public.exercises_library SET subcategory='pe'
WHERE category='lmf' AND name='Liberação miofascial planta do pé' AND subcategory IS DISTINCT FROM 'pe';
UPDATE public.exercises_library SET subcategory='isquiotibiais'
WHERE category='lmf' AND name='Liberação miofascial posteriores da coxa' AND subcategory IS DISTINCT FROM 'isquiotibiais';

-- ===== Miscatalogs (resolvem pendencia antiga do VMO Step Down) =====
UPDATE public.exercises_library
SET category='forca_hipertrofia', movement_pattern='agachamento_unilateral', subcategory='step_up_step_down'
WHERE name='VMO Step Down' AND category='lmf';
UPDATE public.exercises_library
SET category='mobilidade', subcategory='coluna_toracica', movement_pattern=NULL
WHERE name='Coluna torácica mobilização (sentado)' AND category='lmf';

-- ===== CORE: conforma ao canon de 7 =====
UPDATE public.exercises_library SET subcategory='cintura_escapular_serratil'
WHERE category='core_ativacao' AND subcategory IN ('ativacao_escapular','ativacao_ombro');
UPDATE public.exercises_library SET subcategory='anti_extensao'
WHERE category='core_ativacao' AND name IN ('Prancha Spiderman','Prancha com Elevação Braço','Anti-extensão overhead com super band ajoelhado')
  AND subcategory IS DISTINCT FROM 'anti_extensao';
UPDATE public.exercises_library SET subcategory='anti_rotacao'
WHERE category='core_ativacao' AND name IN ('Bird Dog com Banda','Lunge lateral + pallof press')
  AND subcategory IS DISTINCT FROM 'anti_rotacao';
UPDATE public.exercises_library SET subcategory='controle_motor_tecnica'
WHERE category='core_ativacao' AND name IN ('Agachamento com anilha + medicine ball','Ativação de flexor de quadril (marcha)')
  AND subcategory IS DISTINCT FROM 'controle_motor_tecnica';
UPDATE public.exercises_library SET subcategory='ativacao_gluteos'
WHERE category='core_ativacao' AND name='Prancha inversa' AND subcategory IS DISTINCT FROM 'ativacao_gluteos';
UPDATE public.exercises_library SET subcategory='cintura_escapular_serratil'
WHERE category='core_ativacao' AND name='Hip hinge + ativação escapular com super band'
  AND subcategory IS DISTINCT FROM 'cintura_escapular_serratil';

-- ===== miudos circulares =====
UPDATE public.exercises_library SET subcategory=NULL
WHERE category='condicionamento_metabolico' AND subcategory='potencia';
UPDATE public.exercises_library SET subcategory=NULL
WHERE category='mobilidade' AND subcategory='mobilidade';
