-- Create recovery protocols table
CREATE TABLE IF NOT EXISTS public.recovery_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  duration_minutes integer NOT NULL,
  benefits jsonb,
  contraindications text,
  instructions text NOT NULL,
  scientific_references text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create protocol recommendations table
CREATE TABLE IF NOT EXISTS public.protocol_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  protocol_id uuid NOT NULL REFERENCES public.recovery_protocols(id) ON DELETE CASCADE,
  recommended_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  applied boolean DEFAULT false,
  trainer_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create oura metrics table
CREATE TABLE IF NOT EXISTS public.oura_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL,
  readiness_score integer CHECK (readiness_score >= 0 AND readiness_score <= 100),
  sleep_score integer CHECK (sleep_score >= 0 AND sleep_score <= 100),
  hrv_balance numeric,
  resting_heart_rate integer,
  temperature_deviation numeric,
  activity_balance numeric,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Create adaptation rules table
CREATE TABLE IF NOT EXISTS public.adaptation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  condition text NOT NULL,
  threshold_value numeric NOT NULL,
  action_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recovery_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recovery_protocols (public read, authenticated full access)
CREATE POLICY "Anyone can view recovery protocols"
  ON public.recovery_protocols FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users manage protocols"
  ON public.recovery_protocols FOR ALL
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for protocol_recommendations
CREATE POLICY "Trainers manage own student recommendations"
  ON public.protocol_recommendations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = protocol_recommendations.student_id
      AND (students.trainer_id = auth.uid() OR students.trainer_id IS NULL)
    )
  );

-- RLS Policies for oura_metrics
CREATE POLICY "Trainers access own student metrics"
  ON public.oura_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = oura_metrics.student_id
      AND (students.trainer_id = auth.uid() OR students.trainer_id IS NULL)
    )
  );

-- RLS Policies for adaptation_rules
CREATE POLICY "Authenticated users access adaptation rules"
  ON public.adaptation_rules FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_oura_metrics_student_date ON public.oura_metrics(student_id, date DESC);
CREATE INDEX idx_protocol_recommendations_student ON public.protocol_recommendations(student_id, recommended_date DESC);

-- Insert default recovery protocols
INSERT INTO public.recovery_protocols (name, category, subcategory, duration_minutes, benefits, contraindications, instructions, scientific_references) VALUES
('Sauna Seca', 'Termoterapia', 'Sauna', 20, '{"hrv": "increase", "sleep_quality": "increase", "cardiovascular": "improve", "detoxification": "increase"}', 'Hipertensão descontrolada, problemas cardíacos graves, gravidez', '1. Pré-aqueça a sauna (80-100°C)\n2. Hidrate-se bem antes\n3. Sessões de 15-20 minutos\n4. Resfrie gradualmente após\n5. Hidrate novamente', 'Laukkanen et al. (2015) JAMA Internal Medicine - Sauna use associated with reduced cardiovascular mortality'),

('Sauna a Vapor', 'Termoterapia', 'Sauna', 20, '{"respiratory": "improve", "skin_health": "increase", "relaxation": "increase", "circulation": "improve"}', 'Asma grave, problemas respiratórios agudos, hipertensão descontrolada', '1. Temperatura entre 40-50°C\n2. Umidade elevada (100%)\n3. Sessões de 15-20 minutos\n4. Respire profundamente\n5. Hidrate após', 'Pilch et al. (2014) Journal of Human Kinetics - Steam sauna effects on recovery'),

('Imersão no Gelo', 'Termoterapia', 'Crioterapia', 10, '{"inflammation": "decrease", "recovery": "increase", "pain": "decrease", "immune_system": "boost"}', 'Doença de Raynaud, feridas abertas, neuropatia periférica', '1. Água entre 10-15°C\n2. Imersão de 3-10 minutos\n3. Comece com períodos curtos\n4. Respire calmamente\n5. Aqueça-se gradualmente', 'Machado et al. (2016) Sports Medicine - Cold water immersion for recovery'),

('Contraste Quente-Frio', 'Termoterapia', 'Contraste', 21, '{"circulation": "increase", "recovery": "increase", "inflammation": "decrease", "muscle_soreness": "decrease"}', 'Problemas cardiovasculares, trombose, gravidez', '1. 3 minutos água quente (38-42°C)\n2. 1 minuto água fria (10-15°C)\n3. Repita 3 vezes\n4. Termine com frio\n5. Total: 12-21 minutos', 'Bieuzen et al. (2013) European Journal of Applied Physiology'),

('Contraste Frio-Quente', 'Termoterapia', 'Contraste', 21, '{"energy": "increase", "alertness": "increase", "recovery": "increase", "circulation": "improve"}', 'Problemas cardiovasculares, trombose', '1. 3 minutos água fria (10-15°C)\n2. 1 minuto água quente (38-42°C)\n3. Repita 3 vezes\n4. Termine com quente para relaxamento\n5. Total: 12-21 minutos', 'Versey et al. (2013) Sports Medicine - Water immersion recovery'),

('Box Breathing', 'Respiração', 'Regulação', 10, '{"hrv": "increase", "stress": "decrease", "focus": "increase", "anxiety": "decrease"}', 'Nenhuma conhecida', '1. Inspire por 4 segundos\n2. Segure por 4 segundos\n3. Expire por 4 segundos\n4. Segure vazio por 4 segundos\n5. Repita por 5-10 minutos', 'Steffen et al. (2017) Frontiers in Psychology - Box breathing effects'),

('Wim Hof', 'Respiração', 'Energizante', 15, '{"energy": "increase", "inflammation": "decrease", "immune_system": "boost", "stress_resilience": "increase"}', 'Epilepsia, gravidez, histórico de desmaios', '1. 30-40 respirações profundas rápidas\n2. Expire e segure vazio (1-3 min)\n3. Inspire fundo e segure (10-15s)\n4. Repita 3-4 rounds\n5. Faça deitado', 'Kox et al. (2014) PNAS - Voluntary activation of sympathetic nervous system'),

('Coerência Cardíaca', 'Respiração', 'HRV', 5, '{"hrv": "increase", "anxiety": "decrease", "blood_pressure": "decrease", "emotional_regulation": "improve"}', 'Nenhuma conhecida', '1. Inspire por 5 segundos\n2. Expire por 5 segundos\n3. 6 respirações por minuto\n4. Foque no coração\n5. Pratique 5 minutos, 3x ao dia', 'McCraty & Zayas (2014) Psychophysiology - Cardiac coherence and autonomic function'),

('Mindfulness Meditation', 'Mindfulness', 'Meditação', 15, '{"stress": "decrease", "focus": "increase", "emotional_regulation": "improve", "sleep_quality": "increase", "anxiety": "decrease"}', 'Nenhuma (adaptar em casos de trauma severo)', '1. Sente-se confortavelmente\n2. Foque na respiração natural\n3. Observe pensamentos sem julgamento\n4. Retorne suavemente ao foco\n5. Pratique 10-20 minutos diários', 'Goyal et al. (2014) JAMA Internal Medicine - Meditation programs for psychological stress'),

('Body Scan Mindfulness', 'Mindfulness', 'Consciência Corporal', 20, '{"body_awareness": "increase", "tension": "decrease", "sleep_quality": "increase", "pain_management": "improve"}', 'Nenhuma', '1. Deite-se confortavelmente\n2. Escaneie mentalmente cada parte do corpo\n3. Note sensações sem julgar\n4. Relaxe áreas tensas\n5. Da cabeça aos pés (20 min)', 'Kabat-Zinn (2013) Full Catastrophe Living - Mindfulness-based stress reduction'),

('Cardio Zona 2', 'Atividade Leve', 'Aeróbico', 40, '{"recovery": "increase", "aerobic_capacity": "improve", "fat_burning": "increase", "mitochondrial_health": "improve"}', 'Lesões agudas não tratadas', '1. 60-70% da FCmax\n2. Deve conseguir conversar\n3. 30-45 minutos\n4. Bike, corrida leve, remo\n5. Frequência: 3-4x/semana', 'Seiler & Tønnessen (2009) International Journal of Sports Physiology - Zone 2 training'),

('Yoga Flow', 'Atividade Leve', 'Mobilidade', 30, '{"mobility": "increase", "stress": "decrease", "recovery": "increase", "balance": "improve"}', 'Lesões agudas, consulte antes se tiver limitações', '1. Sequência de posturas fluidas\n2. Sincronize movimento e respiração\n3. Foque em mobilidade, não força\n4. 20-40 minutos\n5. Adapte à sua condição', 'Cramer et al. (2013) American Journal of Epidemiology - Yoga for health'),

('Caminhada Recuperativa', 'Atividade Leve', 'Low Impact', 45, '{"circulation": "improve", "cortisol": "decrease", "mood": "improve", "recovery": "increase"}', 'Nenhuma', '1. Ritmo confortável\n2. 30-60 minutos\n3. Ao ar livre se possível\n4. Sem inclinações intensas\n5. Foque em relaxar', 'Hanson & Jones (2015) American Journal of Preventive Medicine - Walking benefits');

-- Insert default adaptation rules
INSERT INTO public.adaptation_rules (metric_name, condition, threshold_value, action_type, severity, description) VALUES
('readiness_score', 'below', 70, 'suggest_light_activity', 'medium', 'Readiness baixo: recomendar atividade leve ou recuperação'),
('readiness_score', 'below', 60, 'suggest_full_rest', 'high', 'Readiness muito baixo: recomendar repouso completo'),
('sleep_score', 'below', 70, 'avoid_intense_training', 'medium', 'Sono ruim: evitar treinos intensos, priorizar recuperação'),
('hrv_balance', 'below', -10, 'reduce_intensity', 'high', 'HRV baixo: reduzir intensidade e volume de treino'),
('resting_heart_rate', 'above_baseline', 10, 'monitor_stress', 'medium', 'FC repouso elevada: monitorar estresse e considerar recuperação');

-- Create trigger for updated_at
CREATE TRIGGER update_recovery_protocols_updated_at
  BEFORE UPDATE ON public.recovery_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();