-- =====================================================
-- FABRIK STUDIO — MIGRATION DE CLASSIFICAÇÃO EXERCÍCIOS
-- Data: 2026-04-03
-- Arquivo: 20260403114731_classificacao_exercicios.sql
-- =====================================================

BEGIN;

-- =====================================================
-- BLOCO 0: GARANTIR COLUNA stability_position
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises_library' AND column_name = 'position'
  ) THEN
    ALTER TABLE exercises_library RENAME COLUMN position TO stability_position;
  END IF;
END $$;

-- =====================================================
-- BLOCO 1: RESOLVER DUPLICATAS
-- =====================================================

-- 1A. "Front Squat BB" = "Agachamento frontal BB"
UPDATE exercises_library SET name = 'Agachamento frontal (barra)'
WHERE name = 'Agachamento frontal BB';
DELETE FROM exercises_library WHERE name = 'Front Squat BB';

-- 1B. "Deadlift sumô" = duplicata de "Deadlift Sumô BB"
UPDATE exercises_library SET name = 'Deadlift sumô (barra)' WHERE name = 'Deadlift Sumô BB';
DELETE FROM exercises_library WHERE name = 'Deadlift sumô';

-- 1C. "KB Deadlift" = "Deadlift 1KB/DB"
DELETE FROM exercises_library WHERE name = 'KB Deadlift';

-- 1D. "SLDL" — 3 ocorrências distintas
UPDATE exercises_library SET name = 'Deadlift romeno unilateral'
WHERE name = 'SLDL'
  AND movement_pattern IN ('rdl_stiff','dominancia_quadril','dominancia_de_quadril');

UPDATE exercises_library SET name = 'Deadlift romeno unilateral (ativação glúteos)'
WHERE name = 'SLDL'
  AND movement_pattern IN ('gluteos_estabilidade','estabilidade');

UPDATE exercises_library SET name = 'Deadlift romeno (mobilidade)'
WHERE name = 'SLDL';

-- 1E. "Prancha lateral" duplicada
UPDATE exercises_library SET name = 'Prancha lateral (glúteo médio)'
WHERE name = 'Prancha lateral' AND tags @> ARRAY['gluteo_medio'];

-- 1F. "Prancha lateral de joelhos" nivel 3
UPDATE exercises_library SET name = 'Prancha lateral de joelhos (glúteo médio)'
WHERE name = 'Prancha lateral de joelhos' AND numeric_level = 3;

-- 1G. "Lunge reverso taça" em rdl_stiff
UPDATE exercises_library SET name = 'Lunge reverso taça (ênfase quadril)'
WHERE name = 'Lunge reverso taça'
  AND movement_pattern IN ('rdl_stiff','dominancia_quadril','dominancia_de_quadril');

-- 1H. Remadas quase idênticas
UPDATE exercises_library SET name = 'Remada unilateral inclinada com apoio (KB/DB)'
WHERE name = 'Remada UNL curvada c/ apoio 1KB/DB';
UPDATE exercises_library SET name = 'Remada unilateral inclinada livre (KB/DB)'
WHERE name = 'Remada UNL curvado 1KB/DB';

-- 1I. Remada bilateral inclinada
UPDATE exercises_library SET name = 'Remada bilateral inclinada (KB/DB)'
WHERE name IN ('Remada BI DB/KB','Remada curvada 2KB/DB');
DELETE FROM exercises_library
WHERE name = 'Remada bilateral inclinada (KB/DB)'
  AND ctid NOT IN (SELECT min(ctid) FROM exercises_library WHERE name = 'Remada bilateral inclinada (KB/DB)');

-- 1J. Elevação do quadril bilateral
UPDATE exercises_library SET name = 'Elevação do quadril bilateral (caixa/banco)'
WHERE name IN ('Elevação do quadril BI','Elevação do quadril BI (Caixa/BCO)');
DELETE FROM exercises_library
WHERE name = 'Elevação do quadril bilateral (caixa/banco)'
  AND ctid NOT IN (SELECT min(ctid) FROM exercises_library WHERE name = 'Elevação do quadril bilateral (caixa/banco)');

-- 1K. Elevação do quadril unilateral
UPDATE exercises_library SET name = 'Elevação do quadril unilateral (caixa/banco)'
WHERE name IN ('Elevação do quadril UNL','Elevação do quadril UNL (Caixa/BCO)');
DELETE FROM exercises_library
WHERE name = 'Elevação do quadril unilateral (caixa/banco)'
  AND ctid NOT IN (SELECT min(ctid) FROM exercises_library WHERE name = 'Elevação do quadril unilateral (caixa/banco)');

-- 1L. Remada bilateral em pé super band
UPDATE exercises_library SET name = 'Remada bilateral em pé (super band)'
WHERE name IN ('Remada bilateral c/ SB','Remada em pé c/ SB');
DELETE FROM exercises_library
WHERE name = 'Remada bilateral em pé (super band)'
  AND ctid NOT IN (SELECT min(ctid) FROM exercises_library WHERE name = 'Remada bilateral em pé (super band)');

-- 1M. "Agachamento overhead" força vs mobilidade
UPDATE exercises_library SET name = 'Agachamento overhead (mobilidade)'
WHERE name = 'Agachamento overhead'
  AND movement_pattern IN ('mobilidade_integrada','integrados','mobilidade');

-- 1N. "Flexão nórdica" livre vs excêntrica
UPDATE exercises_library SET name = 'Flexão nórdica (livre)'
WHERE name = 'Flexão nórdica' AND numeric_level = 6;

-- =====================================================
-- BLOCO 2: PADRONIZAR NOMES EM PORTUGUÊS
-- =====================================================
UPDATE exercises_library SET name = REGEXP_REPLACE(name, '\s+', ' ', 'g');
UPDATE exercises_library SET name = REPLACE(name, ' c/ ', ' com ');
UPDATE exercises_library SET name = REPLACE(name, ' s/ ', ' sem ');
UPDATE exercises_library SET name = REPLACE(name, ' pos. ', ' posição ');
UPDATE exercises_library SET name = REPLACE(name, ' Pos. ', ' Posição ');
UPDATE exercises_library SET name = REPLACE(name, ' UNL ', ' unilateral ');
UPDATE exercises_library SET name = REPLACE(name, ' BI ', ' bilateral ');
UPDATE exercises_library SET name = REPLACE(name, ' ALT ', ' alternado ');
UPDATE exercises_library SET name = REPLACE(name, ' AJ ', ' ajoelhado ');
UPDATE exercises_library SET name = REPLACE(name, '(AJ)', '(ajoelhado)');
UPDATE exercises_library SET name = REPLACE(name, ' 1/2 AJ ', ' semi-ajoelhado ');
UPDATE exercises_library SET name = REPLACE(name, '(1/2 AJ)', '(semi-ajoelhado)');
UPDATE exercises_library SET name = REPLACE(name, ' DD ', ' decúbito dorsal ');
UPDATE exercises_library SET name = REPLACE(name, '(DD)', '(decúbito dorsal)');
UPDATE exercises_library SET name = REPLACE(name, ' DV ', ' decúbito ventral ');
UPDATE exercises_library SET name = REPLACE(name, ' DL ', ' decúbito lateral ');
UPDATE exercises_library SET name = REPLACE(name, '(DL)', '(decúbito lateral)');
UPDATE exercises_library SET name = REPLACE(name, ' BCO ', ' banco ');
UPDATE exercises_library SET name = REPLACE(name, ' BCO', ' banco');
UPDATE exercises_library SET name = REPLACE(name, ' ECC ', ' excêntrico ');
UPDATE exercises_library SET name = REPLACE(name, ' ECC', ' excêntrico');
UPDATE exercises_library SET name = REPLACE(name, ' ISO ', ' isométrico ');
UPDATE exercises_library SET name = REPLACE(name, ' ISO', ' isométrico');
UPDATE exercises_library SET name = REPLACE(name, ' CC ', ' concêntrico ');
UPDATE exercises_library SET name = REPLACE(name, ' MB ', ' mini band ');
UPDATE exercises_library SET name = REPLACE(name, ' MB)', ' mini band)');
UPDATE exercises_library SET name = REPLACE(name, ' SB ', ' super band ');
UPDATE exercises_library SET name = REPLACE(name, ' SB)', ' super band)');
UPDATE exercises_library SET name = REPLACE(name, ' SB', ' super band');
UPDATE exercises_library SET name = REPLACE(name, ' G7 ', ' polia ');
UPDATE exercises_library SET name = REPLACE(name, ' G7)', ' polia)');
UPDATE exercises_library SET name = REPLACE(name, ' G7', ' polia');
UPDATE exercises_library SET name = REPLACE(name, '(PE)', '(pés elevados)');
UPDATE exercises_library SET name = REPLACE(name, ' PE ', ' pés elevados ');
UPDATE exercises_library SET name = REPLACE(name, '(PTE)', '(pé de trás elevado)');
UPDATE exercises_library SET name = REPLACE(name, '(PFE)', '(pé da frente elevado)');
UPDATE exercises_library SET name = REPLACE(name, ' DNC ', ' dinâmico ');
UPDATE exercises_library SET name = REPLACE(name, ' ARG ', ' argolas ');
UPDATE exercises_library SET name = REPLACE(name, ' ROT ', ' rotação ');
UPDATE exercises_library SET name = REPLACE(name, ' CNTL ', ' contralateral ');
UPDATE exercises_library SET name = REPLACE(name, ' BB ', ' (barra) ');
UPDATE exercises_library SET name = REPLACE(name, ' BB)', ' (barra))');
UPDATE exercises_library SET name = REPLACE(name, ' BB', ' (barra)');
UPDATE exercises_library SET name = TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'));

-- =====================================================
-- BLOCO 3: STABILITY_POSITION → 14 valores
-- =====================================================

UPDATE exercises_library SET stability_position = 'decubito_dorsal'
WHERE stability_position IN ('decubito_dorsal','solo_dorsal','dd')
   OR (stability_position IN ('solo','prancha')
       AND (name ILIKE '%Dead Bug%' OR name ILIKE '%Hollow%' OR
            name ILIKE '%ABD isométrico%' OR name ILIKE '%Flex-Ext quadril%'));

UPDATE exercises_library SET stability_position = 'decubito_ventral'
WHERE stability_position IN ('decubito_ventral','dv')
   OR name ILIKE '%Superman%' OR name ILIKE '%Cobra%' OR name ILIKE '%Snow angel%'
   OR name ILIKE '%Y em%' OR name ILIKE '%W em%'
   OR name ILIKE '%Ext. horizontal dos ombros em%';

UPDATE exercises_library SET stability_position = 'decubito_lateral'
WHERE stability_position IN ('decubito_lateral','dl');

UPDATE exercises_library SET stability_position = 'ponte'
WHERE stability_position IN ('ponte','solo','banco','banco_caixa','pes_elevados')
  AND (name ILIKE '% ponte%' OR name ILIKE '%em ponte%' OR name ILIKE '%Hip Thrust%' OR
       name ILIKE '%Hip Thruster%' OR name ILIKE '%Elevação do quadril%' OR name ILIKE '%Ponte%')
  AND stability_position NOT IN ('decubito_dorsal','decubito_ventral','decubito_lateral');

UPDATE exercises_library SET stability_position = 'quadrupede'
WHERE stability_position IN ('4_apoios','quadrupede','4apoios')
   OR name ILIKE '%4 apoios%' OR name ILIKE '%Bear hold%' OR name ILIKE '%Bear crawl%'
   OR name ILIKE '%Perdigueiro%' OR name ILIKE '%Cat/Camel%';

UPDATE exercises_library SET stability_position = 'prancha'
WHERE stability_position IN ('prancha','prancha_alta','prancha_lateral','elevada',
                              'joelhos','bola','bola_pes_elevados','pes_elevados','solo')
  AND (name ILIKE '%Prancha%' OR name ILIKE '%Roda abdominal%' OR
       name ILIKE '%Slide climber%' OR name ILIKE '%Flexão de braços%' OR
       name ILIKE '%Paralela%' OR name ILIKE '%Pike push%' OR
       name ILIKE '%Flexão nórdica%' OR name ILIKE '%Flexão dos joelhos%')
  AND stability_position NOT IN ('decubito_dorsal','decubito_ventral','decubito_lateral','ponte','quadrupede');

UPDATE exercises_library SET stability_position = 'ajoelhado'
WHERE stability_position IN ('ajoelhado','joelhos','aj')
  AND stability_position NOT IN ('decubito_dorsal','decubito_ventral','decubito_lateral','ponte','quadrupede','prancha');

UPDATE exercises_library SET stability_position = 'semi_ajoelhado'
WHERE stability_position IN ('semi_ajoelhado','semi_aj','1/2 aj','1/2_aj');

UPDATE exercises_library SET stability_position = 'sentado'
WHERE stability_position IN ('sentado','banco','banco_inclinado')
  AND stability_position NOT IN ('decubito_dorsal','decubito_ventral','decubito_lateral',
                                  'ponte','quadrupede','prancha','ajoelhado','semi_ajoelhado');

UPDATE exercises_library SET stability_position = 'em_pe_unilateral'
WHERE stability_position IN ('em_pe','base_unilateral','caixa')
  AND laterality = 'unilateral'
  AND movement_pattern IN ('agachamento_unilateral','deadlift_unilateral','gluteos_estabilidade',
                            'pe_tornozelo','corretivos_quadril','flexores','postero_lateral')
  AND stability_position NOT IN ('decubito_dorsal','decubito_ventral','decubito_lateral',
                                  'ponte','quadrupede','prancha','ajoelhado','semi_ajoelhado','sentado');

UPDATE exercises_library SET stability_position = 'em_pe_split'
WHERE stability_position IN ('split','split_squat','estatico','pe_tras_elevado',
                              'pe_frente_elevado','em_pe','base_assimetrica')
  AND movement_pattern IN ('lunge','lunge_slideboard','base_assimetrica_split_squat')
  AND stability_position NOT IN ('decubito_dorsal','decubito_ventral','decubito_lateral',
                                  'ponte','quadrupede','prancha','ajoelhado','semi_ajoelhado',
                                  'sentado','em_pe_unilateral');

UPDATE exercises_library SET stability_position = 'em_pe_assimetrica'
WHERE stability_position IN ('em_pe','base_assimetrica','potencia')
  AND (tags @> ARRAY['kickstand'] OR stability_position = 'base_assimetrica'
       OR name ILIKE '%base assimétrica%' OR name ILIKE '%potência%')
  AND stability_position NOT IN ('decubito_dorsal','decubito_ventral','decubito_lateral',
                                  'ponte','quadrupede','prancha','ajoelhado','semi_ajoelhado',
                                  'sentado','em_pe_unilateral','em_pe_split');

UPDATE exercises_library SET stability_position = 'suspenso'
WHERE stability_position IN ('suspensao','suspenso','invertido');

UPDATE exercises_library SET stability_position = 'em_pe_bilateral'
WHERE stability_position NOT IN (
  'decubito_dorsal','decubito_ventral','decubito_lateral','ponte','quadrupede',
  'prancha','ajoelhado','semi_ajoelhado','sentado','em_pe_bilateral',
  'em_pe_assimetrica','em_pe_split','em_pe_unilateral','suspenso'
) OR stability_position IS NULL;

-- =====================================================
-- BLOCO 4: LATERALITY → 5 valores
-- =====================================================
UPDATE exercises_library SET laterality = 'alternada' WHERE laterality = 'alternado';
UPDATE exercises_library SET laterality = 'contralateral'
WHERE tags @> ARRAY['contralateral'] OR name ILIKE '%contralateral%' OR name ILIKE '%CNTL%';
UPDATE exercises_library SET laterality = 'ipsilateral'
WHERE tags @> ARRAY['ipsilateral'] OR name ILIKE '%ipsilateral%';
UPDATE exercises_library SET laterality = 'unilateral' WHERE laterality = 'assimetrica';
UPDATE exercises_library SET laterality = 'bilateral'
WHERE laterality NOT IN ('bilateral','unilateral','alternada','contralateral','ipsilateral')
   OR laterality IS NULL;

-- =====================================================
-- BLOCO 5: MOVEMENT_PLANE
-- =====================================================
UPDATE exercises_library SET movement_plane = 'sagital'
WHERE movement_pattern IN (
  'empurrar_horizontal','empurrar_vertical','puxar_vertical','puxar_horizontal',
  'deadlift_bilateral','deadlift_unilateral','rdl_stiff','ponte_hip_thrust',
  'flexao_joelhos_nordica','agachamento_bilateral','base_assimetrica_split_squat',
  'lunge','lunge_slideboard','agachamento_unilateral','anti_extensao','corretivos_quadril',
  'flexao_de_bracos','flexao_suspensao','supino','press_landmine','press_vertical_KB_DB',
  'press_vertical_outros','paralela_e_pike','puxada_polia_SB','barra_fixa',
  'remada_argolas_suspensao','remada_polia','remada_polia_mike_boyle',
  'remada_livre','remada_alta_face_pull'
);

UPDATE exercises_library SET movement_plane = 'frontal'
WHERE movement_pattern IN ('agachamento_lateral','carregamento')
   OR tags @> ARRAY['plano_frontal'];

UPDATE exercises_library SET movement_plane = 'transverso'
WHERE tags @> ARRAY['rotacao'] OR movement_pattern = 'anti_rotacao'
   OR name ILIKE '%Chop%' OR name ILIKE '%Lift%' OR name ILIKE '%Pallof%';

UPDATE exercises_library SET movement_plane = NULL
WHERE tags @> ARRAY['multiplanar'] OR name ILIKE '%matrix%'
   OR name ILIKE '%Windmill%' OR name ILIKE '%Melhor do mundo%';

UPDATE exercises_library SET movement_plane = NULL
WHERE movement_pattern IN (
  'liberacao_miofascial','respiracao','regioes','tecnicas','mobilidade',
  'mobilidade_quadril','mobilidade_toracica','mobilidade_integrada','mobilidade_tornozelo',
  'tornozelo','quadril','coluna_toracica','integrados'
);

-- =====================================================
-- BLOCO 6: CONTRACTION_TYPE
-- =====================================================
UPDATE exercises_library SET contraction_type = 'Pliométrica / Potência'
WHERE movement_pattern ILIKE '%pliometria%'
   OR movement_pattern IN ('bilateral_linear','unilateral_linear','unilateral_lateral','unilateral_lateral_medial')
   OR tags @> ARRAY['potencia']
   OR name ILIKE '%Salto%' OR name ILIKE '%Box Jump%'
   OR name ILIKE '%Push Press%' OR name ILIKE '%Clean%' OR name ILIKE '%pliométrica%';

UPDATE exercises_library SET contraction_type = 'Isométrica'
WHERE (tags @> ARRAY['isometrico'] OR name ILIKE '%isométrico%' OR name ILIKE '%Bear hold%' OR
       name ILIKE '%Hollow%' OR name ILIKE '%Prancha%')
  AND NOT name ILIKE '%Slide%';

UPDATE exercises_library SET contraction_type = 'Excêntrica'
WHERE tags @> ARRAY['excentrico'] OR name ILIKE '% excêntrico%' OR name ILIKE '%nórdica%';

UPDATE exercises_library SET contraction_type = NULL
WHERE movement_pattern IN (
  'liberacao_miofascial','respiracao','regioes','tecnicas','mobilidade',
  'mobilidade_quadril','mobilidade_toracica','mobilidade_integrada','mobilidade_tornozelo',
  'tornozelo','quadril','coluna_toracica','integrados',
  'escapula','gluteos_estabilidade','pe_tornozelo'
);

UPDATE exercises_library SET contraction_type = 'Mista'
WHERE contraction_type IS NULL
  AND movement_pattern IN (
    'empurrar_horizontal','empurrar_vertical','puxar_horizontal','puxar_vertical',
    'agachamento_bilateral','agachamento_lateral','base_assimetrica_split_squat',
    'lunge','lunge_slideboard','agachamento_unilateral','deadlift_bilateral',
    'deadlift_unilateral','rdl_stiff','ponte_hip_thrust','flexao_joelhos_nordica',
    'carregamento','flexao_de_bracos','flexao_suspensao','supino',
    'press_landmine','press_vertical_KB_DB','press_vertical_outros','paralela_e_pike',
    'puxada_polia_SB','barra_fixa','remada_argolas_suspensao','remada_polia',
    'remada_polia_mike_boyle','remada_livre','remada_alta_face_pull'
  );

-- =====================================================
-- BLOCO 7: FUNCTIONAL_GROUP — corrigir mismatch _de_
-- =====================================================
UPDATE exercises_library SET functional_group = 'dominancia_joelho'
WHERE movement_pattern IN (
  'dominancia_de_joelho','dominancia_joelho','agachamento_bilateral',
  'agachamento_lateral','agachamento_unilateral','base_assimetrica_split_squat',
  'lunge','lunge_slideboard','flexao_joelhos_nordica'
) AND (functional_group IS NULL OR functional_group != 'dominancia_joelho');

UPDATE exercises_library SET functional_group = 'dominancia_quadril'
WHERE movement_pattern IN (
  'dominancia_de_quadril','dominancia_quadril','deadlift_bilateral',
  'deadlift_unilateral','rdl_stiff','ponte_hip_thrust','gluteos_estabilidade'
) AND (functional_group IS NULL OR functional_group != 'dominancia_quadril');

-- =====================================================
-- BLOCO 8: 6 DIMENSÕES DE SCORING (0–5)
-- =====================================================
UPDATE exercises_library SET axial_load=0,lumbar_demand=0,technical_complexity=1,metabolic_potential=0,knee_dominance=0,hip_dominance=0
WHERE movement_pattern IN ('liberacao_miofascial','respiracao','regioes','tecnicas');

UPDATE exercises_library SET axial_load=1,lumbar_demand=1,technical_complexity=2,metabolic_potential=1,knee_dominance=1,hip_dominance=1
WHERE movement_pattern IN ('mobilidade','mobilidade_quadril','mobilidade_toracica','mobilidade_integrada','mobilidade_tornozelo','tornozelo','quadril','coluna_toracica','integrados');

UPDATE exercises_library SET axial_load=1,lumbar_demand=3,technical_complexity=3,metabolic_potential=2,knee_dominance=1,hip_dominance=1
WHERE movement_pattern IN ('anti_extensao','anti_flexao_lateral','anti_rotacao','escapula','gluteos_estabilidade','pe_tornozelo','corretivos_quadril','flexores','postero_lateral');

UPDATE exercises_library SET axial_load=2,lumbar_demand=2,technical_complexity=3,metabolic_potential=3,knee_dominance=0,hip_dominance=0
WHERE movement_pattern IN ('empurrar_horizontal','flexao_de_bracos','flexao_suspensao','supino');

UPDATE exercises_library SET axial_load=3,lumbar_demand=3,technical_complexity=3,metabolic_potential=3,knee_dominance=0,hip_dominance=0
WHERE movement_pattern IN ('empurrar_vertical','press_landmine','press_vertical_KB_DB','press_vertical_outros','paralela_e_pike');

UPDATE exercises_library SET axial_load=1,lumbar_demand=2,technical_complexity=3,metabolic_potential=3,knee_dominance=0,hip_dominance=1
WHERE movement_pattern IN ('puxar_horizontal','remada_argolas_suspensao','remada_polia','remada_polia_mike_boyle','remada_livre','remada_alta_face_pull');

UPDATE exercises_library SET axial_load=0,lumbar_demand=1,technical_complexity=4,metabolic_potential=3,knee_dominance=0,hip_dominance=0
WHERE movement_pattern IN ('puxar_vertical','puxada_polia_SB','barra_fixa');

UPDATE exercises_library SET axial_load=4,lumbar_demand=3,technical_complexity=3,metabolic_potential=3,knee_dominance=5,hip_dominance=2
WHERE movement_pattern IN ('agachamento_bilateral','agachamento_lateral');

UPDATE exercises_library SET axial_load=3,lumbar_demand=2,technical_complexity=3,metabolic_potential=3,knee_dominance=4,hip_dominance=2
WHERE movement_pattern IN ('base_assimetrica_split_squat','lunge','lunge_slideboard');

UPDATE exercises_library SET axial_load=3,lumbar_demand=2,technical_complexity=5,metabolic_potential=3,knee_dominance=5,hip_dominance=2
WHERE movement_pattern = 'agachamento_unilateral';

UPDATE exercises_library SET axial_load=5,lumbar_demand=5,technical_complexity=4,metabolic_potential=3,knee_dominance=2,hip_dominance=5
WHERE movement_pattern = 'deadlift_bilateral';

UPDATE exercises_library SET axial_load=3,lumbar_demand=4,technical_complexity=5,metabolic_potential=3,knee_dominance=1,hip_dominance=5
WHERE movement_pattern = 'deadlift_unilateral';

UPDATE exercises_library SET axial_load=3,lumbar_demand=4,technical_complexity=3,metabolic_potential=2,knee_dominance=1,hip_dominance=5
WHERE movement_pattern = 'rdl_stiff';

UPDATE exercises_library SET axial_load=1,lumbar_demand=2,technical_complexity=2,metabolic_potential=2,knee_dominance=2,hip_dominance=5
WHERE movement_pattern = 'ponte_hip_thrust';

UPDATE exercises_library SET axial_load=1,lumbar_demand=2,technical_complexity=4,metabolic_potential=2,knee_dominance=4,hip_dominance=3
WHERE movement_pattern = 'flexao_joelhos_nordica';

UPDATE exercises_library SET axial_load=3,lumbar_demand=3,technical_complexity=3,metabolic_potential=4,knee_dominance=1,hip_dominance=1
WHERE movement_pattern IN ('carregar','carregamento');

UPDATE exercises_library SET axial_load=2,lumbar_demand=2,technical_complexity=4,metabolic_potential=5,knee_dominance=4,hip_dominance=3
WHERE movement_pattern ILIKE '%pliometria%'
   OR movement_pattern IN ('bilateral_linear','unilateral_linear','unilateral_lateral','unilateral_lateral_medial');

UPDATE exercises_library SET axial_load=2,lumbar_demand=3,technical_complexity=4,metabolic_potential=4,knee_dominance=2,hip_dominance=3
WHERE movement_pattern IN ('exercicios_nao_convencionais','frontal','sagital','transverso');

-- Barra → +1 axial_load
UPDATE exercises_library SET axial_load = LEAST(axial_load + 1, 5)
WHERE (name ILIKE '%(barra)%' OR name ILIKE '%barra%') AND axial_load IS NOT NULL AND axial_load > 0;

-- =====================================================
-- BLOCO 9: LEVEL (texto)
-- =====================================================
UPDATE exercises_library SET level = CASE
  WHEN boyle_score = 1 THEN 'Iniciante'
  WHEN boyle_score = 2 THEN 'Iniciante/Intermediário'
  WHEN boyle_score = 3 THEN 'Intermediário'
  WHEN boyle_score = 4 THEN 'Intermediário/Avançado'
  WHEN boyle_score = 5 THEN 'Avançado'
  ELSE 'Todos os níveis'
END;

-- =====================================================
-- BLOCO 10: boyle_score para LMF/respiração/mobilidade
-- =====================================================
UPDATE exercises_library SET boyle_score = 1
WHERE boyle_score IS NULL
  AND movement_pattern IN ('liberacao_miofascial','respiracao','regioes','tecnicas',
                            'mobilidade','mobilidade_quadril','mobilidade_tornozelo','tornozelo','quadril')
  AND (numeric_level IS NULL OR numeric_level <= 2);

UPDATE exercises_library SET boyle_score = 2
WHERE boyle_score IS NULL
  AND movement_pattern IN ('mobilidade_integrada','coluna_toracica','integrados','mobilidade_toracica');

UPDATE exercises_library SET level = CASE
  WHEN boyle_score = 1 THEN 'Iniciante'
  WHEN boyle_score = 2 THEN 'Iniciante/Intermediário'
  ELSE level
END
WHERE level = 'Todos os níveis' AND boyle_score IN (1, 2);

COMMIT;
