-- Espelho: "Atualizar agora" mais rápido. A espera mínima de 60 s entre etapas passa a valer só depois de
-- falha transitória (retry: 429/423/5xx, com Retry-After). Etapa concluída libera a próxima na hora, exceto
-- quando há limite do fabricante ativo para a aluna naquele provedor (blocked_until), que é respeitado.
-- Nada mais muda: uma etapa por chamada, lease de 110 s com fencing, limite de 3 tentativas por etapa e 15 por operação.
CREATE OR REPLACE FUNCTION public.wearable_mirror_refresh_step(p_operation uuid,p_destination uuid,p_owner uuid,p_result text DEFAULT NULL,p_retry_seconds integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE op public.wearable_mirror_operations%ROWTYPE; g public.wearable_mirror_grants%ROWTYPE; idx integer; st jsonb;
BEGIN
 SELECT grant_id INTO g.id FROM public.wearable_mirror_operations WHERE id=p_operation;
 SELECT * INTO g FROM public.wearable_mirror_grants WHERE id=g.id AND destination_student_id=p_destination FOR UPDATE;
 IF g.id IS NULL OR g.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('error','grant_revoked'); END IF;
 SELECT * INTO op FROM public.wearable_mirror_operations WHERE id=p_operation AND kind='refresh' FOR UPDATE;
 IF op.id IS NULL THEN RETURN jsonb_build_object('error','grant_not_found'); END IF;
 IF op.grant_revision<>g.revision THEN
   UPDATE public.wearable_mirror_operations SET status='failed',error_code='scope_changed',finished_at=now() WHERE id=op.id;
   RETURN jsonb_build_object('status','failed');
 END IF;
 SELECT ordinality::int-1,value INTO idx,st FROM jsonb_array_elements(op.steps) WITH ORDINALITY WHERE value->>'status'='pending' ORDER BY ordinality LIMIT 1;
 IF p_result IS NULL AND op.attempts>=15 THEN
   UPDATE public.wearable_mirror_operations SET status='partial',finished_at=now(),error_code='retry_exhausted' WHERE id=op.id;
   RETURN jsonb_build_object('status','partial');
 END IF;
 IF p_result IS NOT NULL THEN
   IF op.lease_owner IS DISTINCT FROM p_owner OR op.lease_until<=now() OR idx IS NULL THEN RETURN jsonb_build_object('error','lease_lost'); END IF;
   IF p_result NOT IN('retry','failed','partial','succeeded','no_data') THEN RAISE EXCEPTION 'invalid_result'; END IF;
   IF p_result<>'retry' OR (st->>'attempts')::int>=3 THEN st:=jsonb_set(st,'{status}',to_jsonb(CASE WHEN p_result='retry' THEN 'failed' ELSE p_result END)); END IF;
   op.steps:=jsonb_set(op.steps,ARRAY[idx::text],st);
   UPDATE public.wearable_mirror_operations SET steps=op.steps,lease_owner=NULL,lease_until=NULL,
     next_attempt_at=CASE WHEN p_result='retry' THEN now()+make_interval(secs=>greatest(60,least(p_retry_seconds,86400)))
       -- Sucesso ou parcial: segue na hora, salvo limite do fabricante registrado por qualquer coleta deste provedor para a aluna
       -- (429 parcial do Oura grava blocked_until só na chave da data; a próxima data esperaria o mesmo limite).
       ELSE greatest(now(),coalesce((SELECT max(l.blocked_until) FROM public.wearable_sync_locks l
         WHERE l.lock_key LIKE 'collect:'||(st->>'provider')||':'||g.source_student_id||'%'),now())) END WHERE id=op.id;
 ELSE
   IF op.lease_until>now() OR op.next_attempt_at>now() THEN RETURN jsonb_build_object('status','running'); END IF;
   -- Uma execução abandonada também consome tentativa; nunca reiniciar infinitamente a etapa.
   IF idx IS NOT NULL AND (st->>'attempts')::int>=3 THEN
     st:=jsonb_set(st,'{status}','"failed"');
     op.steps:=jsonb_set(op.steps,ARRAY[idx::text],st);
     UPDATE public.wearable_mirror_operations SET steps=op.steps,lease_owner=NULL,lease_until=NULL WHERE id=op.id;
     SELECT ordinality::int-1,value INTO idx,st FROM jsonb_array_elements(op.steps) WITH ORDINALITY WHERE value->>'status'='pending' ORDER BY ordinality LIMIT 1;
   END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(op.steps) s WHERE s->>'status'='pending') THEN
   UPDATE public.wearable_mirror_operations SET status=CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(op.steps) s WHERE s->>'status' IN('failed','partial')) THEN 'partial' ELSE 'succeeded' END,finished_at=now() WHERE id=op.id RETURNING * INTO op;
   RETURN jsonb_build_object('status',op.status,'steps',op.steps);
 END IF;
 IF p_result IS NOT NULL THEN RETURN jsonb_build_object('status','running'); END IF;
 st:=jsonb_set(st,'{attempts}',to_jsonb((st->>'attempts')::int+1));
 UPDATE public.wearable_mirror_operations SET steps=jsonb_set(op.steps,ARRAY[idx::text],st),status='running',lease_owner=p_owner,lease_until=now()+interval '110 seconds',started_at=coalesce(started_at,now()),attempts=attempts+1 WHERE id=op.id;
 RETURN jsonb_build_object('status','running','step',st,'source_student_id',g.source_student_id);
END $$;