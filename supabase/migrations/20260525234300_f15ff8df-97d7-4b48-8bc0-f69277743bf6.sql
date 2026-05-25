-- =====================================================================
-- Setup operacional: role Postgres `codex_taxonomy` para auditoria
-- externa controlada da taxonomia de exercises_library.
--
-- IMPORTANTE: este arquivo NÃO contém a senha. A senha é gerada
-- em runtime com gen_random_bytes() e armazenada em uma tabela
-- temporária `public._codex_taxonomy_credential` (RLS habilitada,
-- sem policies, revogada de anon/authenticated). Ela deve ser lida
-- UMA vez e depois removida via migration separada.
-- =====================================================================

-- Tabela one-shot para devolver a senha gerada (será dropada depois)
CREATE TABLE IF NOT EXISTS public._codex_taxonomy_credential (
  id integer PRIMARY KEY DEFAULT 1,
  generated_password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public._codex_taxonomy_credential ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._codex_taxonomy_credential FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_password text;
BEGIN
  -- Gera senha forte: 32 bytes random em base64url-safe (~43 chars)
  v_password := translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_.');

  -- Cria ou atualiza o role
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'codex_taxonomy') THEN
    EXECUTE format('CREATE ROLE codex_taxonomy LOGIN PASSWORD %L', v_password);
  ELSE
    EXECUTE format('ALTER ROLE codex_taxonomy WITH LOGIN PASSWORD %L', v_password);
  END IF;

  -- Defaults de sessão
  EXECUTE 'ALTER ROLE codex_taxonomy SET search_path = public';
  EXECUTE 'ALTER ROLE codex_taxonomy SET statement_timeout = ''30s''';
  EXECUTE 'ALTER ROLE codex_taxonomy SET idle_in_transaction_session_timeout = ''60s''';

  -- Limpeza defensiva
  EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM codex_taxonomy';
  EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM codex_taxonomy';
  EXECUTE 'REVOKE ALL ON SCHEMA public FROM codex_taxonomy';

  -- Grants mínimos
  EXECUTE 'GRANT USAGE ON SCHEMA public TO codex_taxonomy';
  EXECUTE 'GRANT SELECT ON public.exercises_library TO codex_taxonomy';
  EXECUTE 'GRANT UPDATE (name, movement_pattern) ON public.exercises_library TO codex_taxonomy';
  EXECUTE 'GRANT SELECT ON public.prescription_exercises TO codex_taxonomy';
  EXECUTE 'GRANT SELECT ON public.exercise_adaptations TO codex_taxonomy';
  EXECUTE 'GRANT SELECT ON public.exercises TO codex_taxonomy';
  EXECUTE 'GRANT SELECT ON public.report_tracked_exercises TO codex_taxonomy';

  -- Persiste a senha na tabela one-shot
  INSERT INTO public._codex_taxonomy_credential (id, generated_password)
  VALUES (1, v_password)
  ON CONFLICT (id) DO UPDATE SET
    generated_password = EXCLUDED.generated_password,
    created_at = now();
END $$;