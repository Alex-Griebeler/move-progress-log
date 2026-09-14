-- Fabrik: controle transacional; somente metadados nas operações.
SET lock_timeout = '5s';
ALTER TABLE public.wearable_mirror_operations ADD COLUMN IF NOT EXISTS parent_operation_id uuid REFERENCES public.wearable_mirror_operations(id);
ALTER TABLE public.wearable_mirror_operations ADD COLUMN IF NOT EXISTS lease_owner uuid;
ALTER TABLE public.wearable_mirror_operations ADD COLUMN IF NOT EXISTS lease_until timestamptz;
-- Auditoria: referência de autorização informada em cada convite (texto do operador, sem dado de saúde).
ALTER TABLE public.wearable_mirror_operations ADD COLUMN IF NOT EXISTS authorization_reference text;

CREATE OR REPLACE FUNCTION public.wearable_mirror_control(p_body jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  g public.wearable_mirror_grants%ROWTYPE;
  op public.wearable_mirror_operations%ROWTYPE;
  inv public.student_invites%ROWTYPE;
  dest uuid := (p_body->>'destination_student_id')::uuid;
  rid uuid := (p_body->>'request_id')::uuid;
  v_kind text := p_body->>'action';
  h text := md5(p_body::text);
  sid uuid;
  trainer constant uuid := 'ba1a2309-4558-4ae4-bbaf-a55a2ccfe7dd';
  provider text := p_body->>'provider';
  connected boolean;
  steps jsonb := '[]';
  i integer;
  fresh boolean := false;
  v_requested timestamptz;
BEGIN
  IF v_kind NOT IN ('invite','refresh','revoke') OR dest IS NULL OR rid IS NULL THEN RAISE EXCEPTION 'invalid_request'; END IF;
  -- Serializa idempotência e destino, inclusive quando ainda não existe ficha.
  PERFORM pg_advisory_xact_lock(hashtextextended(rid::text, 71));
  PERFORM pg_advisory_xact_lock(hashtextextended(dest::text, 72));
  SELECT * INTO op FROM public.wearable_mirror_operations WHERE request_id=rid;
  IF FOUND AND op.request_hash <> h THEN RETURN jsonb_build_object('error','request_conflict'); END IF;
  IF op.id IS NOT NULL THEN
    SELECT * INTO g FROM public.wearable_mirror_grants WHERE id=op.grant_id FOR UPDATE;
    IF g.destination_student_id IS DISTINCT FROM dest THEN RETURN jsonb_build_object('error','request_conflict'); END IF;
    IF v_kind <> 'revoke' AND g.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('error','grant_revoked'); END IF;
  ELSE
    fresh:=true;
    IF v_kind='invite' THEN
      IF provider NOT IN ('oura','whoop') OR length(trim(p_body->>'name')) NOT BETWEEN 1 AND 200 OR
        length(trim(p_body->>'authorization_reference')) NOT BETWEEN 1 AND 500 OR
        p_body->>'registration_mode' NOT IN ('new','existing') OR (p_body->>'history_from')::date > current_date OR
        (p_body->>'requested_at') IS NULL THEN
        RAISE EXCEPTION 'invalid_request';
      END IF;
      BEGIN
        v_requested := (p_body->>'requested_at')::timestamptz;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'invalid_request';
      END;
      -- Pedido emitido antes de uma revogação deste destino nunca cria nem amplia autorização depois dela
      -- (convite reenviado após o Alex revogar não pode reativar o compartilhamento em silêncio).
      IF EXISTS(SELECT 1 FROM public.wearable_mirror_grants WHERE destination_student_id=dest AND revoked_at >= v_requested) THEN
        RETURN jsonb_build_object('error','grant_revoked');
      END IF;
      SELECT * INTO g FROM public.wearable_mirror_grants WHERE destination_student_id=dest AND revoked_at IS NULL FOR UPDATE;
      IF g.id IS NULL THEN
        -- Cadastro existente exige vínculo pontual prévio, nunca correspondência por nome.
        IF p_body->>'registration_mode'='existing' THEN RETURN jsonb_build_object('error','identity_review_required'); END IF;
        SELECT s.id INTO sid FROM public.wearable_mirror_grants oldg JOIN public.students s ON s.id=oldg.source_student_id
          WHERE oldg.destination_student_id=dest AND s.external_source='ag_performance' ORDER BY oldg.created_at DESC LIMIT 1;
        IF sid IS NULL THEN
          IF EXISTS(SELECT 1 FROM public.students WHERE lower(trim(name))=lower(trim(p_body->>'name'))) THEN
            RETURN jsonb_build_object('error','identity_review_required');
          END IF;
          INSERT INTO public.students(name, trainer_id, external_source) VALUES(trim(p_body->>'name'),trainer,'ag_performance') RETURNING id INTO sid;
        END IF;
        INSERT INTO public.wearable_mirror_grants(source_student_id,destination_student_id,providers,history_from,authorized_by,authorization_reference)
          VALUES(sid,dest,ARRAY[provider],(p_body->>'history_from')::date,trainer,p_body->>'authorization_reference') RETURNING * INTO g;
      ELSIF NOT provider=ANY(g.providers) AND g.history_from IS DISTINCT FROM (p_body->>'history_from')::date THEN
        -- Um grant tem uma única data de histórico: o segundo aparelho nunca amplia o período em silêncio.
        -- Reconexão do mesmo aparelho não compara nada; a referência nova fica registrada na operação.
        RETURN jsonb_build_object('error','authorization_scope_conflict','history_from',g.history_from);
      ELSIF NOT provider=ANY(g.providers) THEN
        UPDATE public.wearable_mirror_grants SET providers=array_append(providers,provider) WHERE id=g.id RETURNING * INTO g;
      END IF;
    ELSE
      SELECT * INTO g FROM public.wearable_mirror_grants WHERE id=(p_body->>'grant_id')::uuid AND destination_student_id=dest FOR UPDATE;
      IF g.id IS NULL THEN RETURN jsonb_build_object('error','grant_not_found'); END IF;
      IF v_kind='refresh' AND g.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('error','grant_revoked'); END IF;
    END IF;
    IF v_kind='revoke' THEN
      UPDATE public.wearable_mirror_grants SET revoked_at=coalesce(revoked_at,now()) WHERE id=g.id RETURNING * INTO g;
      -- Invalida apenas convites emitidos por este grant. OAuth e dados originais permanecem.
      UPDATE public.student_invites SET expires_at=least(expires_at,now()) WHERE id IN(g.oura_invite_id,g.whoop_invite_id);
      UPDATE public.wearable_mirror_operations SET status='failed',error_code='grant_revoked',finished_at=now(),lease_owner=NULL,lease_until=NULL
        WHERE grant_id=g.id AND kind='refresh' AND status IN('pending','running');
    ELSIF v_kind='refresh' THEN
      SELECT * INTO op FROM public.wearable_mirror_operations WHERE grant_id=g.id AND kind='refresh' AND status IN('pending','running') ORDER BY requested_at LIMIT 1;
      IF op.id IS NOT NULL THEN
        INSERT INTO public.wearable_mirror_operations(request_id,request_hash,grant_id,grant_revision,kind,status,parent_operation_id,finished_at)
          VALUES(rid,h,g.id,g.revision,'refresh','succeeded',op.id,now());
        RETURN jsonb_build_object('operation_id',op.id,'status',op.status,'grant_id',g.id,'next_refresh_allowed_at',g.next_refresh_allowed_at);
      END IF;
      IF g.next_refresh_allowed_at > now() THEN RETURN jsonb_build_object('error','cooldown','next_refresh_allowed_at',g.next_refresh_allowed_at); END IF;
      IF 'oura'=ANY(g.providers) AND EXISTS(SELECT 1 FROM public.oura_connections WHERE student_id=g.source_student_id AND is_active) THEN
        FOR i IN 0..2 LOOP steps := steps || jsonb_build_array(jsonb_build_object('provider','oura','date',((now() AT TIME ZONE 'America/Sao_Paulo')::date-i)::text,'status','pending','attempts',0)); END LOOP;
      END IF;
      IF 'whoop'=ANY(g.providers) AND EXISTS(SELECT 1 FROM public.whoop_connections WHERE student_id=g.source_student_id AND is_active) THEN
        steps := steps || jsonb_build_array(jsonb_build_object('provider','whoop','start',now()-interval '30 days','end',now(),'status','pending','attempts',0));
      END IF;
      IF jsonb_array_length(steps)=0 THEN RETURN jsonb_build_object('error','not_connected'); END IF;
      UPDATE public.wearable_mirror_grants SET next_refresh_allowed_at=now()+interval '15 minutes' WHERE id=g.id RETURNING * INTO g;
    END IF;
    INSERT INTO public.wearable_mirror_operations(request_id,request_hash,grant_id,grant_revision,kind,status,steps,finished_at,authorization_reference)
      VALUES(rid,h,g.id,g.revision,v_kind,CASE WHEN v_kind='refresh' THEN 'pending' ELSE 'succeeded' END,steps,CASE WHEN v_kind<>'refresh' THEN now() END,
        CASE WHEN v_kind='invite' THEN left(trim(p_body->>'authorization_reference'),500) END) RETURNING * INTO op;
  END IF;
  IF v_kind='invite' THEN
    IF provider='oura' THEN SELECT EXISTS(SELECT 1 FROM public.oura_connections WHERE student_id=g.source_student_id AND is_active) INTO connected;
    ELSE SELECT EXISTS(SELECT 1 FROM public.whoop_connections WHERE student_id=g.source_student_id AND is_active) INTO connected; END IF;
    IF NOT connected THEN
      SELECT * INTO inv FROM public.student_invites WHERE id=CASE WHEN provider='oura' THEN g.oura_invite_id ELSE g.whoop_invite_id END AND expires_at>now() AND NOT is_used;
      IF inv.id IS NULL AND NOT fresh THEN RETURN jsonb_build_object('error','invite_expired','grant_id',g.id); END IF;
      IF inv.id IS NULL THEN
        INSERT INTO public.student_invites(trainer_id,invite_token,email,expires_at,created_student_id)
          VALUES(trainer,gen_random_uuid()::text,'__'||provider||'_connect__',now()+interval '7 days',g.source_student_id) RETURNING * INTO inv;
        UPDATE public.wearable_mirror_grants SET oura_invite_id=CASE WHEN provider='oura' THEN inv.id ELSE oura_invite_id END,
          whoop_invite_id=CASE WHEN provider='whoop' THEN inv.id ELSE whoop_invite_id END WHERE id=g.id;
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('operation_id',coalesce(op.parent_operation_id,op.id),'status',op.status,'grant_id',g.id,'revision',g.revision,
    'source_student_id',g.source_student_id,'destination_student_id',dest,'providers',g.providers,'history_from',g.history_from,
    'connection_state',CASE WHEN connected THEN 'connected' ELSE 'not_connected' END,
    'invite_token',inv.invite_token,'expires_at',inv.expires_at,'revoked_at',g.revoked_at,'next_refresh_allowed_at',g.next_refresh_allowed_at);
END $$;
REVOKE ALL ON FUNCTION public.wearable_mirror_control(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_mirror_control(jsonb) TO service_role;

-- Uma etapa por chamada, lease com fencing: retomada não aceita resultado da execução antiga.
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
     next_attempt_at=now()+make_interval(secs=>greatest(60,least(p_retry_seconds,86400))) WHERE id=op.id;
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
REVOKE ALL ON FUNCTION public.wearable_mirror_refresh_step(uuid,uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_mirror_refresh_step(uuid,uuid,uuid,text,integer) TO service_role;
