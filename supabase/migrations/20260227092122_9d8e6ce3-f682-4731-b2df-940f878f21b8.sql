
-- Inserir protocolos de respiração com dados científicos completos
INSERT INTO public.breathing_protocols (name, category, technique, rhythm, duration_seconds, instructions, benefits, when_to_use, is_active)
VALUES
(
  'Box Breathing (4-4-4-4)',
  'respiracao',
  'Inspira 4s / Apneia 4s / Expira 4s / Apneia 4s',
  '4-4-4-4',
  240,
  'Pré-bloco de potência. Foco neural antes de esforço máximo.',
  '["Controle autonômico e balanço SNA", "Aumenta HRV e ativa o córtex pré-frontal", "Kumar et al., 2024 — RCT"]'::jsonb,
  ARRAY['pre_workout'],
  true
),
(
  'Respiração de Ressonância (5,5 bpm)',
  'respiracao',
  'Inspira nasal 5s / Expira 5s',
  '5-5',
  300,
  'Recuperação pós-metcon. Intervalo entre séries de força alta intensidade.',
  '["Frequência que maximiza amplitude de HRV por coincidir com frequência do baroreflexo arterial", "Maior redução de FC pós-HIIT vs Box Breathing", "PLOS One, 2025 — 40 sujeitos, crossover RCT"]'::jsonb,
  ARRAY['post_workout', 'intra_workout'],
  true
),
(
  'Suspiro Cíclico (Cyclic Sighing)',
  'respiracao',
  'Inspira nasal + 2ª inspira rápida para preencher alvéolos + Expira longa pela boca (razão 1:2)',
  '1:2',
  300,
  'Pós-bloco de potência. Qualquer momento de alta ativação simpática aguda.',
  '["Reexpande alvéolos colapsados pelo esforço", "Superou meditação e outras técnicas para redução de arousal e melhora de humor em sessão única", "Balban et al., Cell Reports Medicine, 2023 — Stanford"]'::jsonb,
  ARRAY['post_workout', 'intra_workout'],
  true
),
(
  'Respiração Diafragmática I:E Estendida',
  'respiracao',
  'Inspira nasal 4s / Expira 6-8s',
  '4-6 a 4-8',
  300,
  'Encerramento de treino. Transição de blocos de alta para baixa intensidade.',
  '["Expiração prolongada é o vetor primário de ativação vagal", "Quanto maior razão E:I, maior o efeito parassimpático", "Meta-análise de 223 estudos — Laborde et al., Neurosci Biobehav Rev, 2022"]'::jsonb,
  ARRAY['post_workout', 'intra_workout'],
  true
),
(
  'Manobra de Valsalva Controlada',
  'respiracao',
  'Inspira profunda → pressão abdominal sustentada durante fase concêntrica → expira controlada ao final',
  'sustentada',
  10,
  'Exercícios compostos de força máxima: squat, deadlift, press pesado.',
  '["Aumenta pressão intra-abdominal e intratorácica, estabilizando coluna", "Permite maior produção de força", "Blazek et al., Biology of Sport, 2019 — revisão sistemática"]'::jsonb,
  ARRAY['intra_workout'],
  true
),
(
  'Nasal Cadenciada + Visualização',
  'respiracao',
  'Inspira nasal 4s / Expira nasal 6s',
  '4-6',
  300,
  'Encerramento de treinos de força. Transição ativação → recuperação.',
  '["Razão E:I > 1 ativa nervo vago", "Nasal aumenta óxido nítrico e vasodilatação", "Combinada com visualização do padrão técnico consolidado no treino"]'::jsonb,
  ARRAY['post_workout', 'recovery'],
  true
),
(
  'Respiração Locomotiva',
  'respiracao',
  'Inspirações rápidas e curtas pelo nariz, ritmo acelerado',
  'rápido',
  30,
  'Abertura de blocos de potência. Ativação pré-esforço explosivo.',
  '["Alta ativação simpática aguda", "Aumenta estado de alerta e prontidão motora", "Usar por no máximo 30s"]'::jsonb,
  ARRAY['pre_workout'],
  true
)
ON CONFLICT (id) DO NOTHING;
