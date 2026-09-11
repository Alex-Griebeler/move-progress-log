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
-- "Invocar" = o comando INTEIRO é uma das duas formas conhecidas (regex ancorado):
-- `SELECT private.invoke_cron_edge('oura-sync-scheduled', …)` (migrations deste
-- repo) ou `SELECT net.http_post('https://…/functions/v1/oura-sync-scheduled', …)`
-- (forma bruta). Um job que apenas MENCIONE a string (comentário, monitoramento,
-- http_post para outra função com a rota no body) NÃO é removido: a migration
-- para com erro e lista o jobid, para decisão humana — nunca apaga o que não
-- reconhece.
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
  -- Formas de INVOCAÇÃO reconhecidas, ancoradas no comando inteiro (o `.`
  -- casa quebra de linha no regex do Postgres): a chamada executável tem de
  -- ser o próprio comando, e o destino tem de ser o argumento da chamada.
  -- Substring solta ('%…%') não serve: pegaria chamada comentada ou rota
  -- citada no body de um http_post para OUTRA função.
  -- Gramática dos argumentos: só literais simples (sem aspa interna),
  -- opcionalmente nomeados (`nome :=`) e com `::jsonb`; depois do `)` da
  -- chamada, só `;` e espaço. Nada de `.*`: uma cauda permissiva deixaria
  -- passar `…) WHERE false AND (true)`, que NÃO executa a chamada.
  invoke_edge_re constant text :=
    '^\s*SELECT\s+private\.invoke_cron_edge\s*\(\s*(function_name\s*:=\s*)?''oura-sync-scheduled''\s*(,\s*(body\s*:=\s*)?''[^'']*''(\s*::\s*jsonb)?\s*)?\)\s*;?\s*$';
  http_post_re constant text :=
    '^\s*SELECT\s+net\.http_post\s*\(\s*(url\s*:=\s*)?''https?://[^'']*/functions/v1/oura-sync-scheduled''(\s*,\s*([a-z_]+\s*:=\s*)?''[^'']*''(\s*::\s*jsonb)?)*\s*\)\s*;?\s*$';
BEGIN
  -- 1) Jobs que MENCIONAM a string sem serem uma invocação reconhecida
  --    (comentário, monitoramento, http_post para outra função): não tocar;
  --    abortar a migration listando-os, para decisão humana.
  FOR j IN
    SELECT jobid, jobname, username, command
    FROM cron.job
    WHERE command ILIKE '%oura-sync-scheduled%'
      AND command !~* invoke_edge_re
      AND command !~* http_post_re
  LOOP
    unknown_jobs := unknown_jobs || format(' [jobid %s, nome %s, user %s: %s]', j.jobid, coalesce(j.jobname, '<sem nome>'), j.username, left(j.command, 160));
  END LOOP;
  IF unknown_jobs <> '' THEN
    RAISE EXCEPTION 'Migration abortada: job(s) de cron mencionam oura-sync-scheduled sem forma de invocação reconhecida; remover ou renomear manualmente antes de reaplicar:%', unknown_jobs;
  END IF;

  -- 2) Jobs que INVOCAM o oura-sync-scheduled (qualquer nome/usuário): remover
  --    por jobid antes de recriar os três.
  FOR j IN
    SELECT jobid, jobname, username
    FROM cron.job
    WHERE command ~* invoke_edge_re
       OR command ~* http_post_re
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
