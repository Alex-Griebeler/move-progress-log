
-- Create ai_project_memory table
CREATE TABLE public.ai_project_memory (
  key text PRIMARY KEY,
  content text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_project_memory ENABLE ROW LEVEL SECURITY;

-- Only service role can read (edge functions with service role)
CREATE POLICY "service role access"
ON public.ai_project_memory
FOR SELECT
USING (auth.role() = 'service_role');

-- Seed data
INSERT INTO public.ai_project_memory (key, content) VALUES
('architecture', 'Frontend uses React + Vite + TypeScript. Backend uses Supabase (Postgres + Edge Functions). GitHub automation runs an AI engineer pipeline that reads GitHub issues and generates pull requests.'),
('coding_standards', 'Use TypeScript everywhere. Use React functional components. Tailwind CSS for styling. React Query for server state. Organize code using src/features/<feature-name>.'),
('supabase_schema', 'Core tables include athletes, training_sessions, exercise_logs, and progress_metrics. All schema changes must happen through migrations. Never modify tables directly.'),
('features_overview', 'Main features include athlete tracking, training progress analytics, recovery insights, and the AI Builder internal development assistant.'),
('ai_behavior', 'The AI must classify requests as conversation, planning, or build. Only create GitHub issues when the intent is build. Suggest improvements when appropriate.');
