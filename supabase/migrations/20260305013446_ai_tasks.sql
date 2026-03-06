-- Fase 0: ai_tasks — log de requests, rate-limit e dedup
CREATE TABLE public.ai_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source           TEXT NOT NULL DEFAULT 'ai-builder-chat',
  intent           TEXT NOT NULL CHECK (intent IN ('conversation', 'planning', 'build')),
  message          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  github_issue_url TEXT,
  github_pr_url    TEXT,
  error            TEXT
);
CREATE INDEX idx_ai_tasks_created_by    ON public.ai_tasks (created_by);
CREATE INDEX idx_ai_tasks_created_at    ON public.ai_tasks (created_at);
CREATE INDEX idx_ai_tasks_intent_status ON public.ai_tasks (intent, status);
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_tasks"
  ON public.ai_tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));
CREATE OR REPLACE VIEW public.ai_tasks_rate_limit AS
  SELECT created_by, COUNT(*) AS requests_last_hour
  FROM public.ai_tasks
  WHERE created_at > now() - INTERVAL '1 hour'
  GROUP BY created_by;
