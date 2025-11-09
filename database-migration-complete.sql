-- =====================================================
-- FABRIK STUDIO - COMPLETE DATABASE MIGRATION SCRIPT
-- =====================================================
-- Este script contém toda a estrutura do banco de dados
-- incluindo tabelas, RLS policies, functions e triggers
-- =====================================================

-- =====================================================
-- 1. CUSTOM TYPES (ENUMS)
-- =====================================================

-- Tipo para roles de usuários
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =====================================================
-- 2. TABLES
-- =====================================================

-- Tabela de perfis de treinadores
CREATE TABLE public.trainer_profiles (
    id uuid NOT NULL PRIMARY KEY,
    full_name text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de roles de usuários
CREATE TABLE public.user_roles (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Tabela de permissões de acesso entre treinadores
CREATE TABLE public.trainer_access_permissions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    can_view_prescriptions boolean DEFAULT true,
    can_edit_prescriptions boolean DEFAULT false,
    granted_at timestamp with time zone DEFAULT now()
);

-- Tabela de alunos
CREATE TABLE public.students (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id uuid NOT NULL,
    name text NOT NULL,
    birth_date date,
    height_cm numeric,
    weight_kg numeric,
    max_heart_rate integer,
    fitness_level text,
    objectives text,
    limitations text,
    preferences text,
    injury_history text,
    weekly_sessions_proposed integer DEFAULT 2,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de convites para alunos
CREATE TABLE public.student_invites (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id uuid NOT NULL,
    email text,
    invite_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean DEFAULT false,
    used_at timestamp with time zone,
    created_student_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabela de observações de alunos
CREATE TABLE public.student_observations (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    observation_text text NOT NULL,
    categories text[],
    severity text,
    session_id uuid,
    exercise_id uuid,
    created_by uuid,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabela de biblioteca de exercícios
CREATE TABLE public.exercises_library (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    movement_pattern text NOT NULL,
    movement_plane text,
    laterality text,
    contraction_type text,
    level text,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de prescrições de treino
CREATE TABLE public.workout_prescriptions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id uuid NOT NULL,
    name text NOT NULL,
    objective text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de exercícios da prescrição
CREATE TABLE public.prescription_exercises (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id uuid NOT NULL,
    exercise_library_id uuid NOT NULL,
    order_index integer NOT NULL,
    sets text NOT NULL,
    reps text NOT NULL,
    pse text,
    interval_seconds integer,
    training_method text,
    observations text,
    group_with_previous boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de atribuições de prescrição
CREATE TABLE public.prescription_assignments (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id uuid NOT NULL,
    student_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date,
    custom_adaptations jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de adaptações de exercícios
CREATE TABLE public.exercise_adaptations (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_exercise_id uuid NOT NULL,
    exercise_library_id uuid NOT NULL,
    adaptation_type text NOT NULL,
    sets text,
    reps text,
    pse text,
    interval_seconds integer,
    observations text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de sessões de treino
CREATE TABLE public.workout_sessions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    date date NOT NULL,
    time time without time zone NOT NULL,
    workout_name text,
    room_name text,
    trainer_name text,
    prescription_id uuid,
    is_finalized boolean DEFAULT false,
    can_reopen boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de exercícios executados
CREATE TABLE public.exercises (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    exercise_name text NOT NULL,
    sets integer,
    reps integer,
    load_kg numeric,
    load_description text,
    load_breakdown text,
    observations text,
    is_best_set boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de segmentos de áudio da sessão
CREATE TABLE public.session_audio_segments (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    segment_order integer NOT NULL,
    raw_transcription text NOT NULL,
    edited_transcription text,
    audio_duration_seconds integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de protocolos de recuperação
CREATE TABLE public.recovery_protocols (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text NOT NULL,
    subcategory text,
    duration_minutes integer NOT NULL,
    instructions text NOT NULL,
    benefits jsonb,
    contraindications text,
    scientific_references text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de recomendações de protocolo
CREATE TABLE public.protocol_recommendations (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    protocol_id uuid NOT NULL,
    recommended_date date NOT NULL DEFAULT CURRENT_DATE,
    reason text NOT NULL,
    priority text NOT NULL,
    trainer_notes text,
    applied boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabela de regras de adaptação
CREATE TABLE public.adaptation_rules (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name text NOT NULL,
    condition text NOT NULL,
    threshold_value numeric NOT NULL,
    severity text NOT NULL,
    action_type text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabela de conexões Oura
CREATE TABLE public.oura_connections (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    connected_at timestamp with time zone DEFAULT now(),
    last_sync_at timestamp with time zone
);

-- Tabela de métricas Oura
CREATE TABLE public.oura_metrics (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    date date NOT NULL,
    readiness_score integer,
    sleep_score integer,
    activity_score integer,
    steps integer,
    active_calories integer,
    total_calories integer,
    met_minutes integer,
    high_activity_time integer,
    medium_activity_time integer,
    low_activity_time integer,
    sedentary_time integer,
    training_volume integer,
    training_frequency integer,
    total_sleep_duration integer,
    deep_sleep_duration integer,
    rem_sleep_duration integer,
    light_sleep_duration integer,
    awake_time integer,
    sleep_efficiency numeric,
    sleep_latency integer,
    resting_heart_rate integer,
    lowest_heart_rate integer,
    average_sleep_hrv numeric,
    average_breath numeric,
    hrv_balance numeric,
    temperature_deviation numeric,
    activity_balance numeric,
    stress_high_time integer,
    recovery_high_time integer,
    spo2_average numeric,
    breathing_disturbance_index numeric,
    vo2_max numeric,
    resilience_level text,
    day_summary text,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabela de workouts Oura
CREATE TABLE public.oura_workouts (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    oura_workout_id text NOT NULL,
    activity text NOT NULL,
    start_datetime timestamp with time zone NOT NULL,
    end_datetime timestamp with time zone NOT NULL,
    calories integer,
    intensity text,
    distance integer,
    average_heart_rate integer,
    max_heart_rate integer,
    source text,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabela de logs de sincronização Oura
CREATE TABLE public.oura_sync_logs (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    sync_date date NOT NULL,
    sync_time timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL,
    metrics_synced jsonb,
    error_message text,
    attempt_number integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de tentativas de rate limiting
CREATE TABLE public.rate_limit_attempts (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address text NOT NULL,
    action text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 1,
    first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
    last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
    blocked_until timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_students_trainer_id ON public.students(trainer_id);
CREATE INDEX idx_workout_sessions_student_id ON public.workout_sessions(student_id);
CREATE INDEX idx_workout_sessions_date ON public.workout_sessions(date);
CREATE INDEX idx_exercises_session_id ON public.exercises(session_id);
CREATE INDEX idx_prescription_exercises_prescription_id ON public.prescription_exercises(prescription_id);
CREATE INDEX idx_oura_metrics_student_date ON public.oura_metrics(student_id, date);
CREATE INDEX idx_oura_workouts_student_id ON public.oura_workouts(student_id);
CREATE INDEX idx_protocol_recommendations_student_id ON public.protocol_recommendations(student_id);

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Função para verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se pode acessar dados de um treinador
CREATE OR REPLACE FUNCTION public.can_access_trainer(_viewer_id uuid, _trainer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _viewer_id = _trainer_id OR
    public.has_role(_viewer_id, 'admin') OR
    EXISTS (
      SELECT 1
      FROM public.trainer_access_permissions
      WHERE trainer_id = _viewer_id 
        AND admin_id = _trainer_id
        AND can_view_prescriptions = true
    )
$$;

-- Função para atualizar coluna updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Função para limpar tentativas de rate limit antigas
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete attempts older than 24 hours
  DELETE FROM public.rate_limit_attempts
  WHERE created_at < now() - interval '24 hours';
  
  -- Delete expired blocks
  DELETE FROM public.rate_limit_attempts
  WHERE blocked_until IS NOT NULL 
    AND blocked_until < now()
    AND last_attempt_at < now() - interval '1 hour';
    
  RAISE NOTICE 'Rate limit cleanup completed';
END;
$$;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at em trainer_profiles
CREATE TRIGGER update_trainer_profiles_updated_at
  BEFORE UPDATE ON public.trainer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em students
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em exercises_library
CREATE TRIGGER update_exercises_library_updated_at
  BEFORE UPDATE ON public.exercises_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em workout_prescriptions
CREATE TRIGGER update_workout_prescriptions_updated_at
  BEFORE UPDATE ON public.workout_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em workout_sessions
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em session_audio_segments
CREATE TRIGGER update_session_audio_segments_updated_at
  BEFORE UPDATE ON public.session_audio_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em recovery_protocols
CREATE TRIGGER update_recovery_protocols_updated_at
  BEFORE UPDATE ON public.recovery_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_access_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_audio_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - trainer_profiles
-- =====================================================

CREATE POLICY "Users can view own profile"
ON public.trainer_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.trainer_profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all trainer profiles"
ON public.trainer_profiles FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES - user_roles
-- =====================================================

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES - trainer_access_permissions
-- =====================================================

CREATE POLICY "Trainers view own permissions"
ON public.trainer_access_permissions FOR SELECT
USING (auth.uid() = trainer_id);

CREATE POLICY "Admins manage permissions"
ON public.trainer_access_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
  )
);

-- =====================================================
-- RLS POLICIES - students
-- =====================================================

CREATE POLICY "Trainers manage own students"
ON public.students FOR ALL
USING (auth.uid() = trainer_id);

-- =====================================================
-- RLS POLICIES - student_invites
-- =====================================================

CREATE POLICY "Trainers manage own invites"
ON public.student_invites FOR ALL
USING (auth.uid() = trainer_id);

-- =====================================================
-- RLS POLICIES - student_observations
-- =====================================================

CREATE POLICY "Trainers access own student observations"
ON public.student_observations FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = student_observations.student_id 
      AND students.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - exercises_library
-- =====================================================

CREATE POLICY "Authenticated users access exercise library"
ON public.exercises_library FOR ALL
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES - workout_prescriptions
-- =====================================================

CREATE POLICY "Access based on roles and permissions"
ON public.workout_prescriptions FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  (auth.uid() = trainer_id) OR
  (EXISTS (
    SELECT 1
    FROM trainer_access_permissions
    WHERE trainer_access_permissions.trainer_id = auth.uid() 
      AND trainer_access_permissions.admin_id = workout_prescriptions.trainer_id 
      AND trainer_access_permissions.can_view_prescriptions = true
  ))
);

CREATE POLICY "Trainers manage own prescriptions"
ON public.workout_prescriptions FOR INSERT
WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers update own prescriptions"
ON public.workout_prescriptions FOR UPDATE
USING (
  (auth.uid() = trainer_id) OR
  (has_role(auth.uid(), 'admin') OR
  (EXISTS (
    SELECT 1
    FROM trainer_access_permissions
    WHERE trainer_access_permissions.trainer_id = auth.uid() 
      AND trainer_access_permissions.admin_id = workout_prescriptions.trainer_id 
      AND trainer_access_permissions.can_edit_prescriptions = true
  )))
);

CREATE POLICY "Trainers delete own prescriptions"
ON public.workout_prescriptions FOR DELETE
USING ((auth.uid() = trainer_id) OR has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES - prescription_exercises
-- =====================================================

CREATE POLICY "Access via prescription ownership"
ON public.prescription_exercises FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM workout_prescriptions wp
    WHERE wp.id = prescription_exercises.prescription_id 
      AND wp.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - prescription_assignments
-- =====================================================

CREATE POLICY "Access via prescription ownership"
ON public.prescription_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM workout_prescriptions wp
    WHERE wp.id = prescription_assignments.prescription_id 
      AND wp.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - exercise_adaptations
-- =====================================================

CREATE POLICY "Access via prescription exercise ownership"
ON public.exercise_adaptations FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM prescription_exercises pe
    JOIN workout_prescriptions wp ON wp.id = pe.prescription_id
    WHERE pe.id = exercise_adaptations.prescription_exercise_id 
      AND wp.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - workout_sessions
-- =====================================================

CREATE POLICY "Access via student ownership"
ON public.workout_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = workout_sessions.student_id 
      AND students.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - exercises
-- =====================================================

CREATE POLICY "Access via session ownership"
ON public.exercises FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM workout_sessions ws
    JOIN students s ON s.id = ws.student_id
    WHERE ws.id = exercises.session_id 
      AND s.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - session_audio_segments
-- =====================================================

CREATE POLICY "Trainers access own student audio segments"
ON public.session_audio_segments FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM workout_sessions ws
    JOIN students s ON s.id = ws.student_id
    WHERE ws.id = session_audio_segments.session_id 
      AND s.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - recovery_protocols
-- =====================================================

CREATE POLICY "Anyone can view recovery protocols"
ON public.recovery_protocols FOR SELECT
USING (true);

CREATE POLICY "Authenticated users manage protocols"
ON public.recovery_protocols FOR ALL
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES - protocol_recommendations
-- =====================================================

CREATE POLICY "Trainers manage own student recommendations"
ON public.protocol_recommendations FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = protocol_recommendations.student_id 
      AND students.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - adaptation_rules
-- =====================================================

CREATE POLICY "Authenticated users access adaptation rules"
ON public.adaptation_rules FOR ALL
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES - oura_connections
-- =====================================================

CREATE POLICY "Trainers access own student connections"
ON public.oura_connections FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = oura_connections.student_id 
      AND students.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - oura_metrics
-- =====================================================

CREATE POLICY "Trainers access own student metrics"
ON public.oura_metrics FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = oura_metrics.student_id 
      AND students.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - oura_workouts
-- =====================================================

CREATE POLICY "Trainers access own student workouts"
ON public.oura_workouts FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = oura_workouts.student_id 
      AND students.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - oura_sync_logs
-- =====================================================

CREATE POLICY "Trainers access own student sync logs"
ON public.oura_sync_logs FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM students
    WHERE students.id = oura_sync_logs.student_id 
      AND students.trainer_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - rate_limit_attempts
-- =====================================================

CREATE POLICY "Service role can manage rate limits"
ON public.rate_limit_attempts FOR ALL
USING (true);

-- =====================================================
-- 7. STORAGE BUCKETS
-- =====================================================

-- Bucket para avatares de alunos (público)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-avatars', 'student-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES - student-avatars
-- =====================================================

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-avatars');

CREATE POLICY "Trainers can upload student avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-avatars' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Trainers can update student avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'student-avatars' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Trainers can delete student avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-avatars' 
  AND auth.uid() IS NOT NULL
);

-- =====================================================
-- 8. GRANTS (Permissões)
-- =====================================================

-- Garantir que usuários autenticados possam acessar as tabelas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- =====================================================
-- Para restaurar este backup:
-- 1. Crie um novo projeto Supabase
-- 2. Execute este script no SQL Editor
-- 3. Configure as variáveis de ambiente
-- 4. Deploy das Edge Functions
-- 5. Configure os secrets necessários
-- =====================================================
