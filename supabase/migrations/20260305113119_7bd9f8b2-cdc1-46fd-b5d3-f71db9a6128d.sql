
CREATE TABLE public.ai_builder_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_builder_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own conversations"
  ON public.ai_builder_conversations
  FOR ALL
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_builder_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_builder_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  message_type text,
  issue_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_builder_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access messages via conversation ownership"
  ON public.ai_builder_messages
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.ai_builder_conversations c
    WHERE c.id = ai_builder_messages.conversation_id
    AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_builder_conversations c
    WHERE c.id = ai_builder_messages.conversation_id
    AND c.user_id = auth.uid()
  ));

CREATE INDEX idx_ai_builder_messages_conversation ON public.ai_builder_messages(conversation_id, created_at);
