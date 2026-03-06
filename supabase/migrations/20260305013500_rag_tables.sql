-- Fase 1: RAG — documentos e embeddings do código
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE public.ai_code_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path        TEXT NOT NULL,
  content     TEXT NOT NULL,
  hash        TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (path, chunk_index)
);
CREATE INDEX idx_ai_code_docs_path ON public.ai_code_documents (path);
CREATE INDEX idx_ai_code_docs_hash ON public.ai_code_documents (hash);
ALTER TABLE public.ai_code_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_code_documents" ON public.ai_code_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE TABLE public.ai_code_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.ai_code_documents(id) ON DELETE CASCADE,
  embedding   vector(1536),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_code_emb_doc ON public.ai_code_embeddings (document_id);
CREATE INDEX idx_ai_code_emb_vec ON public.ai_code_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE public.ai_code_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_code_embeddings" ON public.ai_code_embeddings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE OR REPLACE FUNCTION public.search_code_embeddings(
  query_embedding vector(1536), match_count INTEGER DEFAULT 5)
RETURNS TABLE (id UUID, document_id UUID, path TEXT, content TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT e.id, e.document_id, d.path, d.content,
         1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.ai_code_embeddings e
  JOIN public.ai_code_documents d ON d.id = e.document_id
  ORDER BY e.embedding <=> query_embedding LIMIT match_count;
$$;
