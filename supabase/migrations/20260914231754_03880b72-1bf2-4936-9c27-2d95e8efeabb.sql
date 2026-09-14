-- Fabrik: só para reverter DEPOIS de 09_fencing.sql ter sido aplicada.
-- Primeiro interromper novos pedidos do espelho no pessoal e aguardar tarefas/leases.
BEGIN;
SET LOCAL lock_timeout='5s';
DROP TRIGGER wearable_sync_write_guard ON public.oura_metrics;
DROP TRIGGER wearable_sync_write_guard ON public.oura_acute_metrics;
DROP TRIGGER wearable_sync_write_guard ON public.whoop_metrics;
DROP TRIGGER wearable_sync_write_guard ON public.whoop_workouts;
DROP TRIGGER wearable_sync_write_guard ON public.oura_workouts;
DROP FUNCTION public.store_oura_tokens(uuid,text,text,timestamptz);
DROP FUNCTION public.store_whoop_tokens(uuid,text,text,timestamptz);
ALTER FUNCTION public.store_oura_tokens_before_mirror_lock(uuid,text,text,timestamptz) RENAME TO store_oura_tokens;
ALTER FUNCTION public.store_whoop_tokens_before_mirror_lock(uuid,text,text,timestamptz) RENAME TO store_whoop_tokens;
GRANT EXECUTE ON FUNCTION public.store_oura_tokens(uuid,text,text,timestamptz),public.store_whoop_tokens(uuid,text,text,timestamptz) TO service_role;
COMMIT;
-- Depois restaurar somente os sete entrypoints (oura-sync, whoop-sync, oura-callback, whoop-callback, oura-sync-all,
-- whoop-sync-all, smoke-test-integrity) + dependências pelo backup pré-publicação.
-- Preservar grants, operações, fichas, conexões, métricas, isolamento da fase 2 e exportadora da fase 3.
-- As RPCs auxiliares podem ficar sem chamadores; não apagar os registros de revogação.