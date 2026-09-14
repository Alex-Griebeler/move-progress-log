-- Espelho Oura/Whoop → app pessoal (ag_performance). FASE 2, mensagem A ao Lovable.
-- Banco da Fabrik (zrgfrdmywxlemcuiqtqg). ADITIVO: nenhuma linha existente muda; todas as fichas
-- atuais ficam com external_source NULL e continuam exatamente como hoje para admin e treinadores.
-- Plano: docs/ESPELHO_WEARABLES.md (repo ag-performance).
-- Não aplicar entre :00 e :20 das 09, 13 e 21 UTC (cron de Oura/Whoop).

-- ALTER TABLE em students pega trava exclusiva: desiste em 5 s em vez de enfileirar atrás de uma sync.
SET lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Marcação das fichas mínimas
-- ---------------------------------------------------------------------------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS external_source text NULL;

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_external_source_valid;
ALTER TABLE public.students
  ADD CONSTRAINT students_external_source_valid
  CHECK (external_source IS NULL OR external_source = 'ag_performance');

-- Ficha mínima fica fora de TODA leitura/escrita autenticada (inclusive admin). Soma-se à policy
-- permissiva "Trainers manage own students" (restritiva = E lógico). Integrações usam service_role.
DROP POLICY IF EXISTS "Hide external mirror students" ON public.students;
CREATE POLICY "Hide external mirror students" ON public.students
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (external_source IS NULL)
  WITH CHECK (external_source IS NULL);

-- ---------------------------------------------------------------------------
-- 2. Autorizações de espelho
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_mirror_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_app text NOT NULL DEFAULT 'ag_performance' CHECK (destination_app = 'ag_performance'),
  -- RESTRICT: autorização (inclusive revogada) é registro; não some com a ficha.
  source_student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  destination_student_id uuid NOT NULL,
  providers text[] NOT NULL CHECK (cardinality(providers) > 0 AND providers <@ ARRAY['oura', 'whoop']::text[]),
  history_from date,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  authorized_by uuid,
  authorization_reference text NOT NULL CHECK (length(trim(authorization_reference)) > 0),
  revision bigint NOT NULL DEFAULT 1,
  revoked_at timestamptz,
  oura_invite_id uuid REFERENCES public.student_invites(id) ON DELETE SET NULL,
  whoop_invite_id uuid REFERENCES public.student_invites(id) ON DELETE SET NULL,
  next_refresh_allowed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Uma autorização viva por ficha de origem e por cliente de destino.
CREATE UNIQUE INDEX IF NOT EXISTS wearable_mirror_grants_live_source
  ON public.wearable_mirror_grants (source_student_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wearable_mirror_grants_live_destination
  ON public.wearable_mirror_grants (destination_student_id) WHERE revoked_at IS NULL;
-- Checagem do RESTRICT ao excluir aluna (o índice parcial não serve a ela).
CREATE INDEX IF NOT EXISTS wearable_mirror_grants_source
  ON public.wearable_mirror_grants (source_student_id);

-- Guarda: nasce com revisão 1 e viva; par de fichas e auditoria imutáveis; revisão calculada (nunca
-- informada) e sobe a cada mudança de escopo ou revogação; revogada só aceita soltar convites e o
-- relógio de atualização (o ON DELETE SET NULL dos convites precisa passar).
CREATE OR REPLACE FUNCTION private.wearable_mirror_grants_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.revision := 1;
    NEW.revoked_at := NULL;
    NEW.authorized_at := COALESCE(NEW.authorized_at, now());
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.source_student_id IS DISTINCT FROM OLD.source_student_id
     OR NEW.destination_student_id IS DISTINCT FROM OLD.destination_student_id
     OR NEW.destination_app IS DISTINCT FROM OLD.destination_app
     OR NEW.authorized_at IS DISTINCT FROM OLD.authorized_at
     OR NEW.authorized_by IS DISTINCT FROM OLD.authorized_by
     OR NEW.authorization_reference IS DISTINCT FROM OLD.authorization_reference
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'wearable_mirror_grants: origem, destino e auditoria são imutáveis; revogue e crie outra autorização'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.revoked_at IS NOT NULL THEN
    IF NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
       OR NEW.providers IS DISTINCT FROM OLD.providers
       OR NEW.history_from IS DISTINCT FROM OLD.history_from
       OR (NEW.oura_invite_id IS DISTINCT FROM OLD.oura_invite_id AND NEW.oura_invite_id IS NOT NULL)
       OR (NEW.whoop_invite_id IS DISTINCT FROM OLD.whoop_invite_id AND NEW.whoop_invite_id IS NOT NULL) THEN
      RAISE EXCEPTION 'wearable_mirror_grants: autorização revogada é definitiva' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.revision := OLD.revision + CASE
    WHEN NEW.providers IS DISTINCT FROM OLD.providers
      OR NEW.history_from IS DISTINCT FROM OLD.history_from
      OR (NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL) THEN 1
    ELSE 0 END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION private.wearable_mirror_grants_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wearable_mirror_grants_guard ON public.wearable_mirror_grants;
CREATE TRIGGER wearable_mirror_grants_guard
  BEFORE INSERT OR UPDATE ON public.wearable_mirror_grants
  FOR EACH ROW EXECUTE FUNCTION private.wearable_mirror_grants_guard();

-- ---------------------------------------------------------------------------
-- 3. Operações (convite, atualização, revogação) — só metadados, nunca métricas ou tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_mirror_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid REFERENCES public.wearable_mirror_grants(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL UNIQUE,
  request_hash text NOT NULL,
  grant_revision bigint,
  kind text NOT NULL CHECK (kind IN ('invite', 'refresh', 'revoke')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'partial', 'failed')),
  current_step text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  next_attempt_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  error_code text
);
CREATE INDEX IF NOT EXISTS wearable_mirror_operations_grant ON public.wearable_mirror_operations (grant_id, requested_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Travas de sincronização (usadas só na fase 6; tabela criada agora, vazia)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_sync_locks (
  lock_key text PRIMARY KEY,
  owner_id uuid NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  blocked_until timestamptz
);

-- ---------------------------------------------------------------------------
-- 5. RLS e privilégios: escrita só por service_role (edge functions do espelho)
-- ---------------------------------------------------------------------------
ALTER TABLE public.wearable_mirror_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_mirror_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_sync_locks ENABLE ROW LEVEL SECURITY;

-- Leitura administrativa estritamente necessária: admin vê autorizações e operações (sem dado de saúde).
DROP POLICY IF EXISTS "Admins read mirror grants" ON public.wearable_mirror_grants;
CREATE POLICY "Admins read mirror grants" ON public.wearable_mirror_grants
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read mirror operations" ON public.wearable_mirror_operations;
CREATE POLICY "Admins read mirror operations" ON public.wearable_mirror_operations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.wearable_mirror_grants FROM anon, authenticated;
REVOKE ALL ON public.wearable_mirror_operations FROM anon, authenticated;
REVOKE ALL ON public.wearable_sync_locks FROM anon, authenticated;
GRANT ALL ON public.wearable_mirror_grants TO service_role;
GRANT ALL ON public.wearable_mirror_operations TO service_role;
GRANT ALL ON public.wearable_sync_locks TO service_role;
GRANT SELECT ON public.wearable_mirror_grants TO authenticated;
GRANT SELECT ON public.wearable_mirror_operations TO authenticated;