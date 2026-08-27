-- ============================================================================
-- PR-8a — Seed científico das tabelas de referência (Precision 12)
--
-- vo2_reference_ranges: 72 linhas — FRIEND 2015 (Kaminsky et al.,
--   Mayo Clin Proc 90(11):1515-23, DOI 10.1016/j.mayocp.2015.07.026), Tabela 3,
--   percentis por sexo/década (esteira, CPX). Base da tabela ACSM GETP 10a ed.
--   Mapeamento (DERIVAÇÃO FABRIK, não classificação publicada pelos autores):
--   Muito Fraco <p10 · Fraco p10–<p25 · Regular p25–<p50 · Bom p50–<p75
--   · Excelente p75–<p95 · Superior >=p95. Idades 20–79; fora disso => sem
--   classificação (comportamento já tratado no app). Teto 120 ml/kg/min.
--   APLICABILIDADE: normas de teste MÁXIMO em ESTEIRA com CPX. Uso pra VO₂
--   estimado (bike/submáximo) é decisão operacional Fabrik ratificada pelo
--   Alex, com viés conhecido (estimativas de bike tendem a subestimar).
--
-- handgrip_reference_ranges: 120 linhas — Mathiowetz et al. 1985 (Arch
--   Phys Med Rehabil 66:69-74), Tabela 2, mão DIREITA, média±DP em libras,
--   convertido ×0.45359237 (fronteiras arredondadas a 1 decimal).
--   Bandas z-score (DERIVAÇÃO FABRIK): Muito Baixo <−2DP · Baixo −2DP..<−1DP
--   · Médio −1DP..<+1DP · Alto +1DP..<+2DP · Muito Alto >=+2DP.
--   Faixa "75+" do paper => age_max 99 (amostra real ia até 94 anos;
--   95–99 é extrapolação operacional documentada). Teto 150 kg (= teto de
--   input do app). Idades <20 => sem classificação.
--   COMPARADOR: normas são da mão DIREITA, protocolo = MÉDIA das 3 tentativas
--   — classificar mean(right_kg_attempts) contra elas
--   (válido independente de dominância: Mathiowetz mostrou diferença mínima
--   entre destros e canhotos por MÃO). NÃO classificar best_kg das duas mãos.
--
-- Fronteira pertence à banda SUPERIOR. Bandas contíguas com passo 0.01;
-- colunas de valor são numeric(5,2), então nenhum valor armazenado cai no vão.
--
-- IDEMPOTÊNCIA: UUIDs fixos + ON CONFLICT (id) DO NOTHING.
-- PRECHECK FATAL: aborta se existir linha com a mesma chave semântica
--   (sex, age_min, age_max, classification) e id DIFERENTE — evita duplicata
--   semântica se alguém já tiver seedado por outra via.
--
-- ROLLBACK (apaga exatamente o que este seed criou, mesmo se editado depois):
--   delete from public.vo2_reference_ranges where id in (lista de UUIDs abaixo);
--   delete from public.handgrip_reference_ranges where id in (lista de UUIDs abaixo);
-- ============================================================================

do $$
declare
  dup_count int;
begin
  select count(*) into dup_count
  from public.vo2_reference_ranges t
  join (values
    ('b829e86d-35d3-53b9-a44a-ff55b341413a'::uuid, 'M', 20, 29, 'Muito Fraco'),
    ('c0737b8e-6ace-5bee-b81f-987c64c9867d'::uuid, 'M', 20, 29, 'Fraco'),
    ('c435bf82-35b2-55c1-ba54-1c147b6c4ac8'::uuid, 'M', 20, 29, 'Regular'),
    ('054cb8b7-dd8f-5b8d-9316-59f6c30cd649'::uuid, 'M', 20, 29, 'Bom'),
    ('ea95eeac-7997-52f8-b1fb-2b0e8da4681f'::uuid, 'M', 20, 29, 'Excelente'),
    ('587d21f1-12ab-5281-be81-e1e55ee5a33c'::uuid, 'M', 20, 29, 'Superior'),
    ('36a19ef5-eb8c-5c98-a300-bc94689e9099'::uuid, 'M', 30, 39, 'Muito Fraco'),
    ('6a0bf2a6-6e54-58b6-9dcc-458d19713233'::uuid, 'M', 30, 39, 'Fraco'),
    ('33b0a0b9-d810-57a7-b73d-eb990c3297a1'::uuid, 'M', 30, 39, 'Regular'),
    ('ee61e985-244e-5183-bf06-b21434f5de9d'::uuid, 'M', 30, 39, 'Bom'),
    ('ca0b5b6a-5a64-57e8-9bc7-3881fc6b67c2'::uuid, 'M', 30, 39, 'Excelente'),
    ('f8a25f3a-d5f5-5d6a-befd-690e1478a398'::uuid, 'M', 30, 39, 'Superior'),
    ('5ab9f8ac-9113-59ca-850f-17f5cf3831c2'::uuid, 'M', 40, 49, 'Muito Fraco'),
    ('e254c3bb-9817-5ea7-880e-218cca276803'::uuid, 'M', 40, 49, 'Fraco'),
    ('bdf14b9a-4603-5bbd-b967-1494334eed8f'::uuid, 'M', 40, 49, 'Regular'),
    ('e7518ac6-4e91-5c79-8675-e718ff06f917'::uuid, 'M', 40, 49, 'Bom'),
    ('43de6300-8526-5bc6-9ad7-dcb40663546e'::uuid, 'M', 40, 49, 'Excelente'),
    ('34bfc33e-71e7-5eb8-ad1a-2e5864c7da28'::uuid, 'M', 40, 49, 'Superior'),
    ('d16c58d5-ec1d-5177-8e14-2ec1bbc6f0dc'::uuid, 'M', 50, 59, 'Muito Fraco'),
    ('399f3f55-04e7-5a06-8834-11293a773000'::uuid, 'M', 50, 59, 'Fraco'),
    ('51ae30d5-58db-5cdd-9344-0313dd3c71f2'::uuid, 'M', 50, 59, 'Regular'),
    ('bfe4050a-50a0-5b08-b94e-1c64ef3486d1'::uuid, 'M', 50, 59, 'Bom'),
    ('0f261912-4cd7-5906-8ae6-2a59df6e1f76'::uuid, 'M', 50, 59, 'Excelente'),
    ('7b159fc0-500f-59a8-a31e-ade9333773f3'::uuid, 'M', 50, 59, 'Superior'),
    ('02db2d6b-f81f-56be-b082-ded62925249b'::uuid, 'M', 60, 69, 'Muito Fraco'),
    ('98b5d00c-8c43-56ce-b079-185d709d7200'::uuid, 'M', 60, 69, 'Fraco'),
    ('6a7b014f-b7cf-5c34-b13e-07bd9c3491c1'::uuid, 'M', 60, 69, 'Regular'),
    ('71ccdd8f-5e4a-5872-ad67-d1f8e70f1058'::uuid, 'M', 60, 69, 'Bom'),
    ('2613180d-a8f5-5e40-a0f6-dbd3f6805324'::uuid, 'M', 60, 69, 'Excelente'),
    ('6be734aa-a0a3-5bcf-aacc-0b5467f42b69'::uuid, 'M', 60, 69, 'Superior'),
    ('62f1b568-c357-54d0-879f-34fdf305e22d'::uuid, 'M', 70, 79, 'Muito Fraco'),
    ('0e6336ad-d6d5-5f8e-83a1-33e3a2e416d5'::uuid, 'M', 70, 79, 'Fraco'),
    ('7eb96667-3e25-5133-9603-46bd75182095'::uuid, 'M', 70, 79, 'Regular'),
    ('32d533d6-d5b7-573a-a3da-4da67f0c6b7b'::uuid, 'M', 70, 79, 'Bom'),
    ('cf6ac40e-9b37-5982-bd3d-1accb0971355'::uuid, 'M', 70, 79, 'Excelente'),
    ('8e2e5ac9-0649-595e-9d8d-1e909135e3f8'::uuid, 'M', 70, 79, 'Superior'),
    ('1fea727c-63c9-5d4d-a9d0-feed2587cbd1'::uuid, 'F', 20, 29, 'Muito Fraco'),
    ('23c6a6e4-bc48-59c7-baf8-b02fa414de1c'::uuid, 'F', 20, 29, 'Fraco'),
    ('bb4a9f62-4daa-5d47-a9a9-4c9ca5d0c4d4'::uuid, 'F', 20, 29, 'Regular'),
    ('eacafac0-a995-5549-b4ad-5e9c1a7ccb0a'::uuid, 'F', 20, 29, 'Bom'),
    ('2e422162-0e58-503b-ba8c-ae74fe4aab25'::uuid, 'F', 20, 29, 'Excelente'),
    ('599d5b46-953f-5502-b1e5-77de227e3cb2'::uuid, 'F', 20, 29, 'Superior'),
    ('fe6b2ea9-09da-5c4c-89a3-76a52b997189'::uuid, 'F', 30, 39, 'Muito Fraco'),
    ('1a79bbe0-cede-5dd2-ba0c-021655de5b99'::uuid, 'F', 30, 39, 'Fraco'),
    ('4f887e04-5b53-51c1-bc41-f01614e530ed'::uuid, 'F', 30, 39, 'Regular'),
    ('6c233c5b-f8fa-59f6-86ff-aff951d913d3'::uuid, 'F', 30, 39, 'Bom'),
    ('d3f0da7e-3b26-51e0-9446-bb6ce7a9473a'::uuid, 'F', 30, 39, 'Excelente'),
    ('f0f49d2b-4382-5891-85b1-44b9ea017823'::uuid, 'F', 30, 39, 'Superior'),
    ('c2837db9-f3fb-5b6d-8402-bf444120806b'::uuid, 'F', 40, 49, 'Muito Fraco'),
    ('25874392-7d13-55c5-a5af-d29649eb90de'::uuid, 'F', 40, 49, 'Fraco'),
    ('d9361284-c32d-56e6-958f-c0e3c4861508'::uuid, 'F', 40, 49, 'Regular'),
    ('1f149769-ffe9-5021-b395-c831e43224c0'::uuid, 'F', 40, 49, 'Bom'),
    ('2e42dd1b-cf25-51a6-8544-c5190f02091b'::uuid, 'F', 40, 49, 'Excelente'),
    ('c66cdc5e-365a-5b86-8a05-253a75c896da'::uuid, 'F', 40, 49, 'Superior'),
    ('597f2464-8f00-52a1-80cc-ca5a5e4ce25e'::uuid, 'F', 50, 59, 'Muito Fraco'),
    ('e9b1f891-18d1-5c29-9236-b8f93e04ed77'::uuid, 'F', 50, 59, 'Fraco'),
    ('16d57633-ea4f-5080-89e9-9e9f3bc9bccd'::uuid, 'F', 50, 59, 'Regular'),
    ('53b2123e-e820-5a3f-be0b-1c61d12873d7'::uuid, 'F', 50, 59, 'Bom'),
    ('c67b102e-0b8b-5d5e-b25b-6f3dec4c9640'::uuid, 'F', 50, 59, 'Excelente'),
    ('f0a523a2-eb7a-5654-af0d-3b6fb503578c'::uuid, 'F', 50, 59, 'Superior'),
    ('25d63f7e-3dc9-5304-8265-778ab1b2985a'::uuid, 'F', 60, 69, 'Muito Fraco'),
    ('93e7126d-6a9a-5a81-acd4-6a0faabcd5d0'::uuid, 'F', 60, 69, 'Fraco'),
    ('1afac960-58a6-568a-86b6-d4c68c4816ba'::uuid, 'F', 60, 69, 'Regular'),
    ('05f17dfd-5393-5d40-9bf6-e3d836bfa073'::uuid, 'F', 60, 69, 'Bom'),
    ('b6dc9604-3e00-55f7-8c99-dd34f18f6a58'::uuid, 'F', 60, 69, 'Excelente'),
    ('467ac0af-806f-5c58-bf1c-6ff922fa90d8'::uuid, 'F', 60, 69, 'Superior'),
    ('79379ab2-28f3-5af9-abc3-9ba405f6ff53'::uuid, 'F', 70, 79, 'Muito Fraco'),
    ('6c4f08b4-cc91-5b3c-ac4a-7c8ff9b9d2a6'::uuid, 'F', 70, 79, 'Fraco'),
    ('590d63b2-d414-5f69-8eae-64543ae1b687'::uuid, 'F', 70, 79, 'Regular'),
    ('3969b27d-630e-58f5-b6bd-b317286f059e'::uuid, 'F', 70, 79, 'Bom'),
    ('dda06666-d736-5c3a-a5fa-b7b5c548981a'::uuid, 'F', 70, 79, 'Excelente'),
    ('87debec6-5346-5e9f-81c8-0f4a2ec1dd4a'::uuid, 'F', 70, 79, 'Superior')
  ) as seed(id, sex, age_min, age_max, classification)
    on t.sex = seed.sex and t.age_min = seed.age_min
   and t.age_max = seed.age_max and t.classification = seed.classification
   and t.id <> seed.id;
  if dup_count > 0 then
    raise exception 'PRECHECK FATAL: % linha(s) em vo2_reference_ranges com mesma chave semântica e id diferente — investigar antes de seedar', dup_count;
  end if;

  select count(*) into dup_count
  from public.handgrip_reference_ranges t
  join (values
    ('33f95f17-c617-580f-a87f-b9cc840b0027'::uuid, 'M', 20, 24, 'Muito Baixo'),
    ('387cd383-b165-5073-9d90-3c09f331ed18'::uuid, 'M', 20, 24, 'Baixo'),
    ('2e2cc14e-c5c5-55c3-a638-f9870c39fd18'::uuid, 'M', 20, 24, 'Médio'),
    ('9b60de02-15f9-531d-b6c4-3d3c67c4b326'::uuid, 'M', 20, 24, 'Alto'),
    ('632b1ebe-1752-55df-8a75-0110475e1545'::uuid, 'M', 20, 24, 'Muito Alto'),
    ('a6b97cd6-ad34-5ce7-a1cf-30998f54d905'::uuid, 'M', 25, 29, 'Muito Baixo'),
    ('2ef4ff74-f434-5d8f-9522-3cac9693ecb3'::uuid, 'M', 25, 29, 'Baixo'),
    ('0716e4d4-a666-5f0d-a5b6-05a66c923908'::uuid, 'M', 25, 29, 'Médio'),
    ('11d8e528-ea3f-556a-9b7b-5f11abb8ac26'::uuid, 'M', 25, 29, 'Alto'),
    ('351a43b3-aa0f-5cde-ae27-677f253058e4'::uuid, 'M', 25, 29, 'Muito Alto'),
    ('0211bcea-9b13-5d85-a950-ba23c85037ef'::uuid, 'M', 30, 34, 'Muito Baixo'),
    ('1b08898a-2764-5294-998f-97252ce917f6'::uuid, 'M', 30, 34, 'Baixo'),
    ('48bd32ea-72e4-582b-b499-0af02dc5edac'::uuid, 'M', 30, 34, 'Médio'),
    ('d10962ca-8cb9-5f86-9918-a55c52f398fd'::uuid, 'M', 30, 34, 'Alto'),
    ('67530fff-06a2-5be2-beb6-2c0524034b02'::uuid, 'M', 30, 34, 'Muito Alto'),
    ('c1c57dac-0a4b-5d84-ba56-96b3206cccb8'::uuid, 'M', 35, 39, 'Muito Baixo'),
    ('e9718a2f-fcf2-506d-a0c3-2cca7df01890'::uuid, 'M', 35, 39, 'Baixo'),
    ('da497de1-25f4-5ba9-8a6b-c122040f6a5f'::uuid, 'M', 35, 39, 'Médio'),
    ('f213df58-2b37-5fe6-b04d-737cbf1acda4'::uuid, 'M', 35, 39, 'Alto'),
    ('61b35477-3a80-597d-882f-8f47b01963d4'::uuid, 'M', 35, 39, 'Muito Alto'),
    ('e7220802-7b73-5512-95a5-95e3fca07412'::uuid, 'M', 40, 44, 'Muito Baixo'),
    ('abeb02b8-d423-56d8-ae1b-699f2788412a'::uuid, 'M', 40, 44, 'Baixo'),
    ('64695356-2511-55bd-b092-b73096d2df59'::uuid, 'M', 40, 44, 'Médio'),
    ('493b1433-9b10-5fcc-a1bd-8b383225bcd4'::uuid, 'M', 40, 44, 'Alto'),
    ('c2609c3f-2c67-561c-bdbe-f4c07929be16'::uuid, 'M', 40, 44, 'Muito Alto'),
    ('cec18e62-352d-5cbe-83b0-638ee053f242'::uuid, 'M', 45, 49, 'Muito Baixo'),
    ('63dde9b4-df30-5896-9d78-87ed7152519a'::uuid, 'M', 45, 49, 'Baixo'),
    ('89963208-6dd8-5643-9e3f-40df9dbef1a6'::uuid, 'M', 45, 49, 'Médio'),
    ('bfd50df3-dde5-5b4e-bb35-95099b287150'::uuid, 'M', 45, 49, 'Alto'),
    ('2fdb95cc-2618-5e5d-815b-0ffa968e1270'::uuid, 'M', 45, 49, 'Muito Alto'),
    ('3f4571b3-807a-5ed3-8450-87b00c22ccc0'::uuid, 'M', 50, 54, 'Muito Baixo'),
    ('8d51d0b1-a42e-58b2-bc71-6fd425bdd273'::uuid, 'M', 50, 54, 'Baixo'),
    ('2c62710a-4208-5c0b-8674-0adb9358e8ff'::uuid, 'M', 50, 54, 'Médio'),
    ('ba1f04a9-521e-55df-b59b-6d86e8369c18'::uuid, 'M', 50, 54, 'Alto'),
    ('c4a8fc32-373b-576a-99eb-8d8207bba0df'::uuid, 'M', 50, 54, 'Muito Alto'),
    ('efbce8bb-a177-51d9-aa26-7286516b9cfa'::uuid, 'M', 55, 59, 'Muito Baixo'),
    ('d4cb9912-d224-5824-82cf-c13945d68327'::uuid, 'M', 55, 59, 'Baixo'),
    ('42a5f8a7-aa23-5cdc-8805-44880cdaf8fd'::uuid, 'M', 55, 59, 'Médio'),
    ('566e1963-d22d-524f-b025-ede68091a1f7'::uuid, 'M', 55, 59, 'Alto'),
    ('f0251476-607a-5f3a-88c3-4fdba3984b71'::uuid, 'M', 55, 59, 'Muito Alto'),
    ('2a829306-b2c2-5ac5-a1ab-369173593ee4'::uuid, 'M', 60, 64, 'Muito Baixo'),
    ('59745f85-3ad5-58c0-8272-e9b1fab6efc9'::uuid, 'M', 60, 64, 'Baixo'),
    ('27c3cf8a-cb89-5033-8b6e-b03fe1c958d2'::uuid, 'M', 60, 64, 'Médio'),
    ('4ce83d56-95ed-5c99-9225-4191cb5752e5'::uuid, 'M', 60, 64, 'Alto'),
    ('86a80b88-01db-5290-ae53-e956b30f8bf4'::uuid, 'M', 60, 64, 'Muito Alto'),
    ('76bf893a-cb7a-5268-baf9-da7e47db956d'::uuid, 'M', 65, 69, 'Muito Baixo'),
    ('dcf631cf-6a15-5814-93db-ffd7294bc00e'::uuid, 'M', 65, 69, 'Baixo'),
    ('38b64f89-cc0f-57d6-a2cd-f08f5c51519c'::uuid, 'M', 65, 69, 'Médio'),
    ('ce049804-df6b-5d75-8524-2fed9959e1d3'::uuid, 'M', 65, 69, 'Alto'),
    ('dfe5043c-c7bf-55bb-9080-222a06c1ec5b'::uuid, 'M', 65, 69, 'Muito Alto'),
    ('428faa6f-8504-5410-ad1a-7b40f4733e2b'::uuid, 'M', 70, 74, 'Muito Baixo'),
    ('2249d2d2-7e26-557b-9123-c9ad15b9db2f'::uuid, 'M', 70, 74, 'Baixo'),
    ('adc5b5af-64f3-53f4-afe5-d5f83de5d10c'::uuid, 'M', 70, 74, 'Médio'),
    ('b13c1cc9-dad3-5412-8c06-c3a999adbdbe'::uuid, 'M', 70, 74, 'Alto'),
    ('042646d1-d0b0-54cc-b31d-978d8d29d9e2'::uuid, 'M', 70, 74, 'Muito Alto'),
    ('c0c1f07a-a72e-5a89-aa82-4309dabf2369'::uuid, 'M', 75, 99, 'Muito Baixo'),
    ('211b9f7c-64cf-5032-9dc7-fd9c8d804b8d'::uuid, 'M', 75, 99, 'Baixo'),
    ('4aac9826-dc81-5caf-b3be-51e034b2ffaf'::uuid, 'M', 75, 99, 'Médio'),
    ('1c471fcb-c988-5437-af93-290e61ac1b28'::uuid, 'M', 75, 99, 'Alto'),
    ('334501a0-8d38-5206-8fc1-04b5f1e4ccd8'::uuid, 'M', 75, 99, 'Muito Alto'),
    ('88967a2e-5c5c-58ae-9aaf-6deddd219392'::uuid, 'F', 20, 24, 'Muito Baixo'),
    ('8d9c05c2-fd8c-559c-b7ac-31f79bd58946'::uuid, 'F', 20, 24, 'Baixo'),
    ('73035116-419c-591e-b314-f25f7c1573f5'::uuid, 'F', 20, 24, 'Médio'),
    ('f63ceb78-0f82-5bef-89a5-4c87db1bdea6'::uuid, 'F', 20, 24, 'Alto'),
    ('ec21fa5c-2586-5f6a-829c-0e5d07aede55'::uuid, 'F', 20, 24, 'Muito Alto'),
    ('6bb9ccc9-8ee5-53ad-89fe-f50cdafa9491'::uuid, 'F', 25, 29, 'Muito Baixo'),
    ('69de5897-cac8-51f5-8857-4c80be157911'::uuid, 'F', 25, 29, 'Baixo'),
    ('e02e1136-91da-5a54-b6a0-bccbb7c5abde'::uuid, 'F', 25, 29, 'Médio'),
    ('b15fb244-afc1-555b-a50a-f31b33cb912a'::uuid, 'F', 25, 29, 'Alto'),
    ('4010dedc-d03f-5894-85f8-04b30a9fdae3'::uuid, 'F', 25, 29, 'Muito Alto'),
    ('536f950b-c798-5f62-b050-0c6e39397c71'::uuid, 'F', 30, 34, 'Muito Baixo'),
    ('590f513e-a194-54ea-9dd9-68d2df1f7edb'::uuid, 'F', 30, 34, 'Baixo'),
    ('38b4cb4c-1323-5ac9-963d-92c0b4dace7e'::uuid, 'F', 30, 34, 'Médio'),
    ('1c336800-3911-5276-b50f-8c8ab54d6fa8'::uuid, 'F', 30, 34, 'Alto'),
    ('da544e48-c81d-5e6a-959a-dbd92adf0516'::uuid, 'F', 30, 34, 'Muito Alto'),
    ('9ab9afd5-07ad-559f-8fc3-25152c50c406'::uuid, 'F', 35, 39, 'Muito Baixo'),
    ('1b770af7-92f3-5797-a8ab-52801f031f0f'::uuid, 'F', 35, 39, 'Baixo'),
    ('08a5593b-effe-5f09-ab59-ac5c3a8fb0ea'::uuid, 'F', 35, 39, 'Médio'),
    ('6cec3a3c-e3a4-57fa-baed-99ce62c4e085'::uuid, 'F', 35, 39, 'Alto'),
    ('422c2c86-3e4b-55e4-8b19-919e12ea6e34'::uuid, 'F', 35, 39, 'Muito Alto'),
    ('4a1e88c5-e8ee-50a2-b5e3-272af7b3012f'::uuid, 'F', 40, 44, 'Muito Baixo'),
    ('f630fd18-1bf0-5351-bfd9-39d1d40c5833'::uuid, 'F', 40, 44, 'Baixo'),
    ('e8ae0e68-00e6-56bb-8620-575f7486e552'::uuid, 'F', 40, 44, 'Médio'),
    ('fdd96f6c-277b-5783-b7ce-529c9bc823e8'::uuid, 'F', 40, 44, 'Alto'),
    ('8a1bea22-246e-544f-abb5-dc1ac256751c'::uuid, 'F', 40, 44, 'Muito Alto'),
    ('f0e531e6-25ee-5bc0-ac06-6f861cce067f'::uuid, 'F', 45, 49, 'Muito Baixo'),
    ('e43c4d35-6e47-5ebd-a287-98dedf0e15ec'::uuid, 'F', 45, 49, 'Baixo'),
    ('ea790c5a-a974-52a7-9f60-d03b9402cd2c'::uuid, 'F', 45, 49, 'Médio'),
    ('b689e5b5-0786-5773-be09-17c38e7074df'::uuid, 'F', 45, 49, 'Alto'),
    ('7ee919ef-bcbd-5ec5-bcb3-76dd04a0a4ae'::uuid, 'F', 45, 49, 'Muito Alto'),
    ('d534c4ba-6f2b-503a-b9c4-e5e1336741a7'::uuid, 'F', 50, 54, 'Muito Baixo'),
    ('da5f163c-c20b-5427-92c8-ed8ec417bd65'::uuid, 'F', 50, 54, 'Baixo'),
    ('20fe85df-05ca-5280-ba4a-37bbfbaa3f48'::uuid, 'F', 50, 54, 'Médio'),
    ('d7a6db43-2440-537f-83b8-d79862521bf9'::uuid, 'F', 50, 54, 'Alto'),
    ('a566237d-b26a-53b2-9e2b-9a6c736aaaf0'::uuid, 'F', 50, 54, 'Muito Alto'),
    ('5c5d7992-dd7b-5399-b548-8f3ab8095d91'::uuid, 'F', 55, 59, 'Muito Baixo'),
    ('fdbce746-315f-5229-8930-0880f2fde783'::uuid, 'F', 55, 59, 'Baixo'),
    ('fa27d6f4-6415-55d5-8d89-133f3b4a4775'::uuid, 'F', 55, 59, 'Médio'),
    ('794e3def-fddf-5054-89c3-5859f3dba57f'::uuid, 'F', 55, 59, 'Alto'),
    ('9f365f8a-0c10-5ea7-b58f-4b35f9a99542'::uuid, 'F', 55, 59, 'Muito Alto'),
    ('ede6380d-b324-54d9-bd89-d12536ab1470'::uuid, 'F', 60, 64, 'Muito Baixo'),
    ('44023e27-7436-52be-af06-d3825f5be7af'::uuid, 'F', 60, 64, 'Baixo'),
    ('0f23e4ad-f399-524e-8061-dce065ee39a9'::uuid, 'F', 60, 64, 'Médio'),
    ('fce8ef26-e163-5c4a-88c5-d5c23e461db1'::uuid, 'F', 60, 64, 'Alto'),
    ('9ad573eb-0b2b-5906-953e-8b93a7051735'::uuid, 'F', 60, 64, 'Muito Alto'),
    ('c900b506-3679-52a8-85b3-643c677cc2f4'::uuid, 'F', 65, 69, 'Muito Baixo'),
    ('5d2907ce-bc27-5434-afb1-4fc7dbb05abc'::uuid, 'F', 65, 69, 'Baixo'),
    ('4ce516fa-7b9c-5ff8-8ce9-b7ad8c7895aa'::uuid, 'F', 65, 69, 'Médio'),
    ('1b65b78d-f4f6-546a-86ad-e78749d6e776'::uuid, 'F', 65, 69, 'Alto'),
    ('b757b093-fac2-55c0-bd9c-8ac379f3bfb8'::uuid, 'F', 65, 69, 'Muito Alto'),
    ('002c9aee-5944-5d57-9518-23a38d4a9462'::uuid, 'F', 70, 74, 'Muito Baixo'),
    ('64d867b6-3bcc-5aff-9f8d-d7d286819e5c'::uuid, 'F', 70, 74, 'Baixo'),
    ('e2aecc4e-c47e-5beb-a2a9-ccbfeee0e1d1'::uuid, 'F', 70, 74, 'Médio'),
    ('412d0eef-8885-52b6-9d7b-d43bd32ef96a'::uuid, 'F', 70, 74, 'Alto'),
    ('bd59c33d-9e3b-5de4-87d2-102896e2cc1b'::uuid, 'F', 70, 74, 'Muito Alto'),
    ('dc228cab-e579-5793-9e62-c10fccf96041'::uuid, 'F', 75, 99, 'Muito Baixo'),
    ('09597e54-7164-51e9-b57d-bda5bbd00f5b'::uuid, 'F', 75, 99, 'Baixo'),
    ('f8f934f7-8c04-5420-9c03-d83bc3e0afe8'::uuid, 'F', 75, 99, 'Médio'),
    ('5b07d9bc-896a-553b-a21c-da962c37d35e'::uuid, 'F', 75, 99, 'Alto'),
    ('39d66adf-31bc-5854-b546-22cd763daa7c'::uuid, 'F', 75, 99, 'Muito Alto')
  ) as seed(id, sex, age_min, age_max, classification)
    on t.sex = seed.sex and t.age_min = seed.age_min
   and t.age_max = seed.age_max and t.classification = seed.classification
   and t.id <> seed.id;
  if dup_count > 0 then
    raise exception 'PRECHECK FATAL: % linha(s) em handgrip_reference_ranges com mesma chave semântica e id diferente — investigar antes de seedar', dup_count;
  end if;
end $$;

insert into public.vo2_reference_ranges
  (id, sex, age_min, age_max, classification, vo2_min, vo2_max, source)
values
  ('b829e86d-35d3-53b9-a44a-ff55b341413a', 'M', 20, 29, 'Muito Fraco', 0.00, 32.09, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('c0737b8e-6ace-5bee-b81f-987c64c9867d', 'M', 20, 29, 'Fraco', 32.10, 40.09, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('c435bf82-35b2-55c1-ba54-1c147b6c4ac8', 'M', 20, 29, 'Regular', 40.10, 47.99, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('054cb8b7-dd8f-5b8d-9316-59f6c30cd649', 'M', 20, 29, 'Bom', 48.00, 55.19, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('ea95eeac-7997-52f8-b1fb-2b0e8da4681f', 'M', 20, 29, 'Excelente', 55.20, 66.29, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('587d21f1-12ab-5281-be81-e1e55ee5a33c', 'M', 20, 29, 'Superior', 66.30, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('36a19ef5-eb8c-5c98-a300-bc94689e9099', 'M', 30, 39, 'Muito Fraco', 0.00, 30.19, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('6a0bf2a6-6e54-58b6-9dcc-458d19713233', 'M', 30, 39, 'Fraco', 30.20, 35.89, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('33b0a0b9-d810-57a7-b73d-eb990c3297a1', 'M', 30, 39, 'Regular', 35.90, 42.39, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('ee61e985-244e-5183-bf06-b21434f5de9d', 'M', 30, 39, 'Bom', 42.40, 49.19, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('ca0b5b6a-5a64-57e8-9bc7-3881fc6b67c2', 'M', 30, 39, 'Excelente', 49.20, 59.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('f8a25f3a-d5f5-5d6a-befd-690e1478a398', 'M', 30, 39, 'Superior', 59.80, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('5ab9f8ac-9113-59ca-850f-17f5cf3831c2', 'M', 40, 49, 'Muito Fraco', 0.00, 26.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('e254c3bb-9817-5ea7-880e-218cca276803', 'M', 40, 49, 'Fraco', 26.80, 31.89, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('bdf14b9a-4603-5bbd-b967-1494334eed8f', 'M', 40, 49, 'Regular', 31.90, 37.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('e7518ac6-4e91-5c79-8675-e718ff06f917', 'M', 40, 49, 'Bom', 37.80, 44.99, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('43de6300-8526-5bc6-9ad7-dcb40663546e', 'M', 40, 49, 'Excelente', 45.00, 55.59, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('34bfc33e-71e7-5eb8-ad1a-2e5864c7da28', 'M', 40, 49, 'Superior', 55.60, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('d16c58d5-ec1d-5177-8e14-2ec1bbc6f0dc', 'M', 50, 59, 'Muito Fraco', 0.00, 22.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('399f3f55-04e7-5a06-8834-11293a773000', 'M', 50, 59, 'Fraco', 22.80, 27.09, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('51ae30d5-58db-5cdd-9344-0313dd3c71f2', 'M', 50, 59, 'Regular', 27.10, 32.59, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('bfe4050a-50a0-5b08-b94e-1c64ef3486d1', 'M', 50, 59, 'Bom', 32.60, 39.69, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('0f261912-4cd7-5906-8ae6-2a59df6e1f76', 'M', 50, 59, 'Excelente', 39.70, 50.69, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('7b159fc0-500f-59a8-a31e-ade9333773f3', 'M', 50, 59, 'Superior', 50.70, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('02db2d6b-f81f-56be-b082-ded62925249b', 'M', 60, 69, 'Muito Fraco', 0.00, 19.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('98b5d00c-8c43-56ce-b079-185d709d7200', 'M', 60, 69, 'Fraco', 19.80, 23.69, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('6a7b014f-b7cf-5c34-b13e-07bd9c3491c1', 'M', 60, 69, 'Regular', 23.70, 28.19, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('71ccdd8f-5e4a-5872-ad67-d1f8e70f1058', 'M', 60, 69, 'Bom', 28.20, 34.49, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('2613180d-a8f5-5e40-a0f6-dbd3f6805324', 'M', 60, 69, 'Excelente', 34.50, 42.99, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('6be734aa-a0a3-5bcf-aacc-0b5467f42b69', 'M', 60, 69, 'Superior', 43.00, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('62f1b568-c357-54d0-879f-34fdf305e22d', 'M', 70, 79, 'Muito Fraco', 0.00, 17.09, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('0e6336ad-d6d5-5f8e-83a1-33e3a2e416d5', 'M', 70, 79, 'Fraco', 17.10, 20.39, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('7eb96667-3e25-5133-9603-46bd75182095', 'M', 70, 79, 'Regular', 20.40, 24.39, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('32d533d6-d5b7-573a-a3da-4da67f0c6b7b', 'M', 70, 79, 'Bom', 24.40, 30.39, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('cf6ac40e-9b37-5982-bd3d-1accb0971355', 'M', 70, 79, 'Excelente', 30.40, 39.69, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('8e2e5ac9-0649-595e-9d8d-1e909135e3f8', 'M', 70, 79, 'Superior', 39.70, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('1fea727c-63c9-5d4d-a9d0-feed2587cbd1', 'F', 20, 29, 'Muito Fraco', 0.00, 23.89, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('23c6a6e4-bc48-59c7-baf8-b02fa414de1c', 'F', 20, 29, 'Fraco', 23.90, 30.49, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('bb4a9f62-4daa-5d47-a9a9-4c9ca5d0c4d4', 'F', 20, 29, 'Regular', 30.50, 37.59, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('eacafac0-a995-5549-b4ad-5e9c1a7ccb0a', 'F', 20, 29, 'Bom', 37.60, 44.69, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('2e422162-0e58-503b-ba8c-ae74fe4aab25', 'F', 20, 29, 'Excelente', 44.70, 55.99, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('599d5b46-953f-5502-b1e5-77de227e3cb2', 'F', 20, 29, 'Superior', 56.00, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('fe6b2ea9-09da-5c4c-89a3-76a52b997189', 'F', 30, 39, 'Muito Fraco', 0.00, 20.89, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('1a79bbe0-cede-5dd2-ba0c-021655de5b99', 'F', 30, 39, 'Fraco', 20.90, 25.29, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('4f887e04-5b53-51c1-bc41-f01614e530ed', 'F', 30, 39, 'Regular', 25.30, 30.19, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('6c233c5b-f8fa-59f6-86ff-aff951d913d3', 'F', 30, 39, 'Bom', 30.20, 36.09, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('d3f0da7e-3b26-51e0-9446-bb6ce7a9473a', 'F', 30, 39, 'Excelente', 36.10, 45.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('f0f49d2b-4382-5891-85b1-44b9ea017823', 'F', 30, 39, 'Superior', 45.80, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('c2837db9-f3fb-5b6d-8402-bf444120806b', 'F', 40, 49, 'Muito Fraco', 0.00, 18.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('25874392-7d13-55c5-a5af-d29649eb90de', 'F', 40, 49, 'Fraco', 18.80, 22.09, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('d9361284-c32d-56e6-958f-c0e3c4861508', 'F', 40, 49, 'Regular', 22.10, 26.69, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('1f149769-ffe9-5021-b395-c831e43224c0', 'F', 40, 49, 'Bom', 26.70, 32.39, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('2e42dd1b-cf25-51a6-8544-c5190f02091b', 'F', 40, 49, 'Excelente', 32.40, 41.69, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('c66cdc5e-365a-5b86-8a05-253a75c896da', 'F', 40, 49, 'Superior', 41.70, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('597f2464-8f00-52a1-80cc-ca5a5e4ce25e', 'F', 50, 59, 'Muito Fraco', 0.00, 17.29, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('e9b1f891-18d1-5c29-9236-b8f93e04ed77', 'F', 50, 59, 'Fraco', 17.30, 19.89, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('16d57633-ea4f-5080-89e9-9e9f3bc9bccd', 'F', 50, 59, 'Regular', 19.90, 23.39, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('53b2123e-e820-5a3f-be0b-1c61d12873d7', 'F', 50, 59, 'Bom', 23.40, 27.59, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('c67b102e-0b8b-5d5e-b25b-6f3dec4c9640', 'F', 50, 59, 'Excelente', 27.60, 35.89, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('f0a523a2-eb7a-5654-af0d-3b6fb503578c', 'F', 50, 59, 'Superior', 35.90, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('25d63f7e-3dc9-5304-8265-778ab1b2985a', 'F', 60, 69, 'Muito Fraco', 0.00, 14.59, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('93e7126d-6a9a-5a81-acd4-6a0faabcd5d0', 'F', 60, 69, 'Fraco', 14.60, 17.19, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('1afac960-58a6-568a-86b6-d4c68c4816ba', 'F', 60, 69, 'Regular', 17.20, 19.99, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('05f17dfd-5393-5d40-9bf6-e3d836bfa073', 'F', 60, 69, 'Bom', 20.00, 23.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('b6dc9604-3e00-55f7-8c99-dd34f18f6a58', 'F', 60, 69, 'Excelente', 23.80, 29.39, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('467ac0af-806f-5c58-bf1c-6ff922fa90d8', 'F', 60, 69, 'Superior', 29.40, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('79379ab2-28f3-5af9-abc3-9ba405f6ff53', 'F', 70, 79, 'Muito Fraco', 0.00, 13.59, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('6c4f08b4-cc91-5b3c-ac4a-7c8ff9b9d2a6', 'F', 70, 79, 'Fraco', 13.60, 15.59, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('590d63b2-d414-5f69-8eae-64543ae1b687', 'F', 70, 79, 'Regular', 15.60, 18.29, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('3969b27d-630e-58f5-b6bd-b317286f059e', 'F', 70, 79, 'Bom', 18.30, 20.79, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('dda06666-d736-5c3a-a5fa-b7b5c548981a', 'F', 70, 79, 'Excelente', 20.80, 24.09, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)'),
  ('87debec6-5346-5e9f-81c8-0f4a2ec1dd4a', 'F', 70, 79, 'Superior', 24.10, 120.00, 'Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)')
on conflict (id) do nothing;

insert into public.handgrip_reference_ranges
  (id, sex, age_min, age_max, classification, kg_min, kg_max, source)
values
  ('33f95f17-c617-580f-a87f-b9cc840b0027', 'M', 20, 24, 'Muito Baixo', 0.00, 36.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('387cd383-b165-5073-9d90-3c09f331ed18', 'M', 20, 24, 'Baixo', 36.20, 45.49, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('2e2cc14e-c5c5-55c3-a638-f9870c39fd18', 'M', 20, 24, 'Médio', 45.50, 64.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('9b60de02-15f9-531d-b6c4-3d3c67c4b326', 'M', 20, 24, 'Alto', 64.20, 73.59, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('632b1ebe-1752-55df-8a75-0110475e1545', 'M', 20, 24, 'Muito Alto', 73.60, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('a6b97cd6-ad34-5ce7-a1cf-30998f54d905', 'M', 25, 29, 'Muito Baixo', 0.00, 33.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('2ef4ff74-f434-5d8f-9522-3cac9693ecb3', 'M', 25, 29, 'Baixo', 33.90, 44.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('0716e4d4-a666-5f0d-a5b6-05a66c923908', 'M', 25, 29, 'Médio', 44.40, 65.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('11d8e528-ea3f-556a-9b7b-5f11abb8ac26', 'M', 25, 29, 'Alto', 65.20, 75.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('351a43b3-aa0f-5cde-ae27-677f253058e4', 'M', 25, 29, 'Muito Alto', 75.70, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('0211bcea-9b13-5d85-a950-ba23c85037ef', 'M', 30, 34, 'Muito Baixo', 0.00, 34.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('1b08898a-2764-5294-998f-97252ce917f6', 'M', 30, 34, 'Baixo', 34.90, 45.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('48bd32ea-72e4-582b-b499-0af02dc5edac', 'M', 30, 34, 'Médio', 45.10, 65.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('d10962ca-8cb9-5f86-9918-a55c52f398fd', 'M', 30, 34, 'Alto', 65.40, 75.59, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('67530fff-06a2-5be2-beb6-2c0524034b02', 'M', 30, 34, 'Muito Alto', 75.60, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('c1c57dac-0a4b-5d84-ba56-96b3206cccb8', 'M', 35, 39, 'Muito Baixo', 0.00, 32.49, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('e9718a2f-fcf2-506d-a0c3-2cca7df01890', 'M', 35, 39, 'Baixo', 32.50, 43.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('da497de1-25f4-5ba9-8a6b-c122040f6a5f', 'M', 35, 39, 'Médio', 43.40, 65.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('f213df58-2b37-5fe6-b04d-737cbf1acda4', 'M', 35, 39, 'Alto', 65.20, 76.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('61b35477-3a80-597d-882f-8f47b01963d4', 'M', 35, 39, 'Muito Alto', 76.10, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('e7220802-7b73-5512-95a5-95e3fca07412', 'M', 40, 44, 'Muito Baixo', 0.00, 34.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('abeb02b8-d423-56d8-ae1b-699f2788412a', 'M', 40, 44, 'Baixo', 34.20, 43.59, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('64695356-2511-55bd-b092-b73096d2df59', 'M', 40, 44, 'Médio', 43.60, 62.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('493b1433-9b10-5fcc-a1bd-8b383225bcd4', 'M', 40, 44, 'Alto', 62.40, 71.79, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('c2609c3f-2c67-561c-bdbe-f4c07929be16', 'M', 40, 44, 'Muito Alto', 71.80, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('cec18e62-352d-5cbe-83b0-638ee053f242', 'M', 45, 49, 'Muito Baixo', 0.00, 28.99, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('63dde9b4-df30-5896-9d78-87ed7152519a', 'M', 45, 49, 'Baixo', 29.00, 39.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('89963208-6dd8-5643-9e3f-40df9dbef1a6', 'M', 45, 49, 'Médio', 39.40, 60.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('bfd50df3-dde5-5b4e-bb35-95099b287150', 'M', 45, 49, 'Alto', 60.30, 70.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('2fdb95cc-2618-5e5d-815b-0ffa968e1270', 'M', 45, 49, 'Muito Alto', 70.70, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('3f4571b3-807a-5ed3-8450-87b00c22ccc0', 'M', 50, 54, 'Muito Baixo', 0.00, 35.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('8d51d0b1-a42e-58b2-bc71-6fd425bdd273', 'M', 50, 54, 'Baixo', 35.10, 43.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('2c62710a-4208-5c0b-8674-0adb9358e8ff', 'M', 50, 54, 'Médio', 43.30, 59.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('ba1f04a9-521e-55df-b59b-6d86e8369c18', 'M', 50, 54, 'Alto', 59.70, 67.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('c4a8fc32-373b-576a-99eb-8d8207bba0df', 'M', 50, 54, 'Muito Alto', 67.90, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('efbce8bb-a177-51d9-aa26-7286516b9cfa', 'M', 55, 59, 'Muito Baixo', 0.00, 21.59, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('d4cb9912-d224-5824-82cf-c13945d68327', 'M', 55, 59, 'Baixo', 21.60, 33.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('42a5f8a7-aa23-5cdc-8805-44880cdaf8fd', 'M', 55, 59, 'Médio', 33.70, 57.99, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('566e1963-d22d-524f-b025-ede68091a1f7', 'M', 55, 59, 'Alto', 58.00, 70.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('f0251476-607a-5f3a-88c3-4fdba3984b71', 'M', 55, 59, 'Muito Alto', 70.10, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('2a829306-b2c2-5ac5-a1ab-369173593ee4', 'M', 60, 64, 'Muito Baixo', 0.00, 22.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('59745f85-3ad5-58c0-8272-e9b1fab6efc9', 'M', 60, 64, 'Baixo', 22.20, 31.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('27c3cf8a-cb89-5033-8b6e-b03fe1c958d2', 'M', 60, 64, 'Médio', 31.40, 49.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('4ce83d56-95ed-5c99-9225-4191cb5752e5', 'M', 60, 64, 'Alto', 49.90, 59.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('86a80b88-01db-5290-ae53-e956b30f8bf4', 'M', 60, 64, 'Muito Alto', 59.20, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('76bf893a-cb7a-5268-baf9-da7e47db956d', 'M', 65, 69, 'Muito Baixo', 0.00, 22.59, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('dcf631cf-6a15-5814-93db-ffd7294bc00e', 'M', 65, 69, 'Baixo', 22.60, 31.99, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('38b64f89-cc0f-57d6-a2cd-f08f5c51519c', 'M', 65, 69, 'Médio', 32.00, 50.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('ce049804-df6b-5d75-8524-2fed9959e1d3', 'M', 65, 69, 'Alto', 50.70, 59.99, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('dfe5043c-c7bf-55bb-9080-222a06c1ec5b', 'M', 65, 69, 'Muito Alto', 60.00, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('428faa6f-8504-5410-ad1a-7b40f4733e2b', 'M', 70, 74, 'Muito Baixo', 0.00, 14.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('2249d2d2-7e26-557b-9123-c9ad15b9db2f', 'M', 70, 74, 'Baixo', 14.70, 24.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('adc5b5af-64f3-53f4-afe5-d5f83de5d10c', 'M', 70, 74, 'Médio', 24.40, 43.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('b13c1cc9-dad3-5412-8c06-c3a999adbdbe', 'M', 70, 74, 'Alto', 43.90, 53.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('042646d1-d0b0-54cc-b31d-978d8d29d9e2', 'M', 70, 74, 'Muito Alto', 53.70, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('c0c1f07a-a72e-5a89-aa82-4309dabf2369', 'M', 75, 99, 'Muito Baixo', 0.00, 10.79, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('211b9f7c-64cf-5032-9dc7-fd9c8d804b8d', 'M', 75, 99, 'Baixo', 10.80, 20.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('4aac9826-dc81-5caf-b3be-51e034b2ffaf', 'M', 75, 99, 'Médio', 20.30, 39.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('1c471fcb-c988-5437-af93-290e61ac1b28', 'M', 75, 99, 'Alto', 39.30, 48.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('334501a0-8d38-5206-8fc1-04b5f1e4ccd8', 'M', 75, 99, 'Muito Alto', 48.90, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('88967a2e-5c5c-58ae-9aaf-6deddd219392', 'F', 20, 24, 'Muito Baixo', 0.00, 18.79, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('8d9c05c2-fd8c-559c-b7ac-31f79bd58946', 'F', 20, 24, 'Baixo', 18.80, 25.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('73035116-419c-591e-b314-f25f7c1573f5', 'F', 20, 24, 'Médio', 25.40, 38.49, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('f63ceb78-0f82-5bef-89a5-4c87db1bdea6', 'F', 20, 24, 'Alto', 38.50, 45.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('ec21fa5c-2586-5f6a-829c-0e5d07aede55', 'F', 20, 24, 'Muito Alto', 45.10, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('6bb9ccc9-8ee5-53ad-89fe-f50cdafa9491', 'F', 25, 29, 'Muito Baixo', 0.00, 21.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('69de5897-cac8-51f5-8857-4c80be157911', 'F', 25, 29, 'Baixo', 21.20, 27.49, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('e02e1136-91da-5a54-b6a0-bccbb7c5abde', 'F', 25, 29, 'Médio', 27.50, 40.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('b15fb244-afc1-555b-a50a-f31b33cb912a', 'F', 25, 29, 'Alto', 40.10, 46.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('4010dedc-d03f-5894-85f8-04b30a9fdae3', 'F', 25, 29, 'Muito Alto', 46.40, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('536f950b-c798-5f62-b050-0c6e39397c71', 'F', 30, 34, 'Muito Baixo', 0.00, 18.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('590f513e-a194-54ea-9dd9-68d2df1f7edb', 'F', 30, 34, 'Baixo', 18.30, 26.99, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('38b4cb4c-1323-5ac9-963d-92c0b4dace7e', 'F', 30, 34, 'Médio', 27.00, 44.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('1c336800-3911-5276-b50f-8c8ab54d6fa8', 'F', 30, 34, 'Alto', 44.40, 53.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('da544e48-c81d-5e6a-959a-dbd92adf0516', 'F', 30, 34, 'Muito Alto', 53.10, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('9ab9afd5-07ad-559f-8fc3-25152c50c406', 'F', 35, 39, 'Muito Baixo', 0.00, 23.79, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('1b770af7-92f3-5797-a8ab-52801f031f0f', 'F', 35, 39, 'Baixo', 23.80, 28.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('08a5593b-effe-5f09-ab59-ac5c3a8fb0ea', 'F', 35, 39, 'Médio', 28.70, 38.49, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('6cec3a3c-e3a4-57fa-baed-99ce62c4e085', 'F', 35, 39, 'Alto', 38.50, 43.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('422c2c86-3e4b-55e4-8b19-919e12ea6e34', 'F', 35, 39, 'Muito Alto', 43.40, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('4a1e88c5-e8ee-50a2-b5e3-272af7b3012f', 'F', 40, 44, 'Muito Baixo', 0.00, 19.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('f630fd18-1bf0-5351-bfd9-39d1d40c5833', 'F', 40, 44, 'Baixo', 19.70, 25.79, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('e8ae0e68-00e6-56bb-8620-575f7486e552', 'F', 40, 44, 'Médio', 25.80, 38.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('fdd96f6c-277b-5783-b7ce-529c9bc823e8', 'F', 40, 44, 'Alto', 38.10, 44.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('8a1bea22-246e-544f-abb5-dc1ac256751c', 'F', 40, 44, 'Muito Alto', 44.20, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('f0e531e6-25ee-5bc0-ac06-6f861cce067f', 'F', 45, 49, 'Muito Baixo', 0.00, 14.49, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('e43c4d35-6e47-5ebd-a287-98dedf0e15ec', 'F', 45, 49, 'Baixo', 14.50, 21.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('ea790c5a-a974-52a7-9f60-d03b9402cd2c', 'F', 45, 49, 'Médio', 21.40, 35.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('b689e5b5-0786-5773-be09-17c38e7074df', 'F', 45, 49, 'Alto', 35.10, 41.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('7ee919ef-bcbd-5ec5-bcb3-76dd04a0a4ae', 'F', 45, 49, 'Muito Alto', 41.90, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('d534c4ba-6f2b-503a-b9c4-e5e1336741a7', 'F', 50, 54, 'Muito Baixo', 0.00, 19.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('da5f163c-c20b-5427-92c8-ed8ec417bd65', 'F', 50, 54, 'Baixo', 19.30, 24.59, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('20fe85df-05ca-5280-ba4a-37bbfbaa3f48', 'F', 50, 54, 'Médio', 24.60, 35.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('d7a6db43-2440-537f-83b8-d79862521bf9', 'F', 50, 54, 'Alto', 35.10, 40.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('a566237d-b26a-53b2-9e2b-9a6c736aaaf0', 'F', 50, 54, 'Muito Alto', 40.40, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('5c5d7992-dd7b-5399-b548-8f3ab8095d91', 'F', 55, 59, 'Muito Baixo', 0.00, 14.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('fdbce746-315f-5229-8930-0880f2fde783', 'F', 55, 59, 'Baixo', 14.70, 20.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('fa27d6f4-6415-55d5-8d89-133f3b4a4775', 'F', 55, 59, 'Médio', 20.30, 31.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('794e3def-fddf-5054-89c3-5859f3dba57f', 'F', 55, 59, 'Alto', 31.70, 37.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('9f365f8a-0c10-5ea7-b58f-4b35f9a99542', 'F', 55, 59, 'Muito Alto', 37.30, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('ede6380d-b324-54d9-bd89-d12536ab1470', 'F', 60, 64, 'Muito Baixo', 0.00, 15.79, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('44023e27-7436-52be-af06-d3825f5be7af', 'F', 60, 64, 'Baixo', 15.80, 20.39, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('0f23e4ad-f399-524e-8061-dce065ee39a9', 'F', 60, 64, 'Médio', 20.40, 29.59, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('fce8ef26-e163-5c4a-88c5-d5c23e461db1', 'F', 60, 64, 'Alto', 29.60, 34.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('9ad573eb-0b2b-5906-953e-8b93a7051735', 'F', 60, 64, 'Muito Alto', 34.20, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('c900b506-3679-52a8-85b3-643c677cc2f4', 'F', 65, 69, 'Muito Baixo', 0.00, 13.69, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('5d2907ce-bc27-5434-afb1-4fc7dbb05abc', 'F', 65, 69, 'Baixo', 13.70, 18.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('4ce516fa-7b9c-5ff8-8ce9-b7ad8c7895aa', 'F', 65, 69, 'Médio', 18.10, 26.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('1b65b78d-f4f6-546a-86ad-e78749d6e776', 'F', 65, 69, 'Alto', 26.90, 31.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('b757b093-fac2-55c0-bd9c-8ac379f3bfb8', 'F', 65, 69, 'Muito Alto', 31.30, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('002c9aee-5944-5d57-9518-23a38d4a9462', 'F', 70, 74, 'Muito Baixo', 0.00, 11.89, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('64d867b6-3bcc-5aff-9f8d-d7d286819e5c', 'F', 70, 74, 'Baixo', 11.90, 17.19, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('e2aecc4e-c47e-5beb-a2a9-ccbfeee0e1d1', 'F', 70, 74, 'Médio', 17.20, 27.79, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('412d0eef-8885-52b6-9d7b-d43bd32ef96a', 'F', 70, 74, 'Alto', 27.80, 33.09, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('bd59c33d-9e3b-5de4-87d2-102896e2cc1b', 'F', 70, 74, 'Muito Alto', 33.10, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('dc228cab-e579-5793-9e62-c10fccf96041', 'F', 75, 99, 'Muito Baixo', 0.00, 9.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('09597e54-7164-51e9-b57d-bda5bbd00f5b', 'F', 75, 99, 'Baixo', 9.30, 14.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('f8f934f7-8c04-5420-9c03-d83bc3e0afe8', 'F', 75, 99, 'Médio', 14.30, 24.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('5b07d9bc-896a-553b-a21c-da962c37d35e', 'F', 75, 99, 'Alto', 24.30, 29.29, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)'),
  ('39d66adf-31bc-5854-b546-22cd763daa7c', 'F', 75, 99, 'Muito Alto', 29.30, 150.00, 'Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)')
on conflict (id) do nothing;

-- Verificação pós-insert: garante que TODAS as linhas do seed existem no banco
-- (pega aplicação parcial; não valida valores de linhas pré-existentes com
-- mesmo id — cenário coberto pelo precheck + rollback por id documentado).
do $$
declare
  vo2_ok int;
  hg_ok int;
begin
  select count(*) into vo2_ok from public.vo2_reference_ranges
   where id in ('b829e86d-35d3-53b9-a44a-ff55b341413a', 'c0737b8e-6ace-5bee-b81f-987c64c9867d', 'c435bf82-35b2-55c1-ba54-1c147b6c4ac8', '054cb8b7-dd8f-5b8d-9316-59f6c30cd649', 'ea95eeac-7997-52f8-b1fb-2b0e8da4681f', '587d21f1-12ab-5281-be81-e1e55ee5a33c', '36a19ef5-eb8c-5c98-a300-bc94689e9099', '6a0bf2a6-6e54-58b6-9dcc-458d19713233', '33b0a0b9-d810-57a7-b73d-eb990c3297a1', 'ee61e985-244e-5183-bf06-b21434f5de9d', 'ca0b5b6a-5a64-57e8-9bc7-3881fc6b67c2', 'f8a25f3a-d5f5-5d6a-befd-690e1478a398', '5ab9f8ac-9113-59ca-850f-17f5cf3831c2', 'e254c3bb-9817-5ea7-880e-218cca276803', 'bdf14b9a-4603-5bbd-b967-1494334eed8f', 'e7518ac6-4e91-5c79-8675-e718ff06f917', '43de6300-8526-5bc6-9ad7-dcb40663546e', '34bfc33e-71e7-5eb8-ad1a-2e5864c7da28', 'd16c58d5-ec1d-5177-8e14-2ec1bbc6f0dc', '399f3f55-04e7-5a06-8834-11293a773000', '51ae30d5-58db-5cdd-9344-0313dd3c71f2', 'bfe4050a-50a0-5b08-b94e-1c64ef3486d1', '0f261912-4cd7-5906-8ae6-2a59df6e1f76', '7b159fc0-500f-59a8-a31e-ade9333773f3', '02db2d6b-f81f-56be-b082-ded62925249b', '98b5d00c-8c43-56ce-b079-185d709d7200', '6a7b014f-b7cf-5c34-b13e-07bd9c3491c1', '71ccdd8f-5e4a-5872-ad67-d1f8e70f1058', '2613180d-a8f5-5e40-a0f6-dbd3f6805324', '6be734aa-a0a3-5bcf-aacc-0b5467f42b69', '62f1b568-c357-54d0-879f-34fdf305e22d', '0e6336ad-d6d5-5f8e-83a1-33e3a2e416d5', '7eb96667-3e25-5133-9603-46bd75182095', '32d533d6-d5b7-573a-a3da-4da67f0c6b7b', 'cf6ac40e-9b37-5982-bd3d-1accb0971355', '8e2e5ac9-0649-595e-9d8d-1e909135e3f8', '1fea727c-63c9-5d4d-a9d0-feed2587cbd1', '23c6a6e4-bc48-59c7-baf8-b02fa414de1c', 'bb4a9f62-4daa-5d47-a9a9-4c9ca5d0c4d4', 'eacafac0-a995-5549-b4ad-5e9c1a7ccb0a', '2e422162-0e58-503b-ba8c-ae74fe4aab25', '599d5b46-953f-5502-b1e5-77de227e3cb2', 'fe6b2ea9-09da-5c4c-89a3-76a52b997189', '1a79bbe0-cede-5dd2-ba0c-021655de5b99', '4f887e04-5b53-51c1-bc41-f01614e530ed', '6c233c5b-f8fa-59f6-86ff-aff951d913d3', 'd3f0da7e-3b26-51e0-9446-bb6ce7a9473a', 'f0f49d2b-4382-5891-85b1-44b9ea017823', 'c2837db9-f3fb-5b6d-8402-bf444120806b', '25874392-7d13-55c5-a5af-d29649eb90de', 'd9361284-c32d-56e6-958f-c0e3c4861508', '1f149769-ffe9-5021-b395-c831e43224c0', '2e42dd1b-cf25-51a6-8544-c5190f02091b', 'c66cdc5e-365a-5b86-8a05-253a75c896da', '597f2464-8f00-52a1-80cc-ca5a5e4ce25e', 'e9b1f891-18d1-5c29-9236-b8f93e04ed77', '16d57633-ea4f-5080-89e9-9e9f3bc9bccd', '53b2123e-e820-5a3f-be0b-1c61d12873d7', 'c67b102e-0b8b-5d5e-b25b-6f3dec4c9640', 'f0a523a2-eb7a-5654-af0d-3b6fb503578c', '25d63f7e-3dc9-5304-8265-778ab1b2985a', '93e7126d-6a9a-5a81-acd4-6a0faabcd5d0', '1afac960-58a6-568a-86b6-d4c68c4816ba', '05f17dfd-5393-5d40-9bf6-e3d836bfa073', 'b6dc9604-3e00-55f7-8c99-dd34f18f6a58', '467ac0af-806f-5c58-bf1c-6ff922fa90d8', '79379ab2-28f3-5af9-abc3-9ba405f6ff53', '6c4f08b4-cc91-5b3c-ac4a-7c8ff9b9d2a6', '590d63b2-d414-5f69-8eae-64543ae1b687', '3969b27d-630e-58f5-b6bd-b317286f059e', 'dda06666-d736-5c3a-a5fa-b7b5c548981a', '87debec6-5346-5e9f-81c8-0f4a2ec1dd4a');
  select count(*) into hg_ok from public.handgrip_reference_ranges
   where id in ('33f95f17-c617-580f-a87f-b9cc840b0027', '387cd383-b165-5073-9d90-3c09f331ed18', '2e2cc14e-c5c5-55c3-a638-f9870c39fd18', '9b60de02-15f9-531d-b6c4-3d3c67c4b326', '632b1ebe-1752-55df-8a75-0110475e1545', 'a6b97cd6-ad34-5ce7-a1cf-30998f54d905', '2ef4ff74-f434-5d8f-9522-3cac9693ecb3', '0716e4d4-a666-5f0d-a5b6-05a66c923908', '11d8e528-ea3f-556a-9b7b-5f11abb8ac26', '351a43b3-aa0f-5cde-ae27-677f253058e4', '0211bcea-9b13-5d85-a950-ba23c85037ef', '1b08898a-2764-5294-998f-97252ce917f6', '48bd32ea-72e4-582b-b499-0af02dc5edac', 'd10962ca-8cb9-5f86-9918-a55c52f398fd', '67530fff-06a2-5be2-beb6-2c0524034b02', 'c1c57dac-0a4b-5d84-ba56-96b3206cccb8', 'e9718a2f-fcf2-506d-a0c3-2cca7df01890', 'da497de1-25f4-5ba9-8a6b-c122040f6a5f', 'f213df58-2b37-5fe6-b04d-737cbf1acda4', '61b35477-3a80-597d-882f-8f47b01963d4', 'e7220802-7b73-5512-95a5-95e3fca07412', 'abeb02b8-d423-56d8-ae1b-699f2788412a', '64695356-2511-55bd-b092-b73096d2df59', '493b1433-9b10-5fcc-a1bd-8b383225bcd4', 'c2609c3f-2c67-561c-bdbe-f4c07929be16', 'cec18e62-352d-5cbe-83b0-638ee053f242', '63dde9b4-df30-5896-9d78-87ed7152519a', '89963208-6dd8-5643-9e3f-40df9dbef1a6', 'bfd50df3-dde5-5b4e-bb35-95099b287150', '2fdb95cc-2618-5e5d-815b-0ffa968e1270', '3f4571b3-807a-5ed3-8450-87b00c22ccc0', '8d51d0b1-a42e-58b2-bc71-6fd425bdd273', '2c62710a-4208-5c0b-8674-0adb9358e8ff', 'ba1f04a9-521e-55df-b59b-6d86e8369c18', 'c4a8fc32-373b-576a-99eb-8d8207bba0df', 'efbce8bb-a177-51d9-aa26-7286516b9cfa', 'd4cb9912-d224-5824-82cf-c13945d68327', '42a5f8a7-aa23-5cdc-8805-44880cdaf8fd', '566e1963-d22d-524f-b025-ede68091a1f7', 'f0251476-607a-5f3a-88c3-4fdba3984b71', '2a829306-b2c2-5ac5-a1ab-369173593ee4', '59745f85-3ad5-58c0-8272-e9b1fab6efc9', '27c3cf8a-cb89-5033-8b6e-b03fe1c958d2', '4ce83d56-95ed-5c99-9225-4191cb5752e5', '86a80b88-01db-5290-ae53-e956b30f8bf4', '76bf893a-cb7a-5268-baf9-da7e47db956d', 'dcf631cf-6a15-5814-93db-ffd7294bc00e', '38b64f89-cc0f-57d6-a2cd-f08f5c51519c', 'ce049804-df6b-5d75-8524-2fed9959e1d3', 'dfe5043c-c7bf-55bb-9080-222a06c1ec5b', '428faa6f-8504-5410-ad1a-7b40f4733e2b', '2249d2d2-7e26-557b-9123-c9ad15b9db2f', 'adc5b5af-64f3-53f4-afe5-d5f83de5d10c', 'b13c1cc9-dad3-5412-8c06-c3a999adbdbe', '042646d1-d0b0-54cc-b31d-978d8d29d9e2', 'c0c1f07a-a72e-5a89-aa82-4309dabf2369', '211b9f7c-64cf-5032-9dc7-fd9c8d804b8d', '4aac9826-dc81-5caf-b3be-51e034b2ffaf', '1c471fcb-c988-5437-af93-290e61ac1b28', '334501a0-8d38-5206-8fc1-04b5f1e4ccd8', '88967a2e-5c5c-58ae-9aaf-6deddd219392', '8d9c05c2-fd8c-559c-b7ac-31f79bd58946', '73035116-419c-591e-b314-f25f7c1573f5', 'f63ceb78-0f82-5bef-89a5-4c87db1bdea6', 'ec21fa5c-2586-5f6a-829c-0e5d07aede55', '6bb9ccc9-8ee5-53ad-89fe-f50cdafa9491', '69de5897-cac8-51f5-8857-4c80be157911', 'e02e1136-91da-5a54-b6a0-bccbb7c5abde', 'b15fb244-afc1-555b-a50a-f31b33cb912a', '4010dedc-d03f-5894-85f8-04b30a9fdae3', '536f950b-c798-5f62-b050-0c6e39397c71', '590f513e-a194-54ea-9dd9-68d2df1f7edb', '38b4cb4c-1323-5ac9-963d-92c0b4dace7e', '1c336800-3911-5276-b50f-8c8ab54d6fa8', 'da544e48-c81d-5e6a-959a-dbd92adf0516', '9ab9afd5-07ad-559f-8fc3-25152c50c406', '1b770af7-92f3-5797-a8ab-52801f031f0f', '08a5593b-effe-5f09-ab59-ac5c3a8fb0ea', '6cec3a3c-e3a4-57fa-baed-99ce62c4e085', '422c2c86-3e4b-55e4-8b19-919e12ea6e34', '4a1e88c5-e8ee-50a2-b5e3-272af7b3012f', 'f630fd18-1bf0-5351-bfd9-39d1d40c5833', 'e8ae0e68-00e6-56bb-8620-575f7486e552', 'fdd96f6c-277b-5783-b7ce-529c9bc823e8', '8a1bea22-246e-544f-abb5-dc1ac256751c', 'f0e531e6-25ee-5bc0-ac06-6f861cce067f', 'e43c4d35-6e47-5ebd-a287-98dedf0e15ec', 'ea790c5a-a974-52a7-9f60-d03b9402cd2c', 'b689e5b5-0786-5773-be09-17c38e7074df', '7ee919ef-bcbd-5ec5-bcb3-76dd04a0a4ae', 'd534c4ba-6f2b-503a-b9c4-e5e1336741a7', 'da5f163c-c20b-5427-92c8-ed8ec417bd65', '20fe85df-05ca-5280-ba4a-37bbfbaa3f48', 'd7a6db43-2440-537f-83b8-d79862521bf9', 'a566237d-b26a-53b2-9e2b-9a6c736aaaf0', '5c5d7992-dd7b-5399-b548-8f3ab8095d91', 'fdbce746-315f-5229-8930-0880f2fde783', 'fa27d6f4-6415-55d5-8d89-133f3b4a4775', '794e3def-fddf-5054-89c3-5859f3dba57f', '9f365f8a-0c10-5ea7-b58f-4b35f9a99542', 'ede6380d-b324-54d9-bd89-d12536ab1470', '44023e27-7436-52be-af06-d3825f5be7af', '0f23e4ad-f399-524e-8061-dce065ee39a9', 'fce8ef26-e163-5c4a-88c5-d5c23e461db1', '9ad573eb-0b2b-5906-953e-8b93a7051735', 'c900b506-3679-52a8-85b3-643c677cc2f4', '5d2907ce-bc27-5434-afb1-4fc7dbb05abc', '4ce516fa-7b9c-5ff8-8ce9-b7ad8c7895aa', '1b65b78d-f4f6-546a-86ad-e78749d6e776', 'b757b093-fac2-55c0-bd9c-8ac379f3bfb8', '002c9aee-5944-5d57-9518-23a38d4a9462', '64d867b6-3bcc-5aff-9f8d-d7d286819e5c', 'e2aecc4e-c47e-5beb-a2a9-ccbfeee0e1d1', '412d0eef-8885-52b6-9d7b-d43bd32ef96a', 'bd59c33d-9e3b-5de4-87d2-102896e2cc1b', 'dc228cab-e579-5793-9e62-c10fccf96041', '09597e54-7164-51e9-b57d-bda5bbd00f5b', 'f8f934f7-8c04-5420-9c03-d83bc3e0afe8', '5b07d9bc-896a-553b-a21c-da962c37d35e', '39d66adf-31bc-5854-b546-22cd763daa7c');
  if vo2_ok <> 72 or hg_ok <> 120 then
    raise exception 'POSCHECK FATAL: seed incompleto — vo2 %/72, handgrip %/120', vo2_ok, hg_ok;
  end if;
  raise notice 'Seed OK: % linhas vo2 + % linhas handgrip presentes', vo2_ok, hg_ok;
end $$;
