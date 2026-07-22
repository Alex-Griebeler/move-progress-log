-- Fase potencia: preenche a FORMA (movement_pattern) dos exercicios de potencia
-- que estavam NULL (contrato "forma x qualidade" / Opcao A) + Figura 8 -> ativacao
-- Casa por name+category, guard movement_pattern IS NULL -> idempotente.
-- (Zerar subcategoria de potencia + canon dos patterns vai no PR de codigo, a parte.)
-- Consenso Claude+Codex. Duplicata "Swing com kettlebell Russo" tratada em migracao a parte.

-- salto_pliometria (8)
UPDATE public.exercises_library SET movement_pattern='salto_pliometria'
WHERE name='Afundo com Salto' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria'
WHERE name='Agachamento com Salto' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria'
WHERE name='Lateral Saltos sobre barreira' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria'
WHERE name='Salto em distância' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria'
WHERE name='Salto na caixa Bilateral' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria'
WHERE name='Salto na caixa Unilateral' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria'
WHERE name='Salto unilateral lateral alternado com medball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='salto_pliometria'
WHERE name='Saltos sobre barreira Unilateral' AND category='potencia_pliometria' AND movement_pattern IS NULL;

-- arremesso (9)
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Arremesso Overhead Ajoelhado medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Arremesso Overhead Semi-Ajoelhado medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Arremesso Overhead Split Stance medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Arremesso Overhead Supino medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Arremesso Overhead em Pé medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Arremesso Overhead unilateral em Pé medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Arremesso Peito Supino medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Slam medball' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='arremesso'
WHERE name='Slam na corda naval' AND category='potencia_pliometria' AND movement_pattern IS NULL;

-- levantamento_potencia (4)
UPDATE public.exercises_library SET movement_pattern='levantamento_potencia'
WHERE name='Agachamento + press (thruster) com kettlebell (2 kettlebells)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='levantamento_potencia'
WHERE name='Arranco com kettlebell' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='levantamento_potencia'
WHERE name='Arremesso + press com kettlebell (clean & press)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='levantamento_potencia'
WHERE name='Puxada alta com kettlebell' AND category='potencia_pliometria' AND movement_pattern IS NULL;

-- dobradica_quadril (6)
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril'
WHERE name='Hip hinge com strap (bastão)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril'
WHERE name='Kettlebell swing diagonal base assimétrica' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril'
WHERE name='Kettlebell swing russo' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril'
WHERE name='SLDL com apoio (PT)' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril'
WHERE name='SLDL com apoio (PT) + flexão quadril CTRL' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='dobradica_quadril'
WHERE name='SLDL com rotação do tronco' AND category='potencia_pliometria' AND movement_pattern IS NULL;

-- tecnica_locomocao (3)
UPDATE public.exercises_library SET movement_pattern='tecnica_locomocao'
WHERE name='Empurrar trenó' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='tecnica_locomocao'
WHERE name='Puxar trenó' AND category='potencia_pliometria' AND movement_pattern IS NULL;
UPDATE public.exercises_library SET movement_pattern='tecnica_locomocao'
WHERE name='Sprint (10-20m)' AND category='potencia_pliometria' AND movement_pattern IS NULL;

-- empurrar_horizontal (1)
UPDATE public.exercises_library SET movement_pattern='empurrar_horizontal'
WHERE name='Flexão de braços pliométrica' AND category='potencia_pliometria' AND movement_pattern IS NULL;

-- rotacao_potencia (1)
UPDATE public.exercises_library SET movement_pattern='rotacao_potencia'
WHERE name='Arremesso Rotacional Supino medicine ball' AND category='potencia_pliometria' AND movement_pattern IS NULL;

-- Figura 8: movimento preparatorio -> core_ativacao (decisao do dono)
UPDATE public.exercises_library SET category='core_ativacao', subcategory='controle_motor_tecnica'
WHERE name='Figura 8 com kettlebell' AND category='potencia_pliometria';
