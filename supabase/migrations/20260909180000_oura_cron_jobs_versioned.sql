-- A-Oura (2026-09-09): versiona os três jobs do cron do Oura que existem em
-- produção (06h, 10h e 18h de Brasília = 9h, 13h e 21h UTC; pg_cron em GMT).
-- Só o de 10h estava em migration (20260710130454).
--
-- Fato de produção (cron.job consultado em 2026-09-09): os jobs chamam-se
-- exatamente 'oura-sync-morning' (0 9), 'oura-sync-midmorning' (0 13) e
-- 'oura-sync-evening' (0 21). `cron.schedule(jobname, …)` atualiza um job de
-- mesmo nome (upsert por jobname/username) — não duplica.
--
-- Defesa: só é removido (por jobid, qualquer nome/usuário) o job cujo comando é
-- EXATAMENTE um dos três comandos que esta migration gera (comparação
-- case-sensitive, tolerando só espaço em volta e `;` final) — o de 10h é
-- byte a byte o mesmo da migration 20260710130454. Não há regex de
-- reconhecimento: cada regex "esperto" deixou passar um caso (chamada
-- comentada, rota no body/query de outra função, literal em maiúsculas…).
-- Qualquer OUTRO job que mencione `oura-sync-scheduled` (em qualquer caixa) faz
-- a migration parar com erro listando jobid/nome/comando, para decisão humana —
-- nunca apaga o que não reconhece byte a byte. Se os jobs de 6h/18h em produção
-- (criados fora de migration) tiverem texto diferente, é ESPERADO que a
-- migration aborte na primeira aplicação; ajustar/remover manualmente e reaplicar.
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
  -- Os três comandos EXATOS (mesmo texto dos cron.schedule abaixo).
  known_commands constant text[] := ARRAY[
    $c$SELECT private.invoke_cron_edge('oura-sync-scheduled', '{"time":"morning","schedule":"6h"}'::jsonb)$c$,
    $c$SELECT private.invoke_cron_edge('oura-sync-scheduled', '{"time":"midmorning","schedule":"6h"}'::jsonb)$c$,
    $c$SELECT private.invoke_cron_edge('oura-sync-scheduled', '{"time":"evening","schedule":"18h"}'::jsonb)$c$
  ];
BEGIN
  -- 1) Qualquer job que mencione a string (qualquer caixa) sem ser um dos três
  --    comandos exatos: não tocar; abortar listando, para decisão humana.
  FOR j IN
    SELECT jobid, jobname, username, command
    FROM cron.job
    WHERE command ILIKE '%oura-sync-scheduled%'
      AND NOT (btrim(regexp_replace(btrim(command), ';\s*$', '')) = ANY (known_commands))
  LOOP
    unknown_jobs := unknown_jobs || format(' [jobid %s, nome %s, user %s: %s]', j.jobid, coalesce(j.jobname, '<sem nome>'), j.username, left(j.command, 160));
  END LOOP;
  IF unknown_jobs <> '' THEN
    RAISE EXCEPTION 'Migration abortada: job(s) de cron mencionam oura-sync-scheduled com comando diferente dos três reconhecidos; remover ou ajustar manualmente antes de reaplicar:%', unknown_jobs;
  END IF;

  -- 2) Jobs com um dos três comandos exatos (qualquer nome/usuário): remover
  --    por jobid antes de recriar os três.
  FOR j IN
    SELECT jobid, jobname, username
    FROM cron.job
    WHERE btrim(regexp_replace(btrim(command), ';\s*$', '')) = ANY (known_commands)
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
