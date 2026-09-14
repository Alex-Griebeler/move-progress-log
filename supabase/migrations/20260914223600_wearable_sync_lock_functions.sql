-- Fabrik: aquisição atômica, liberação por proprietário e fencing DENTRO da transação de escrita.
-- header_seen: cada aquisição registra se o cabeçalho x-wearable-sync-owner chegou ao banco pelo caminho real
-- (supabase-js → gateway → PostgREST). É a prova, com tráfego de verdade e sem risco, exigida antes do 09_fencing.
ALTER TABLE public.wearable_sync_locks ADD COLUMN IF NOT EXISTS header_seen boolean;
-- collection_seen: o cabeçalho x-wearable-sync-collection (exigido pela trava de oura_workouts) também chegou.
ALTER TABLE public.wearable_sync_locks ADD COLUMN IF NOT EXISTS collection_seen boolean;
CREATE OR REPLACE FUNCTION public.wearable_sync_acquire(p_key text,p_owner uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE n int; seen boolean; coll boolean; wait_s int;
BEGIN
 IF p_key !~ '^(oauth:(oura|whoop)|collect:whoop|collect:oura):[0-9a-f-]{36}(:[0-9]{4}-[0-9]{2}-[0-9]{2})?$' OR p_owner IS NULL THEN RAISE EXCEPTION 'invalid_lock'; END IF;
 seen := (nullif(current_setting('request.headers',true),'')::jsonb->>'x-wearable-sync-owner') IS NOT DISTINCT FROM p_owner::text;
 coll := (nullif(current_setting('request.headers',true),'')::jsonb->>'x-wearable-sync-collection') IS NOT NULL;
 INSERT INTO public.wearable_sync_locks(lock_key,owner_id,expires_at,header_seen,collection_seen) VALUES(p_key,p_owner,clock_timestamp()+interval '120 seconds',seen,coll)
 ON CONFLICT(lock_key) DO UPDATE SET owner_id=EXCLUDED.owner_id,acquired_at=clock_timestamp(),expires_at=EXCLUDED.expires_at,header_seen=EXCLUDED.header_seen,collection_seen=EXCLUDED.collection_seen
 WHERE wearable_sync_locks.expires_at<=clock_timestamp() AND coalesce(wearable_sync_locks.blocked_until,'-infinity')<=clock_timestamp();
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n=0 THEN
   SELECT ceil(extract(epoch FROM blocked_until-clock_timestamp()))::int INTO wait_s
     FROM public.wearable_sync_locks WHERE lock_key=p_key AND blocked_until>clock_timestamp();
   IF wait_s IS NOT NULL THEN
     -- Bloqueio por limite do provedor não é "ocupado": o chamador desiste na hora e sabe quanto esperar.
     RAISE EXCEPTION 'sync_blocked' USING ERRCODE='P0001', DETAIL=wait_s::text;
   END IF;
 END IF;
 RETURN n=1;
END $$;
CREATE OR REPLACE FUNCTION public.wearable_sync_release(p_key text,p_owner uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
 UPDATE public.wearable_sync_locks SET expires_at=clock_timestamp() WHERE lock_key=p_key AND owner_id=p_owner;
$$;
REVOKE ALL ON FUNCTION public.wearable_sync_acquire(text,uuid),public.wearable_sync_release(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_sync_acquire(text,uuid),public.wearable_sync_release(text,uuid) TO service_role;

-- Sem p_key: todas as chaves do dono (limite no endpoint de token). Com p_key: só a coleta limitada,
-- para que um 429 de dados não impeça a reconexão OAuth do cliente.
CREATE OR REPLACE FUNCTION public.wearable_sync_block(p_owner uuid,p_seconds integer,p_key text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
 UPDATE public.wearable_sync_locks SET blocked_until=greatest(coalesce(blocked_until,'-infinity'),clock_timestamp()+make_interval(secs=>greatest(60,least(p_seconds,86400))))
 WHERE owner_id=p_owner AND (p_key IS NULL OR lock_key=p_key);
$$;
REVOKE ALL ON FUNCTION public.wearable_sync_block(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_sync_block(uuid,integer,text) TO service_role;
