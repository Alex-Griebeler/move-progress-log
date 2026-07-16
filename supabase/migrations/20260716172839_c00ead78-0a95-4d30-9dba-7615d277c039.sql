-- Combined Leva 3b: fix primary_muscles arremessos/ativações/hinge + normalize muscle accents + fix arremesso rotacional deltoide.
-- Idempotent (IS DISTINCT FROM). Matches by id8+name. See supabase/migrations/20260716{120000,130000,140000}_*.sql

-- === 20260716120000_fix_primary_muscles_leva3b.sql ===
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core']::text[]
WHERE left(id::text,8) = '79fbdac0' AND name = 'Arremesso Lateral Ajoelhado medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core']::text[]
WHERE left(id::text,8) = 'bdbd1e18' AND name = 'Arremesso Lateral em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core']::text[]
WHERE left(id::text,8) = 'e98d534c' AND name = 'Arremesso Lateral Semi-Ajoelhado medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core']::text[]
WHERE left(id::text,8) = 'e511b640' AND name = 'Arremesso Lateral Split Stance medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core']::text[]
WHERE left(id::text,8) = '57ec1467' AND name = 'Arremesso Lateral unilateral em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = 'f1aecc46' AND name = 'Arremesso Peito Ajoelhado medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = '870c2c9a' AND name = 'Arremesso Peito em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = 'bb8a76d6' AND name = 'Arremesso Peito Semi-Ajoelhado medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = '8d8e10d0' AND name = 'Arremesso Peito Split Stance medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = '366bc7b8' AND name = 'Arremesso Peito Supino medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = '7d4f4392' AND name = 'Arremesso Peito unilateral em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','core','triceps']::text[]
WHERE left(id::text,8) = '5e4b36b5' AND name = 'Arremesso Overhead Ajoelhado medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','core','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','core','triceps']::text[]
WHERE left(id::text,8) = 'fdc9b208' AND name = 'Arremesso Overhead em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','core','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','core','triceps']::text[]
WHERE left(id::text,8) = '5688ff40' AND name = 'Arremesso Overhead Semi-Ajoelhado medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','core','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','core','triceps']::text[]
WHERE left(id::text,8) = 'c17ad83a' AND name = 'Arremesso Overhead Split Stance medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','core','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','core','triceps']::text[]
WHERE left(id::text,8) = '9b1b2b28' AND name = 'Arremesso Overhead Supino medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','core','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','core','triceps']::text[]
WHERE left(id::text,8) = 'c1a11191' AND name = 'Arremesso Overhead unilateral em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','core','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = '6eed3919' AND name = 'Arremesso Rotacional Ajoelhado medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = '2893ec29' AND name = 'Arremesso Rotacional com Step unilateral medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = 'df66a000' AND name = 'Arremesso Rotacional em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = 'd54274a7' AND name = 'Arremesso Rotacional Semi-Ajoelhado medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = 'fb3cd067' AND name = 'Arremesso Rotacional Split Stance medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = 'af63bd80' AND name = 'Arremesso Rotacional Supino medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = '349f8d07' AND name = 'Arremesso Rotacional unilateral em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = '816d50ce' AND name = 'Arremesso Scoop em Pé medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','core','triceps']::text[]
WHERE left(id::text,8) = 'bb67d385' AND name = 'Arremesso vertical medball' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','core','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = '29d693e2' AND name = 'Bola medicinal — arremesso rotacional' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = '04a8c4d1' AND name = 'Bola medicinal — passe de peito' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = 'c70b140f' AND name = 'Passe de peito com passada medball' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','core','deltoide_anterior']::text[]
WHERE left(id::text,8) = '455480b6' AND name = 'Slam medball' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','core','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','gluteo']::text[]
WHERE left(id::text,8) = '3dd5f6ba' AND name = 'Rotação do tronco com strap (base assimétrica)' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','gluteo']::text[]
WHERE left(id::text,8) = '667254ea' AND name = 'Rotação do tronco com strap (pés paralelos)' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','gluteo']::text[]
WHERE left(id::text,8) = '7c465d49' AND name = 'Rotação pélvica com strap (bastão)' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','quadriceps','obliquo']::text[]
WHERE left(id::text,8) = '97ac6ecd' AND name = 'Tripla extensão bilat. + rotação com strap (bastão)' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','quadriceps','obliquo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '2c173f95' AND name = 'SLDL com apoio (PT)' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '0dd24468' AND name = 'SLDL com apoio (PT) + flexão quadril CTRL' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '399daba3' AND name = 'SLDL com rotação do tronco' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '54ba23fe' AND name = 'Hip hinge com strap (bastão)' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial','lombar']::text[]
WHERE left(id::text,8) = 'e0e4b1a9' AND name = 'Rack Pull' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial','lombar']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = 'e4fc0b96' AND name = 'RDL kettlebell duplo no step' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '36e51cb6' AND name = 'Stiff com halteres' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','biceps','romboides']::text[]
WHERE left(id::text,8) = '016a28ca' AND name = 'Puxada vertical nas argolas' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','biceps','romboides']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','biceps','romboides']::text[]
WHERE left(id::text,8) = 'd156eeff' AND name = 'Remada supinada nas argolas' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','biceps','romboides']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','quadrado_lombar','core']::text[]
WHERE left(id::text,8) = '8543495c' AND name = 'Suitcase isometria (estático)' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','quadrado_lombar','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_lateral','trapezio']::text[]
WHERE left(id::text,8) = '7eee6ba8' AND name = 'Abdução Ombros em pé com super band' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_lateral','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','romboides','lombar']::text[]
WHERE left(id::text,8) = '29f89bb5' AND name = 'Cobra' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','romboides','lombar']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','romboides','deltoide_posterior']::text[]
WHERE left(id::text,8) = '34fd5051' AND name = 'Ext. Diagonal Ombros em pé' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','romboides','deltoide_posterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','romboides','deltoide_posterior']::text[]
WHERE left(id::text,8) = 'd4215484' AND name = 'Ext. Horizontal Ombros decúbito ventral com super band' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','romboides','deltoide_posterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','romboides','deltoide_posterior']::text[]
WHERE left(id::text,8) = '944a593e' AND name = 'Ext. Horizontal Ombros em pé com super band' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','romboides','deltoide_posterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['serratil','trapezio']::text[]
WHERE left(id::text,8) = '8c0e276f' AND name = 'Flexão escapular' AND primary_muscles IS DISTINCT FROM ARRAY['serratil','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','latissimo']::text[]
WHERE left(id::text,8) = 'a7bd1355' AND name = 'Shrug Isométrico Pendurado' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','latissimo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','romboides','deltoide_posterior']::text[]
WHERE left(id::text,8) = 'abbb70d7' AND name = 'Snow Angel Reverso decúbito ventral' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','romboides','deltoide_posterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['antebraco','core']::text[]
WHERE left(id::text,8) = 'eec0d608' AND name = 'Troca de pegada 1 kettlebell' AND primary_muscles IS DISTINCT FROM ARRAY['antebraco','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','romboides','deltoide_posterior']::text[]
WHERE left(id::text,8) = '596e810a' AND name = 'W em decúbito ventral' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','romboides','deltoide_posterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','romboides','deltoide_posterior']::text[]
WHERE left(id::text,8) = 'ba5ad395' AND name = 'Y em decúbito ventral' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','romboides','deltoide_posterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','gluteo_medio']::text[]
WHERE left(id::text,8) = 'cbadda2e' AND name = '4 apoios' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','gluteo_medio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','gluteo']::text[]
WHERE left(id::text,8) = 'a6d7b320' AND name = 'Abdução Quadril unilateral isométrica com Bola' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','gluteo']::text[]
WHERE left(id::text,8) = '0d27ddec' AND name = 'Agachamento unilateral isométrico com super band + glúteo total' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','gluteo']::text[]
WHERE left(id::text,8) = '89b62aa6' AND name = 'Airplane' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '2b8035aa' AND name = 'Glúteo Complex unilateral com medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','gluteo']::text[]
WHERE left(id::text,8) = '9dfd1d27' AND name = 'Monster Walk' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','gluteo']::text[]
WHERE left(id::text,8) = 'e613fc65' AND name = 'Passada lateral com medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = 'c389224c' AND name = 'Ponte' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '38a6efc5' AND name = 'Ponte bilateral joelhos flexionados' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '6bc214da' AND name = 'Ponte bilateral joelhos flexionados com medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo_medio','gluteo']::text[]
WHERE left(id::text,8) = '752b639c' AND name = 'Ponte com Abdução' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo_medio','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '5c432475' AND name = 'Ponte com medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial','gluteo_medio']::text[]
WHERE left(id::text,8) = '4881c86d' AND name = 'Ponte unilateral' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial','gluteo_medio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = 'ee7a0092' AND name = 'Ponte unilateral joelhos flexionados' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = 'ee7a0091' AND name = 'Ponte unilateral com medicine ball' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial']::text[]
WHERE left(id::text,8) = '9c2f5f36' AND name = 'Ponte unilateral com medicine ball joelhos flexionados' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial']::text[];

-- Continue with remaining exercises from combined file
