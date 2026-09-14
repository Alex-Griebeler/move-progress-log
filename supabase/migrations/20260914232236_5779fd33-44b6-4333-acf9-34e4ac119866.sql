-- Aplicar SOMENTE depois dos sincronizadores e callbacks publicados e drenados.
SET lock_timeout = '5s';
CREATE OR REPLACE FUNCTION private.wearable_sync_assert(p_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE owner uuid; l public.wearable_sync_locks%ROWTYPE;
BEGIN
 owner:=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-wearable-sync-owner')::uuid;
 SELECT * INTO l FROM public.wearable_sync_locks WHERE lock_key=p_key FOR UPDATE;
 IF owner IS NULL OR l.owner_id IS DISTINCT FROM owner OR l.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'sync_lease_lost' USING ERRCODE='40001'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.wearable_sync_assert(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION private.wearable_sync_write_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE k text;
BEGIN
 -- Só pedidos via PostgREST (edge functions) carregam request.headers e passam pela trava. Sessão direta
 -- (migration do Lovable, editor SQL, correção manual) não é sincronizador e não é bloqueada.
 IF nullif(current_setting('request.headers',true),'') IS NULL THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='oura_workouts' THEN
   k:=nullif(current_setting('request.headers',true),'')::jsonb->>'x-wearable-sync-collection';
   IF k IS NULL OR k NOT LIKE 'collect:oura:'||NEW.student_id||':%' THEN RAISE EXCEPTION 'sync_lease_lost' USING ERRCODE='40001'; END IF;
 ELSIF TG_TABLE_NAME IN ('oura_metrics','oura_acute_metrics') THEN
   k:='collect:oura:'||NEW.student_id||':'||(to_jsonb(NEW)->>'date');
 ELSE k:='collect:whoop:'||NEW.student_id;
 END IF;
 PERFORM private.wearable_sync_assert(k);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.wearable_sync_write_guard() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER wearable_sync_write_guard BEFORE INSERT OR UPDATE ON public.oura_metrics FOR EACH ROW EXECUTE FUNCTION private.wearable_sync_write_guard();
CREATE TRIGGER wearable_sync_write_guard BEFORE INSERT OR UPDATE ON public.oura_acute_metrics FOR EACH ROW EXECUTE FUNCTION private.wearable_sync_write_guard();
CREATE TRIGGER wearable_sync_write_guard BEFORE INSERT OR UPDATE ON public.whoop_metrics FOR EACH ROW EXECUTE FUNCTION private.wearable_sync_write_guard();
CREATE TRIGGER wearable_sync_write_guard BEFORE INSERT OR UPDATE ON public.oura_workouts FOR EACH ROW EXECUTE FUNCTION private.wearable_sync_write_guard();
CREATE TRIGGER wearable_sync_write_guard BEFORE INSERT OR UPDATE ON public.whoop_workouts FOR EACH ROW EXECUTE FUNCTION private.wearable_sync_write_guard();
-- Wrappers preservam os corpos existentes das RPCs de tokens. Não imprimir pg_get_functiondef de token RPC em logs.
ALTER FUNCTION public.store_oura_tokens(uuid,text,text,timestamptz) RENAME TO store_oura_tokens_before_mirror_lock;
ALTER FUNCTION public.store_whoop_tokens(uuid,text,text,timestamptz) RENAME TO store_whoop_tokens_before_mirror_lock;
REVOKE ALL ON FUNCTION public.store_oura_tokens_before_mirror_lock(uuid,text,text,timestamptz),public.store_whoop_tokens_before_mirror_lock(uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
DO $$
DECLARE provider text; ret text;
BEGIN
 FOREACH provider IN ARRAY ARRAY['oura','whoop'] LOOP
  SELECT pg_get_function_result(p.oid) INTO ret FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='store_'||provider||'_tokens_before_mirror_lock';
  EXECUTE format('CREATE OR REPLACE FUNCTION public.store_%1$s_tokens(p_student_id uuid,p_access_token text,p_refresh_token text,p_token_expires_at timestamptz) RETURNS %2$s LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '''' AS $fn$ BEGIN PERFORM private.wearable_sync_assert(''oauth:%1$s:''||p_student_id); %3$s public.store_%1$s_tokens_before_mirror_lock(p_student_id,p_access_token,p_refresh_token,p_token_expires_at); %4$s END $fn$',provider,ret,CASE WHEN ret='void' THEN 'PERFORM' ELSE 'RETURN' END,CASE WHEN ret='void' THEN 'RETURN;' ELSE '' END);
  EXECUTE format('REVOKE ALL ON FUNCTION public.store_%s_tokens(uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated',provider);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.store_%s_tokens(uuid,text,text,timestamptz) TO service_role',provider);
 END LOOP;
END $$;