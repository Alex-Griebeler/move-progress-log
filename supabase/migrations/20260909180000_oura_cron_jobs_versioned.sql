-- A-Oura (2026-09-09): versiona os três jobs do cron do Oura que existem em
-- produção (06h, 10h e 18h de Brasília = 9h, 13h e 21h UTC; pg_cron em GMT).
-- Só o de 10h estava em migration (20260710130454).
--
-- Fato de produção (cron.job consultado em 2026-09-09): os jobs chamam-se
-- exatamente 'oura-sync-morning' (0 9), 'oura-sync-midmorning' (0 13) e
-- 'oura-sync-evening' (0 21). `cron.schedule(jobname, …)` atualiza um job de
-- mesmo nome (upsert por jobname/username) — não duplica.
--
-- Defesa contra nome divergente: qualquer OUTRO job que invoque o
-- oura-sync-scheduled é removido antes, para nunca haver duas execuções no
-- mesmo minuto (duas cadeias oura-sync-all concorrentes na mesma aluna/data e
-- refresh concorrente do token OAuth).
--
-- A janela retroativa (hoje, ontem, anteontem) é decidida no oura-sync-all;
-- o payload aqui é só rótulo/diagnóstico.

DO $do$
DECLARE
  j record;
BEGIN
  FOR j IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE command ILIKE '%oura-sync-scheduled%'
      AND jobname NOT IN ('oura-sync-morning', 'oura-sync-midmorning', 'oura-sync-evening')
  LOOP
    RAISE NOTICE 'Removendo job de cron do Oura fora do padrão: % (%)', j.jobname, j.jobid;
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END
$do$;

SELECT cron.schedule(
  'oura-sync-morning',
  '0 9 * * *',
  $$SELECT private.invoke_cron_edge('oura-sync-scheduled', '{"time":"morning","schedule":"6h"}'::jsonb);$$
);

SELECT cron.schedule(
  'oura-sync-midmorning',
  '0 13 * * *',
  $$SELECT private.invoke_cron_edge('oura-sync-scheduled', '{"time":"midmorning","schedule":"6h"}'::jsonb);$$
);

SELECT cron.schedule(
  'oura-sync-evening',
  '0 21 * * *',
  $$SELECT private.invoke_cron_edge('oura-sync-scheduled', '{"time":"evening","schedule":"18h"}'::jsonb);$$
);
