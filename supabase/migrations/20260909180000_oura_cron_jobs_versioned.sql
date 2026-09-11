-- A-Oura (2026-09-09): versiona os três jobs do cron do Oura que existem em
-- produção (06h, 10h e 18h de Brasília = 9h, 13h e 21h UTC; pg_cron em GMT).
-- Só o de 10h estava em migration (20260710130454).
--
-- Fato de produção (cron.job consultado em 2026-09-09): os jobs chamam-se
-- exatamente 'oura-sync-morning' (0 9), 'oura-sync-midmorning' (0 13) e
-- 'oura-sync-evening' (0 21). `cron.schedule(jobname, …)` atualiza um job de
-- mesmo nome (upsert por jobname/username) — não duplica.
--
-- Defesa: TODO job que INVOQUE o oura-sync-scheduled — qualquer nome (inclusive
-- NULL), qualquer username — é removido por jobid antes de recriar os três.
-- "Invocar" = uma das duas formas conhecidas: `private.invoke_cron_edge('oura-sync-scheduled', …)`
-- (migrations deste repo) ou `net.http_post(…/functions/v1/oura-sync-scheduled…)`
-- (forma bruta do Lovable). Um job que apenas MENCIONE a string (monitoramento,
-- comentário) NÃO é removido: a migration para com erro e lista o jobid, para
-- decisão humana — nunca apaga o que não reconhece.
-- Resultado garantido: exatamente um job por horário, nunca duas execuções no
-- mesmo minuto (duas cadeias oura-sync-all na mesma aluna/data e refresh
-- concorrente do token OAuth). O upsert do pg_cron é por (jobname, username),
-- então só recriar não bastaria se um job homônimo pertencesse a outro usuário.
--
-- A janela retroativa (hoje, ontem, anteontem) é decidida no oura-sync-all;
-- o payload aqui é só rótulo/diagnóstico.

DO $do$
DECLARE
  j record;
  unknown_jobs text := '';
BEGIN
  -- 1) Jobs que só MENCIONAM a string sem uma forma de invocação conhecida:
  --    não tocar; abortar a migration para decisão humana.
  FOR j IN
    SELECT jobid, jobname, username, command
    FROM cron.job
    WHERE command ILIKE '%oura-sync-scheduled%'
      AND command NOT ILIKE '%invoke_cron_edge(%''oura-sync-scheduled''%'
      AND command NOT ILIKE '%net.http_post(%/functions/v1/oura-sync-scheduled%'
  LOOP
    unknown_jobs := unknown_jobs || format(' [jobid %s, nome %s, user %s: %s]', j.jobid, coalesce(j.jobname, '<sem nome>'), j.username, left(j.command, 120));
  END LOOP;
  IF unknown_jobs <> '' THEN
    RAISE EXCEPTION 'Migration abortada: job(s) de cron mencionam oura-sync-scheduled sem forma de invocação conhecida; remover ou renomear manualmente antes de reaplicar:%', unknown_jobs;
  END IF;

  -- 2) Jobs que INVOCAM o oura-sync-scheduled (qualquer nome/usuário): remover
  --    por jobid antes de recriar os três.
  FOR j IN
    SELECT jobid, jobname, username
    FROM cron.job
    WHERE command ILIKE '%invoke_cron_edge(%''oura-sync-scheduled''%'
       OR command ILIKE '%net.http_post(%/functions/v1/oura-sync-scheduled%'
  LOOP
    RAISE NOTICE 'Removendo job de cron do Oura antes de recriar: % (jobid %, user %)', coalesce(j.jobname, '<sem nome>'), j.jobid, j.username;
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
