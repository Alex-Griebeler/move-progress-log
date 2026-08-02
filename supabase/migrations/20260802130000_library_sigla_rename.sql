-- RENAME EM MASSA da biblioteca (dicionario de siglas ratificado 2026-07-14;
-- aplicacao autorizada pelo dono em 2026-08-02 apos o import do Word expor os
-- nomes longos). 303 renames JA APLICADOS em prod via REST (ok=303, fail=0,
-- reconciliacao 0 divergencias); este arquivo e o REGISTRO idempotente.
-- Estrutura: (1) mapa explicito id8+nome (ratificado; guard pelo nome antigo ->
-- no-op apos aplicado); (2) 3 regras do dicionario que ficaram fora do mapa
-- (LMF/ISO/MB), idempotentes por construcao. Links de historico/prescricao sao
-- por ID -> rename nao quebra nada. Familia barra-fixa protegida no mapa.

UPDATE public.exercises_library SET name='ABD inverso c/ SB no solo'
WHERE left(id::text,8)='c06db359' AND name='ABD inverso com super band no solo';
UPDATE public.exercises_library SET name='Abdução dos ombros (DB)'
WHERE left(id::text,8)='e9572027' AND name='Abdução dos ombros (halteres)';
UPDATE public.exercises_library SET name='Abdução Ombros em pé c/ SB'
WHERE left(id::text,8)='7eee6ba8' AND name='Abdução Ombros em pé com super band';
UPDATE public.exercises_library SET name='Afundo búlgaro c/ BB'
WHERE left(id::text,8)='967edff3' AND name='Afundo búlgaro com barra';
UPDATE public.exercises_library SET name='Afundo c/ DB'
WHERE left(id::text,8)='5d5d656c' AND name='Afundo com halteres';
UPDATE public.exercises_library SET name='Agachamento + press (thruster) c/ KB (2 KB)'
WHERE left(id::text,8)='e7d642cf' AND name='Agachamento + press (thruster) com kettlebell (2 kettlebells)';
UPDATE public.exercises_library SET name='Agachamento BB'
WHERE left(id::text,8)='5cbcd1c0' AND name='Agachamento barra';
UPDATE public.exercises_library SET name='Agachamento búlgaro (DB/KB)'
WHERE left(id::text,8)='90811dce' AND name='Agachamento búlgaro (halter/kettlebell)';
UPDATE public.exercises_library SET name='Agachamento com anilha + MEB'
WHERE left(id::text,8)='df97c170' AND name='Agachamento com anilha + medicine ball';
UPDATE public.exercises_library SET name='Agachamento c/ BB'
WHERE left(id::text,8)='5cbf56aa' AND name='Agachamento com barra';
UPDATE public.exercises_library SET name='Agachamento c/ BB (High Bar)'
WHERE left(id::text,8)='70c4349c' AND name='Agachamento com Barra (High Bar)';
UPDATE public.exercises_library SET name='Agachamento Frontal c/ BB'
WHERE left(id::text,8)='cd93905d' AND name='Agachamento Frontal com Barra';
UPDATE public.exercises_library SET name='Agachamento Hack c/ BB'
WHERE left(id::text,8)='0a79969f' AND name='Agachamento Hack com Barra';
UPDATE public.exercises_library SET name='Agachamento lateral MEB'
WHERE left(id::text,8)='4bd0ad5d' AND name='Agachamento lateral Medball';
UPDATE public.exercises_library SET name='Agachamento lateral pos. baixa 2 DB'
WHERE left(id::text,8)='317d65ff' AND name='Agachamento lateral pos. baixa 2 halteres';
UPDATE public.exercises_library SET name='Agachamento lateral pos. Rack 1 KB'
WHERE left(id::text,8)='f5ff335c' AND name='Agachamento lateral pos. Rack 1 kettlebell';
UPDATE public.exercises_library SET name='Agachamento lateral pos. Rack 2 KB'
WHERE left(id::text,8)='45a8b62f' AND name='Agachamento lateral pos. Rack 2 kettlebells';
UPDATE public.exercises_library SET name='Agachamento pos. Rack 1 KB'
WHERE left(id::text,8)='bf783151' AND name='Agachamento pos. Rack 1 kettlebell';
UPDATE public.exercises_library SET name='Agachamento pos. Rack 2 KB'
WHERE left(id::text,8)='762e9fad' AND name='Agachamento pos. Rack 2 kettlebells';
UPDATE public.exercises_library SET name='Agachamento sumô KB/DB'
WHERE left(id::text,8)='30acff4e' AND name='Agachamento sumô kettlebell ou halteres';
UPDATE public.exercises_library SET name='Agachamento taça c/ SB'
WHERE left(id::text,8)='f2d046de' AND name='Agachamento taça com super band';
UPDATE public.exercises_library SET name='Agachamento unilateral caixa 1 halter ou KB contralateral'
WHERE left(id::text,8)='cd2467b5' AND name='Agachamento unilateral caixa 1 halter ou kettlebell contralateral';
UPDATE public.exercises_library SET name='Agachamento unilateral isométrico c/ SB + glúteo total'
WHERE left(id::text,8)='0d27ddec' AND name='Agachamento unilateral isométrico com super band + glúteo total';
UPDATE public.exercises_library SET name='Agachamento unilateral Lacrosse Ball 2 DB'
WHERE left(id::text,8)='aa3714df' AND name='Agachamento unilateral Lacrosse Ball 2 halteres';
UPDATE public.exercises_library SET name='Anti-extensão overhead c/ SB ajoelhado'
WHERE left(id::text,8)='7ac992e8' AND name='Anti-extensão overhead com super band ajoelhado';
UPDATE public.exercises_library SET name='Anti-rotação ajoelhado c/ SB'
WHERE left(id::text,8)='34bbded8' AND name='Anti-rotação ajoelhado com super band';
UPDATE public.exercises_library SET name='Anti-rotação decúbito dorsal c/ SB'
WHERE left(id::text,8)='13a38dc8' AND name='Anti-rotação decúbito dorsal com super band';
UPDATE public.exercises_library SET name='Anti-rotação em pé c/ SB'
WHERE left(id::text,8)='16fd8cdd' AND name='Anti-rotação em pé com super band';
UPDATE public.exercises_library SET name='Anti-rotação SAJ c/ SB'
WHERE left(id::text,8)='0f6c0317' AND name='Anti-rotação semi-ajoelhado com super band';
UPDATE public.exercises_library SET name='Anti-rotação Split c/ SB'
WHERE left(id::text,8)='e7df42e7' AND name='Anti-rotação Split com super band';
UPDATE public.exercises_library SET name='Anti-rotação Squat c/ SB'
WHERE left(id::text,8)='b0617a20' AND name='Anti-rotação Squat com super band';
UPDATE public.exercises_library SET name='Arranco c/ KB'
WHERE left(id::text,8)='0d69aff1' AND name='Arranco com kettlebell';
UPDATE public.exercises_library SET name='Arremesso + press c/ KB (clean & press)'
WHERE left(id::text,8)='5ce9527a' AND name='Arremesso + press com kettlebell (clean & press)';
UPDATE public.exercises_library SET name='Arremesso c/ KB (clean)'
WHERE left(id::text,8)='03f0f096' AND name='Arremesso com kettlebell (clean)';
UPDATE public.exercises_library SET name='Arremesso Lateral Ajoelhado MEB'
WHERE left(id::text,8)='79fbdac0' AND name='Arremesso Lateral Ajoelhado medicine ball';
UPDATE public.exercises_library SET name='Arremesso Lateral em Pé MEB'
WHERE left(id::text,8)='bdbd1e18' AND name='Arremesso Lateral em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso Lateral SAJ MEB'
WHERE left(id::text,8)='e98d534c' AND name='Arremesso Lateral Semi-Ajoelhado medicine ball';
UPDATE public.exercises_library SET name='Arremesso Lateral Split Stance MEB'
WHERE left(id::text,8)='e511b640' AND name='Arremesso Lateral Split Stance medicine ball';
UPDATE public.exercises_library SET name='Arremesso Lateral unilateral em Pé MEB'
WHERE left(id::text,8)='57ec1467' AND name='Arremesso Lateral unilateral em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso Overhead Ajoelhado MEB'
WHERE left(id::text,8)='5e4b36b5' AND name='Arremesso Overhead Ajoelhado medicine ball';
UPDATE public.exercises_library SET name='Arremesso Overhead em Pé MEB'
WHERE left(id::text,8)='fdc9b208' AND name='Arremesso Overhead em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso Overhead SAJ MEB'
WHERE left(id::text,8)='5688ff40' AND name='Arremesso Overhead Semi-Ajoelhado medicine ball';
UPDATE public.exercises_library SET name='Arremesso Overhead Split Stance MEB'
WHERE left(id::text,8)='c17ad83a' AND name='Arremesso Overhead Split Stance medicine ball';
UPDATE public.exercises_library SET name='Arremesso Overhead Supino MEB'
WHERE left(id::text,8)='9b1b2b28' AND name='Arremesso Overhead Supino medicine ball';
UPDATE public.exercises_library SET name='Arremesso Overhead unilateral em Pé MEB'
WHERE left(id::text,8)='c1a11191' AND name='Arremesso Overhead unilateral em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso Peito Ajoelhado MEB'
WHERE left(id::text,8)='f1aecc46' AND name='Arremesso Peito Ajoelhado medicine ball';
UPDATE public.exercises_library SET name='Arremesso Peito em Pé MEB'
WHERE left(id::text,8)='870c2c9a' AND name='Arremesso Peito em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso Peito SAJ MEB'
WHERE left(id::text,8)='bb8a76d6' AND name='Arremesso Peito Semi-Ajoelhado medicine ball';
UPDATE public.exercises_library SET name='Arremesso Peito Split Stance MEB'
WHERE left(id::text,8)='8d8e10d0' AND name='Arremesso Peito Split Stance medicine ball';
UPDATE public.exercises_library SET name='Arremesso Peito Supino MEB'
WHERE left(id::text,8)='366bc7b8' AND name='Arremesso Peito Supino medicine ball';
UPDATE public.exercises_library SET name='Arremesso Peito unilateral em Pé MEB'
WHERE left(id::text,8)='7d4f4392' AND name='Arremesso Peito unilateral em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso Rotacional Ajoelhado MEB'
WHERE left(id::text,8)='6eed3919' AND name='Arremesso Rotacional Ajoelhado medicine ball';
UPDATE public.exercises_library SET name='Arremesso Rotacional com Step unilateral MEB'
WHERE left(id::text,8)='2893ec29' AND name='Arremesso Rotacional com Step unilateral medicine ball';
UPDATE public.exercises_library SET name='Arremesso Rotacional em Pé MEB'
WHERE left(id::text,8)='df66a000' AND name='Arremesso Rotacional em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso Rotacional SAJ MEB'
WHERE left(id::text,8)='d54274a7' AND name='Arremesso Rotacional Semi-Ajoelhado medicine ball';
UPDATE public.exercises_library SET name='Arremesso Rotacional Split Stance MEB'
WHERE left(id::text,8)='fb3cd067' AND name='Arremesso Rotacional Split Stance medicine ball';
UPDATE public.exercises_library SET name='Arremesso Rotacional Supino MEB'
WHERE left(id::text,8)='af63bd80' AND name='Arremesso Rotacional Supino medicine ball';
UPDATE public.exercises_library SET name='Arremesso Rotacional unilateral em Pé MEB'
WHERE left(id::text,8)='349f8d07' AND name='Arremesso Rotacional unilateral em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso Scoop em Pé MEB'
WHERE left(id::text,8)='816d50ce' AND name='Arremesso Scoop em Pé medicine ball';
UPDATE public.exercises_library SET name='Arremesso vertical MEB'
WHERE left(id::text,8)='bb67d385' AND name='Arremesso vertical medball';
UPDATE public.exercises_library SET name='Avanço SAJ em flexão plantar'
WHERE left(id::text,8)='b71a3137' AND name='Avanço semi-ajoelhado em flexão plantar';
UPDATE public.exercises_library SET name='Avanço SAJ em flexão plantar c/ SB'
WHERE left(id::text,8)='5ad6d8ac' AND name='Avanço semi-ajoelhado em flexão plantar com super band';
UPDATE public.exercises_library SET name='Barra EXC'
WHERE left(id::text,8)='d383e154' AND name='Barra ECC';
UPDATE public.exercises_library SET name='Barra supinada com auxílio SB'
WHERE left(id::text,8)='bf7aa15e' AND name='Barra supinada com auxílio super band';
UPDATE public.exercises_library SET name='Bom dia c/ BB'
WHERE left(id::text,8)='cbdb1aa0' AND name='Bom dia com barra';
UPDATE public.exercises_library SET name='Bulgarian Split Squat c/ BB'
WHERE left(id::text,8)='dc1b3617' AND name='Bulgarian Split Squat com barra';
UPDATE public.exercises_library SET name='Bulgarian Split Squat c/ DB'
WHERE left(id::text,8)='ba87c9e0' AND name='Bulgarian Split Squat com halteres';
UPDATE public.exercises_library SET name='Carregamento ajoelhado pos. Rack 1 KB ou halter'
WHERE left(id::text,8)='fff3e9ce' AND name='Carregamento ajoelhado pos. Rack 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Carregamento ajoelhado pos. Rack 2 KB/DB'
WHERE left(id::text,8)='02530f42' AND name='Carregamento ajoelhado pos. Rack 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Carregamento pos. baixa 1 KB ou halter'
WHERE left(id::text,8)='f27ca15f' AND name='Carregamento pos. baixa 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Carregamento pos. baixa 2 KB/DB'
WHERE left(id::text,8)='3ef9d684' AND name='Carregamento pos. baixa 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Carregamento pos. baixa bilateral PL'
WHERE left(id::text,8)='2f0e329a' AND name='Carregamento pos. baixa bilateral G7';
UPDATE public.exercises_library SET name='Carregamento pos. baixa unilateral PL'
WHERE left(id::text,8)='5e10d747' AND name='Carregamento pos. baixa unilateral G7';
UPDATE public.exercises_library SET name='Carregamento pos. Rack 1 KB ou halter'
WHERE left(id::text,8)='93398ee1' AND name='Carregamento pos. Rack 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Carregamento pos. Rack 2 KB/DB'
WHERE left(id::text,8)='7e4a50de' AND name='Carregamento pos. Rack 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Carregamento SAJ pos. Rack 1 KB ou halter'
WHERE left(id::text,8)='97b0c375' AND name='Carregamento semi-ajoelhado pos. Rack 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Carregamento SAJ pos. Rack 2 KB/DB'
WHERE left(id::text,8)='e054e6df' AND name='Carregamento semi-ajoelhado pos. Rack 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Carregamento Taça KB/DB'
WHERE left(id::text,8)='3ec0c45d' AND name='Carregamento Taça kettlebell ou halteres';
UPDATE public.exercises_library SET name='Chop SAJ'
WHERE left(id::text,8)='3e64103b' AND name='Chop semi-ajoelhado';
UPDATE public.exercises_library SET name='Clam Shell c/ MEB'
WHERE left(id::text,8)='7c958f71' AND name='Clam Shell com medicine ball';
UPDATE public.exercises_library SET name='Complexo c/ KB (Swing+Clean+Press)'
WHERE left(id::text,8)='58ec8cff' AND name='Complexo com kettlebell (Swing+Clean+Press)';
UPDATE public.exercises_library SET name='Deadlift c/ 1 KB ou halter'
WHERE left(id::text,8)='7cd5aadf' AND name='Deadlift com 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Deadlift c/ BB'
WHERE left(id::text,8)='498bf13d' AND name='Deadlift com barra';
UPDATE public.exercises_library SET name='Deadlift c/ SB'
WHERE left(id::text,8)='0a1e3b57' AND name='Deadlift com super band';
UPDATE public.exercises_library SET name='Deadlift c/ SB na cintura (técnica)'
WHERE left(id::text,8)='774d3e0d' AND name='Deadlift com super band na cintura (técnica)';
UPDATE public.exercises_library SET name='Deadlift KB'
WHERE left(id::text,8)='b7fc4c28' AND name='Deadlift kettlebell';
UPDATE public.exercises_library SET name='Deadlift Sumô 1 KB ou halter'
WHERE left(id::text,8)='c1c730b4' AND name='Deadlift Sumô 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Deadlift Sumô BB'
WHERE left(id::text,8)='519aaecb' AND name='Deadlift Sumô barra';
UPDATE public.exercises_library SET name='Deadlift unilateral (pé de trás elevado) 2 KB/DB'
WHERE left(id::text,8)='70e980e3' AND name='Deadlift unilateral (pé de trás elevado) 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Deadlift unilateral 1/2 apoio 2 KB/DB'
WHERE left(id::text,8)='48fed8c1' AND name='Deadlift unilateral 1/2 apoio 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Deadlift unilateral 1/2 apoio KB/DB'
WHERE left(id::text,8)='90a0f5af' AND name='Deadlift unilateral 1/2 apoio kettlebell ou halteres';
UPDATE public.exercises_library SET name='Deadlift unilateral auxílio argola 2 KB/DB'
WHERE left(id::text,8)='f49f2f03' AND name='Deadlift unilateral auxílio argola 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Deadlift unilateral c/ BB'
WHERE left(id::text,8)='308e2c64' AND name='Deadlift unilateral com barra';
UPDATE public.exercises_library SET name='Deadlift unilateral c/ SB'
WHERE left(id::text,8)='dec61d98' AND name='Deadlift unilateral com super band';
UPDATE public.exercises_library SET name='Deadlift unilateral pé de trás elevado c/ 1 KB ou halter'
WHERE left(id::text,8)='f84f4327' AND name='Deadlift unilateral pé de trás elevado com 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Deadlift unilateral pés no chão 1 KB ou halter'
WHERE left(id::text,8)='32776ec9' AND name='Deadlift unilateral pés no chão 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Deadlift unilateral pés no chão 2 KB/DB'
WHERE left(id::text,8)='71e37919' AND name='Deadlift unilateral pés no chão 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Deadlift unilateral s/ apoio 1 KB ou halter'
WHERE left(id::text,8)='0ba26bbb' AND name='Deadlift unilateral s/ apoio 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Deadlift unilateral s/apoio 2 KB/DB'
WHERE left(id::text,8)='331228d2' AND name='Deadlift unilateral s/apoio 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Desenvolvimento c/ DB'
WHERE left(id::text,8)='ed2e1259' AND name='Desenvolvimento com Halteres';
UPDATE public.exercises_library SET name='Desenvolvimento militar BB'
WHERE left(id::text,8)='cfe1e2ba' AND name='Desenvolvimento militar barra';
UPDATE public.exercises_library SET name='Desenvolvimento SAJ'
WHERE left(id::text,8)='00ea1227' AND name='Desenvolvimento semi-ajoelhado';
UPDATE public.exercises_library SET name='Elevação de quadril (hip thrust) c/ BB'
WHERE left(id::text,8)='8b99450b' AND name='Elevação de quadril (hip thrust) com barra';
UPDATE public.exercises_library SET name='Elevação de quadril (hip thrust) c/ KB'
WHERE left(id::text,8)='75f0b902' AND name='Elevação de quadril (hip thrust) com Kettlebell';
UPDATE public.exercises_library SET name='Ext. Horizontal Ombros decúbito ventral c/ SB'
WHERE left(id::text,8)='d4215484' AND name='Ext. Horizontal Ombros decúbito ventral com super band';
UPDATE public.exercises_library SET name='Ext. Horizontal Ombros em pé c/ SB'
WHERE left(id::text,8)='944a593e' AND name='Ext. Horizontal Ombros em pé com super band';
UPDATE public.exercises_library SET name='Extensão torácica BB'
WHERE left(id::text,8)='782a987d' AND name='Extensão torácica barra';
UPDATE public.exercises_library SET name='Face Pull c/ SB'
WHERE left(id::text,8)='d1a79d46' AND name='Face Pull com super band';
UPDATE public.exercises_library SET name='Figura 8 c/ KB'
WHERE left(id::text,8)='b423cc83' AND name='Figura 8 com kettlebell';
UPDATE public.exercises_library SET name='Flex-Ext Quadril decúbito dorsal c/ MEB'
WHERE left(id::text,8)='07fdea96' AND name='Flex-Ext Quadril decúbito dorsal com medicine ball';
UPDATE public.exercises_library SET name='Flexão de braços c/ SB'
WHERE left(id::text,8)='a6aa5844' AND name='Flexão de braços com super band';
UPDATE public.exercises_library SET name='Flexão EXC dos joelhos no Slide'
WHERE left(id::text,8)='7a0b34ac' AND name='Flexão ECC dos joelhos no Slide';
UPDATE public.exercises_library SET name='Flexão Nórdica EXC'
WHERE left(id::text,8)='44ec9249' AND name='Flexão Nórdica ECC';
UPDATE public.exercises_library SET name='Flexão Nórdica EXC + CC'
WHERE left(id::text,8)='9e444a6a' AND name='Flexão Nórdica ECC + CC';
UPDATE public.exercises_library SET name='Flexão Nórdica EXC com auxílio SB'
WHERE left(id::text,8)='049d2ebf' AND name='Flexão Nórdica ECC com auxílio super band';
UPDATE public.exercises_library SET name='Flexão Plantar c/ SB (Fibulares)'
WHERE left(id::text,8)='77c77efa' AND name='Flexão Plantar com super band (Fibulares)';
UPDATE public.exercises_library SET name='Flexão Quadril unilateral decúbito dorsal c/ SB'
WHERE left(id::text,8)='ff7e7275' AND name='Flexão Quadril unilateral decúbito dorsal com super band';
UPDATE public.exercises_library SET name='Flexão Quadril unilateral PL'
WHERE left(id::text,8)='41ef58c0' AND name='Flexão Quadril unilateral G7';
UPDATE public.exercises_library SET name='Flexores do quadril SAJ'
WHERE left(id::text,8)='724cd8bb' AND name='Flexores do quadril semi-ajoelhado';
UPDATE public.exercises_library SET name='Floor Press c/ BB'
WHERE left(id::text,8)='fbbd5fc1' AND name='Floor Press com barra';
UPDATE public.exercises_library SET name='Floor Press c/ DB'
WHERE left(id::text,8)='08ffcf32' AND name='Floor Press com halteres';
UPDATE public.exercises_library SET name='Glúteo Complex unilateral c/ MEB'
WHERE left(id::text,8)='2b8035aa' AND name='Glúteo Complex unilateral com medicine ball';
UPDATE public.exercises_library SET name='Good Morning c/ BB'
WHERE left(id::text,8)='b54334ba' AND name='Good Morning com Barra';
UPDATE public.exercises_library SET name='Hip hinge + ativação escapular c/ SB'
WHERE left(id::text,8)='0937f27c' AND name='Hip hinge + ativação escapular com super band';
UPDATE public.exercises_library SET name='Hip Thrust BB'
WHERE left(id::text,8)='4de52a02' AND name='Hip Thrust barra';
UPDATE public.exercises_library SET name='Hip Thrust BB com banda elástica'
WHERE left(id::text,8)='b6b834c8' AND name='Hip Thrust barra com banda elástica';
UPDATE public.exercises_library SET name='Hip thrust c/ MEB'
WHERE left(id::text,8)='36254b7c' AND name='Hip thrust com medicine ball';
UPDATE public.exercises_library SET name='Hip thrust c/ SB'
WHERE left(id::text,8)='a9bca4c5' AND name='Hip thrust com super band';
UPDATE public.exercises_library SET name='Hip thrust unilateral c/ SB'
WHERE left(id::text,8)='ff90d303' AND name='Hip thrust unilateral com super band';
UPDATE public.exercises_library SET name='KB swing americano'
WHERE left(id::text,8)='f30b1732' AND name='Kettlebell swing americano';
UPDATE public.exercises_library SET name='KB swing diagonal base assimétrica'
WHERE left(id::text,8)='0b744894' AND name='Kettlebell swing diagonal base assimétrica';
UPDATE public.exercises_library SET name='KB swing russo'
WHERE left(id::text,8)='f58dbc7b' AND name='Kettlebell swing russo';
UPDATE public.exercises_library SET name='Landmine press SAJ'
WHERE left(id::text,8)='8c4650c9' AND name='Landmine press semi-ajoelhado';
UPDATE public.exercises_library SET name='Lateral elevação c/ DB'
WHERE left(id::text,8)='b36b52e6' AND name='Lateral elevação com halteres';
UPDATE public.exercises_library SET name='Levantamento terra (BB) — convencional'
WHERE left(id::text,8)='0b8727e0' AND name='Levantamento terra (barra) — convencional';
UPDATE public.exercises_library SET name='Levantamento terra (BB) — sumô'
WHERE left(id::text,8)='9b5f74ca' AND name='Levantamento terra (barra) — sumô';
UPDATE public.exercises_library SET name='Levantamento terra romeno (RDL) c/ BB'
WHERE left(id::text,8)='76a41eb4' AND name='Levantamento terra romeno (RDL) com barra';
UPDATE public.exercises_library SET name='Levantamento terra romeno (RDL) c/ DB'
WHERE left(id::text,8)='2fb886d1' AND name='Levantamento terra romeno (RDL) com halteres';
UPDATE public.exercises_library SET name='Levantamento terra Romeno c/ KB'
WHERE left(id::text,8)='cde87dd7' AND name='Levantamento terra Romeno com Kettlebell';
UPDATE public.exercises_library SET name='Lift SAJ'
WHERE left(id::text,8)='4751c8c8' AND name='Lift semi-ajoelhado';
UPDATE public.exercises_library SET name='Loaded Alongamento (flexor de quadril c/ KB)'
WHERE left(id::text,8)='8e5dde49' AND name='Loaded Alongamento (flexor de quadril com kettlebell)';
UPDATE public.exercises_library SET name='Loaded Hip Alongamento (KB)'
WHERE left(id::text,8)='ba1e1fa1' AND name='Loaded Hip Alongamento (kettlebell)';
UPDATE public.exercises_library SET name='Lunge a frente 1 halter ou KB'
WHERE left(id::text,8)='74c19d99' AND name='Lunge a frente 1 halter ou kettlebell';
UPDATE public.exercises_library SET name='Lunge a frente 2 DB/KB'
WHERE left(id::text,8)='439ee668' AND name='Lunge a frente 2 halteres ou kettlebells';
UPDATE public.exercises_library SET name='Lunge à frente c/ DB'
WHERE left(id::text,8)='3bce4404' AND name='Lunge à frente com halteres';
UPDATE public.exercises_library SET name='Lunge a frente pos. Rack 2 KB'
WHERE left(id::text,8)='e73f3dcb' AND name='Lunge a frente pos. Rack 2 kettlebells';
UPDATE public.exercises_library SET name='Lunge c/ BB (Costas)'
WHERE left(id::text,8)='2fa2396b' AND name='Lunge com barra (Costas)';
UPDATE public.exercises_library SET name='Lunge Lateral 1 KB ou halter slide board'
WHERE left(id::text,8)='adef6c58' AND name='Lunge Lateral 1 kettlebell ou halter slide board';
UPDATE public.exercises_library SET name='Lunge Lateral 2 KB/DB slide board'
WHERE left(id::text,8)='6d8563c0' AND name='Lunge Lateral 2 kettlebells ou halteres slide board';
UPDATE public.exercises_library SET name='Lunge Lateral c/ KB'
WHERE left(id::text,8)='6f31c8c9' AND name='Lunge Lateral com Kettlebell';
UPDATE public.exercises_library SET name='Lunge Lateral pos. Rack 1 KB ou halter slide board'
WHERE left(id::text,8)='fba018e9' AND name='Lunge Lateral pos. Rack 1 kettlebell ou halter slide board';
UPDATE public.exercises_library SET name='Lunge Lateral pos. Rack 2 KB/DB slide board'
WHERE left(id::text,8)='777250ca' AND name='Lunge Lateral pos. Rack 2 kettlebells ou halteres slide board';
UPDATE public.exercises_library SET name='Lunge Reverso 1 KB ou halter slide board'
WHERE left(id::text,8)='09b2dce6' AND name='Lunge Reverso 1 kettlebell ou halter slide board';
UPDATE public.exercises_library SET name='Lunge Reverso 2 KB/DB slide board'
WHERE left(id::text,8)='6e153492' AND name='Lunge Reverso 2 kettlebells ou halteres slide board';
UPDATE public.exercises_library SET name='Lunge reverso c/ DB'
WHERE left(id::text,8)='c8ba70fb' AND name='Lunge reverso com halteres';
UPDATE public.exercises_library SET name='Lunge Reverso pos. Rack 1 KB ou halter slide board'
WHERE left(id::text,8)='4edfe39f' AND name='Lunge Reverso pos. Rack 1 kettlebell ou halter slide board';
UPDATE public.exercises_library SET name='Lunge Reverso pos. Rack 2 KB/DB slide board'
WHERE left(id::text,8)='9e41c61f' AND name='Lunge Reverso pos. Rack 2 kettlebells ou halteres slide board';
UPDATE public.exercises_library SET name='Marcha c/ SB diagonal baixa'
WHERE left(id::text,8)='cbd2154c' AND name='Marcha com super band diagonal baixa';
UPDATE public.exercises_library SET name='Overhead Press c/ BB'
WHERE left(id::text,8)='45f95310' AND name='Overhead Press com barra';
UPDATE public.exercises_library SET name='Overhead Press c/ DB'
WHERE left(id::text,8)='f7cfb116' AND name='Overhead Press com halteres';
UPDATE public.exercises_library SET name='Overhead squat c/ SB'
WHERE left(id::text,8)='b5e8967b' AND name='Overhead squat com super band';
UPDATE public.exercises_library SET name='Passada lateral c/ MEB'
WHERE left(id::text,8)='e613fc65' AND name='Passada lateral com medicine ball';
UPDATE public.exercises_library SET name='Passe de peito com passada MEB'
WHERE left(id::text,8)='c70b140f' AND name='Passe de peito com passada medball';
UPDATE public.exercises_library SET name='Ponte + ext. ombro c/ SB'
WHERE left(id::text,8)='9f89da9a' AND name='Ponte + ext. ombro com super band';
UPDATE public.exercises_library SET name='Ponte bilateral joelhos flexionados c/ MEB'
WHERE left(id::text,8)='6bc214da' AND name='Ponte bilateral joelhos flexionados com medicine ball';
UPDATE public.exercises_library SET name='Ponte c/ MEB'
WHERE left(id::text,8)='5c432475' AND name='Ponte com medicine ball';
UPDATE public.exercises_library SET name='Ponte dinâmica c/ MEB'
WHERE left(id::text,8)='69e19c16' AND name='Ponte dinâmica com medicine ball';
UPDATE public.exercises_library SET name='Prancha Alta com Remada SB'
WHERE left(id::text,8)='80b56744' AND name='Prancha Alta com Remada super band';
UPDATE public.exercises_library SET name='Prancha lateral ajoelhado c/ MEB'
WHERE left(id::text,8)='45649cd9' AND name='Prancha lateral ajoelhado com medicine ball';
UPDATE public.exercises_library SET name='Prancha Lateral com Remada SB'
WHERE left(id::text,8)='c3609d6b' AND name='Prancha Lateral com Remada super band';
UPDATE public.exercises_library SET name='Press Landmine SAJ'
WHERE left(id::text,8)='65eb24db' AND name='Press Landmine semi-ajoelhado';
UPDATE public.exercises_library SET name='Press unilateral Landmine SAJ'
WHERE left(id::text,8)='2ae01f97' AND name='Press unilateral Landmine semi-ajoelhado';
UPDATE public.exercises_library SET name='Press unilateral SAJ'
WHERE left(id::text,8)='2473243b' AND name='Press unilateral semi-ajoelhado';
UPDATE public.exercises_library SET name='Press vertical alternado 2 KB/DB'
WHERE left(id::text,8)='6c4f5516' AND name='Press vertical alternado 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Press vertical alternado 2 KB/DB ajoelhado'
WHERE left(id::text,8)='fd22c3ea' AND name='Press vertical alternado 2 kettlebells ou halteres ajoelhado';
UPDATE public.exercises_library SET name='Press vertical alternado 2 KB/DB SAJ'
WHERE left(id::text,8)='0a7ccdcd' AND name='Press vertical alternado 2 kettlebells ou halteres semi-ajoelhado';
UPDATE public.exercises_library SET name='Press Vertical alternado 2 KB/DB sentado'
WHERE left(id::text,8)='e58b74e8' AND name='Press Vertical alternado 2 kettlebells ou halteres sentado';
UPDATE public.exercises_library SET name='Press vertical BB'
WHERE left(id::text,8)='3ad34341' AND name='Press vertical barra';
UPDATE public.exercises_library SET name='Press vertical c/ SB'
WHERE left(id::text,8)='f6e67a0a' AND name='Press vertical com super band';
UPDATE public.exercises_library SET name='Press Vertical sentado BB'
WHERE left(id::text,8)='f8259ff6' AND name='Press Vertical sentado barra';
UPDATE public.exercises_library SET name='Press vertical unilateral 1 KB ou halter'
WHERE left(id::text,8)='94869816' AND name='Press vertical unilateral 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Press vertical unilateral 1 KB ou halter (pé da frente elevado)'
WHERE left(id::text,8)='ff465f5f' AND name='Press vertical unilateral 1 kettlebell ou halter (pé da frente elevado)';
UPDATE public.exercises_library SET name='Press vertical unilateral 1 KB ou halter ajoelhado'
WHERE left(id::text,8)='bb018b54' AND name='Press vertical unilateral 1 kettlebell ou halter ajoelhado';
UPDATE public.exercises_library SET name='Press vertical unilateral 1 KB ou halter SAJ'
WHERE left(id::text,8)='ef04ac0f' AND name='Press vertical unilateral 1 kettlebell ou halter semi-ajoelhado';
UPDATE public.exercises_library SET name='Press Vertical unilateral 1 KB ou halter sentado'
WHERE left(id::text,8)='5eb16e6e' AND name='Press Vertical unilateral 1 kettlebell ou halter sentado';
UPDATE public.exercises_library SET name='Press vertical unilateral c/ SB'
WHERE left(id::text,8)='f8c66862' AND name='Press vertical unilateral com super band';
UPDATE public.exercises_library SET name='Press vertical unilateral SAJ'
WHERE left(id::text,8)='e0727d20' AND name='Press vertical unilateral semi-ajoelhado';
UPDATE public.exercises_library SET name='Push press (DB/KB)'
WHERE left(id::text,8)='17a99d0c' AND name='Push press (halter/kettlebell)';
UPDATE public.exercises_library SET name='Push Press 1 KB ou halter'
WHERE left(id::text,8)='debb7563' AND name='Push Press 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Push Press 2 KB/DB'
WHERE left(id::text,8)='ff2855f3' AND name='Push Press 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Push Press BB'
WHERE left(id::text,8)='2e084fe5' AND name='Push Press barra';
UPDATE public.exercises_library SET name='Push Press c/ BB'
WHERE left(id::text,8)='7d7c2fcc' AND name='Push Press com barra';
UPDATE public.exercises_library SET name='Puxada alta c/ KB'
WHERE left(id::text,8)='64e889a5' AND name='Puxada alta com kettlebell';
UPDATE public.exercises_library SET name='Puxada cruzada polia alta SAJ'
WHERE left(id::text,8)='3a6871cd' AND name='Puxada cruzada polia alta semi-ajoelhado';
UPDATE public.exercises_library SET name='Puxada unilateral polia alta SAJ'
WHERE left(id::text,8)='e6796ca7' AND name='Puxada unilateral polia alta semi-ajoelhado';
UPDATE public.exercises_library SET name='Puxada unilateral SAJ na polia'
WHERE left(id::text,8)='5b53334c' AND name='Puxada unilateral semi-ajoelhado na polia';
UPDATE public.exercises_library SET name='Puxada vertical c/ SB'
WHERE left(id::text,8)='bcfda568' AND name='Puxada vertical com super band';
UPDATE public.exercises_library SET name='Puxar/Empurrar SAJ'
WHERE left(id::text,8)='b56396a1' AND name='Puxar/Empurrar semi-ajoelhado';
UPDATE public.exercises_library SET name='RDL (romeno) — BB'
WHERE left(id::text,8)='bf2ef5db' AND name='RDL (romeno) — barra';
UPDATE public.exercises_library SET name='RDL (romeno) — KB/halter'
WHERE left(id::text,8)='ed337fda' AND name='RDL (romeno) — kettlebell/halter';
UPDATE public.exercises_library SET name='RDL base assimétrica (DB/KB)'
WHERE left(id::text,8)='2b73e8e4' AND name='RDL base assimétrica (halter/kettlebell)';
UPDATE public.exercises_library SET name='RDL c/ BB'
WHERE left(id::text,8)='cd2c5c8b' AND name='RDL com barra';
UPDATE public.exercises_library SET name='RDL c/ SB'
WHERE left(id::text,8)='3563c2f3' AND name='RDL com super band';
UPDATE public.exercises_library SET name='RDL KB duplo no step'
WHERE left(id::text,8)='e4fc0b96' AND name='RDL kettlebell duplo no step';
UPDATE public.exercises_library SET name='Hip hinge PTE (RDL)'
WHERE left(id::text,8)='126ffc6e' AND name='Rear Foot Elevated Hip Hinge (RFE-RDL)';
UPDATE public.exercises_library SET name='Remada ajoelhado PL'
WHERE left(id::text,8)='975e1c64' AND name='Remada ajoelhado G7';
UPDATE public.exercises_library SET name='Remada ajoelhado unilateral PL'
WHERE left(id::text,8)='fe22e5ab' AND name='Remada ajoelhado unilateral G7';
UPDATE public.exercises_library SET name='Remada alta 2 KB/DB'
WHERE left(id::text,8)='b657bf07' AND name='Remada alta 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Remada alta BB'
WHERE left(id::text,8)='19da90cf' AND name='Remada alta barra';
UPDATE public.exercises_library SET name='Remada alta c/ SB'
WHERE left(id::text,8)='fffb723a' AND name='Remada alta com super band';
UPDATE public.exercises_library SET name='Remada bilateral c/ SB'
WHERE left(id::text,8)='df8eb952' AND name='Remada bilateral com super band';
UPDATE public.exercises_library SET name='Remada bilateral DB/KB'
WHERE left(id::text,8)='feb3eca3' AND name='Remada bilateral halteres ou kettlebell';
UPDATE public.exercises_library SET name='Remada com apoio no banco 2 KB/DB'
WHERE left(id::text,8)='8bde429e' AND name='Remada com apoio no banco 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Remada curvada 2 KB/DB'
WHERE left(id::text,8)='1d94266c' AND name='Remada curvada 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Remada curvada BB'
WHERE left(id::text,8)='b0acb02c' AND name='Remada curvada barra';
UPDATE public.exercises_library SET name='Remada curvada c/ SB'
WHERE left(id::text,8)='f1ffb62e' AND name='Remada curvada com super band';
UPDATE public.exercises_library SET name='Remada curvada unilateral 1 KB'
WHERE left(id::text,8)='9eecd304' AND name='Remada curvada unilateral 1 kettlebell';
UPDATE public.exercises_library SET name='Remada curvada unilateral 1 KB (pé de trás elevado)'
WHERE left(id::text,8)='a5ea618f' AND name='Remada curvada unilateral 1 kettlebell (pé de trás elevado)';
UPDATE public.exercises_library SET name='Remada em pé c/ SB'
WHERE left(id::text,8)='3af5f428' AND name='Remada em pé com super band';
UPDATE public.exercises_library SET name='Remada em pé c/ SB (potência)'
WHERE left(id::text,8)='79c91d21' AND name='Remada em pé com super band (potência)';
UPDATE public.exercises_library SET name='Remada SAJ PL'
WHERE left(id::text,8)='042af27e' AND name='Remada semi-ajoelhado G7';
UPDATE public.exercises_library SET name='Remada SAJ na polia'
WHERE left(id::text,8)='f7bba51b' AND name='Remada semi-ajoelhado na polia';
UPDATE public.exercises_library SET name='Remada SAJ unilateral PL'
WHERE left(id::text,8)='26722d42' AND name='Remada semi-ajoelhado unilateral G7';
UPDATE public.exercises_library SET name='Remada serrote no banco 1 KB ou halter'
WHERE left(id::text,8)='3bdf9aff' AND name='Remada serrote no banco 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Remada unilateral curvada com apoio 1 KB ou halter'
WHERE left(id::text,8)='7090353f' AND name='Remada unilateral curvada com apoio 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Remada unilateral curvado 1 KB ou halter'
WHERE left(id::text,8)='560ea30b' AND name='Remada unilateral curvado 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Remada unilateral em pé c/ SB'
WHERE left(id::text,8)='187ec2c0' AND name='Remada unilateral em pé com super band';
UPDATE public.exercises_library SET name='Remada unilateral DB/KB com apoio da mão'
WHERE left(id::text,8)='77c91be7' AND name='Remada unilateral halteres ou kettlebell com apoio da mão';
UPDATE public.exercises_library SET name='Remada unilateral na argola + KB contralateral'
WHERE left(id::text,8)='a0c2ddf0' AND name='Remada unilateral na argola + kettlebell contralateral';
UPDATE public.exercises_library SET name='Remada unilateral SAJ DB/KB'
WHERE left(id::text,8)='f60d8f09' AND name='Remada unilateral semi-ajoelhado halteres ou kettlebell';
UPDATE public.exercises_library SET name='Remada unilateral SAJ na polia'
WHERE left(id::text,8)='d289b413' AND name='Remada unilateral semi-ajoelhado na polia';
UPDATE public.exercises_library SET name='Rosca bíceps direta banco 45º (DB)'
WHERE left(id::text,8)='f8a93757' AND name='Rosca bíceps direta banco 45º (halteres)';
UPDATE public.exercises_library SET name='Rosca Direta c/ BB'
WHERE left(id::text,8)='1204155b' AND name='Rosca Direta com Barra';
UPDATE public.exercises_library SET name='Rosca tríceps testa c/ DB'
WHERE left(id::text,8)='301c9dcf' AND name='Rosca tríceps testa com halteres';
UPDATE public.exercises_library SET name='Rotação torácica SAJ'
WHERE left(id::text,8)='5edd7407' AND name='Rotação torácica semi-ajoelhado';
UPDATE public.exercises_library SET name='Rotação torácica SAJ com rolo'
WHERE left(id::text,8)='18e38179' AND name='Rotação torácica semi-ajoelhado com rolo';
UPDATE public.exercises_library SET name='Salto unilateral lateral alternado c/ MEB'
WHERE left(id::text,8)='39833723' AND name='Salto unilateral lateral alternado com medball';
UPDATE public.exercises_library SET name='Shuffle c/ MEB'
WHERE left(id::text,8)='62fb71f0' AND name='Shuffle com medicine ball';
UPDATE public.exercises_library SET name='Shuffle c/ MEB + mudança de direção'
WHERE left(id::text,8)='21751bbf' AND name='Shuffle com medicine ball + mudança de direção';
UPDATE public.exercises_library SET name='Shuffle c/ SB lateral + mudança de direção'
WHERE left(id::text,8)='55c8c206' AND name='Shuffle com super band lateral + mudança de direção';
UPDATE public.exercises_library SET name='Single Leg RDL c/ 2 DB'
WHERE left(id::text,8)='28a0555f' AND name='Single Leg RDL com 2 Halteres';
UPDATE public.exercises_library SET name='Single Leg RDL c/ BB'
WHERE left(id::text,8)='49baa137' AND name='Single Leg RDL com Barra';
UPDATE public.exercises_library SET name='Single Leg Swing c/ KB'
WHERE left(id::text,8)='2716450b' AND name='Single Leg Swing com kettlebell';
UPDATE public.exercises_library SET name='Skipe na parede c/ SB diagonal baixa (cintura)'
WHERE left(id::text,8)='d7e7d181' AND name='Skipe na parede com super band diagonal baixa (cintura)';
UPDATE public.exercises_library SET name='Skipe na parede c/ SB no pé'
WHERE left(id::text,8)='3686ede2' AND name='Skipe na parede com super band no pé';
UPDATE public.exercises_library SET name='Slam MEB'
WHERE left(id::text,8)='455480b6' AND name='Slam medball';
UPDATE public.exercises_library SET name='Split Squat 2 DB/KB'
WHERE left(id::text,8)='0077db55' AND name='Split Squat 2 halteres ou kettlebells';
UPDATE public.exercises_library SET name='Split squat c/ BB'
WHERE left(id::text,8)='c8302acb' AND name='Split squat com barra';
UPDATE public.exercises_library SET name='Step Up c/ BB'
WHERE left(id::text,8)='28472bee' AND name='Step Up com Barra';
UPDATE public.exercises_library SET name='Step Up c/ DB'
WHERE left(id::text,8)='22b22203' AND name='Step Up com Halteres';
UPDATE public.exercises_library SET name='Stiff c/ DB'
WHERE left(id::text,8)='36e51cb6' AND name='Stiff com halteres';
UPDATE public.exercises_library SET name='Supino declinado c/ DB'
WHERE left(id::text,8)='0bb4aad2' AND name='Supino declinado com halteres';
UPDATE public.exercises_library SET name='Supino em pé PL'
WHERE left(id::text,8)='914e7525' AND name='Supino em pé G7';
UPDATE public.exercises_library SET name='Supino em ponte 1 KB ou halter'
WHERE left(id::text,8)='9b40917a' AND name='Supino em ponte 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Supino em ponte 2 KB/DB'
WHERE left(id::text,8)='cb3e5f75' AND name='Supino em ponte 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Supino inclinado c/ DB'
WHERE left(id::text,8)='2354953c' AND name='Supino inclinado com halteres';
UPDATE public.exercises_library SET name='Supino reto c/ BB'
WHERE left(id::text,8)='a57160c9' AND name='Supino reto com barra';
UPDATE public.exercises_library SET name='Supino reto c/ DB'
WHERE left(id::text,8)='199b3191' AND name='Supino reto com halteres';
UPDATE public.exercises_library SET name='Supino reto c/ DB alternado'
WHERE left(id::text,8)='cc6fa219' AND name='Supino reto com halteres alternado';
UPDATE public.exercises_library SET name='Supino reto em ponte 2 KB/DB'
WHERE left(id::text,8)='dcf78334' AND name='Supino reto em ponte 2 kettlebells ou halteres';
UPDATE public.exercises_library SET name='Supino reto unilateral em ponte 1 KB ou halter'
WHERE left(id::text,8)='fd493de2' AND name='Supino reto unilateral em ponte 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Supino reto unilateral no solo 1 KB ou halter'
WHERE left(id::text,8)='96e5f61c' AND name='Supino reto unilateral no solo 1 kettlebell ou halter';
UPDATE public.exercises_library SET name='Supino unilateral na polia SAJ'
WHERE left(id::text,8)='72a62e2e' AND name='Supino unilateral na polia semi-ajoelhado';
UPDATE public.exercises_library SET name='TGU c/ KB'
WHERE left(id::text,8)='f5edb52d' AND name='TGU com kettlebell';
UPDATE public.exercises_library SET name='Troca de pegada 1 KB'
WHERE left(id::text,8)='eec0d608' AND name='Troca de pegada 1 kettlebell';
UPDATE public.exercises_library SET name='Walking Lunge c/ DB'
WHERE left(id::text,8)='4dd55b6b' AND name='Walking Lunge com halteres';
UPDATE public.exercises_library SET name='Windmill c/ KB em pé'
WHERE left(id::text,8)='bf044356' AND name='Windmill com kettlebell em pé';
UPDATE public.exercises_library SET name='Windmill KB'
WHERE left(id::text,8)='f2eb2e28' AND name='Windmill kettlebell';

-- ===== Regras do dicionario ausentes do mapa (aplicadas APOS o mapa) =====
-- LMF: prefixo "Liberação miofascial" -> "LMF"
UPDATE public.exercises_library
SET name = 'LMF' || substr(name, length('Liberação miofascial')+1)
WHERE name LIKE 'Liberação miofascial%';

-- ISO: palavra isometrico/isometrica -> ISO (nomes; "isometria" substantivo fica fora — escopo ratificado)
UPDATE public.exercises_library
SET name = regexp_replace(regexp_replace(name, '\misométrico\M', 'ISO', 'gi'), '\misométrica\M', 'ISO', 'gi')
WHERE name ~* '\misométric[oa]\M';

-- MB: mini band / miniband -> MB
UPDATE public.exercises_library
SET name = regexp_replace(regexp_replace(name, '\mmini band\M', 'MB', 'gi'), '\mminiband\M', 'MB', 'gi')
WHERE name ~* '\m(mini band|miniband)\M';
