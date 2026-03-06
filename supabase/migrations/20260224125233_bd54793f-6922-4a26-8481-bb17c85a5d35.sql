
ALTER TABLE exercises_library ADD COLUMN IF NOT EXISTS functional_group text;

-- Mapeamento movement_pattern -> functional_group
UPDATE exercises_library SET functional_group = 'empurrar_horizontal' WHERE movement_pattern = 'empurrar_horizontal';
UPDATE exercises_library SET functional_group = 'empurrar_vertical' WHERE movement_pattern = 'empurrar_vertical';
UPDATE exercises_library SET functional_group = 'puxar_horizontal' WHERE movement_pattern = 'puxar_horizontal';
UPDATE exercises_library SET functional_group = 'puxar_vertical' WHERE movement_pattern = 'puxar_vertical';
UPDATE exercises_library SET functional_group = 'carregar' WHERE movement_pattern = 'carregar';
UPDATE exercises_library SET functional_group = 'locomocao' WHERE movement_pattern = 'locomocao';
UPDATE exercises_library SET functional_group = 'respiracao' WHERE movement_pattern = 'respiracao';

UPDATE exercises_library SET functional_group = 'dominancia_joelho'
WHERE movement_pattern IN ('dominancia_joelho', 'agachamento_bilateral', 'agachamento_unilateral', 'agachamento_lateral', 'base_assimetrica_split_squat', 'lunge', 'lunge_slideboard', 'flexao_joelhos_nordica');

UPDATE exercises_library SET functional_group = 'dominancia_quadril'
WHERE movement_pattern IN ('dominancia_quadril', 'deadlift_bilateral', 'deadlift_unilateral', 'rdl_stiff', 'ponte_hip_thrust', 'gluteos_estabilidade');

UPDATE exercises_library SET functional_group = movement_pattern
WHERE movement_pattern IN ('core_anti_extensao', 'core_anti_flexao_lateral', 'core_anti_rotacao', 'core_geral');

UPDATE exercises_library SET functional_group = 'ativacao'
WHERE movement_pattern IN ('ativacao_gluteos', 'ativacao_geral', 'escapula');

UPDATE exercises_library SET functional_group = 'mobilidade'
WHERE movement_pattern IN ('mobilidade_quadril', 'mobilidade_toracica', 'mobilidade_integrada', 'mobilidade_tornozelo');

UPDATE exercises_library SET functional_group = 'pliometria'
WHERE movement_pattern LIKE 'pliometria_%';

-- Corrigir categorias 'geral'
UPDATE exercises_library SET category = 'forca'
WHERE category = 'geral' AND functional_group IN ('dominancia_joelho', 'dominancia_quadril');

UPDATE exercises_library SET category = 'ativacao'
WHERE category = 'geral' AND functional_group = 'ativacao';

-- Create index for AI queries
CREATE INDEX IF NOT EXISTS idx_exercises_library_functional_group ON exercises_library(functional_group);
