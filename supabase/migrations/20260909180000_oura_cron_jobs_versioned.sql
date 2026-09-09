-- A-Oura (2026-09-09): versiona os três jobs do cron do Oura que existem em
-- produção (06h, 10h e 18h de Brasília = 9h, 13h e 21h UTC; pg_cron em GMT).
-- Só o de 10h estava em migration (20260710130454). `cron.schedule` com o
-- MESMO jobname atualiza o job existente — não cria duplicata.
-- A janela retroativa (hoje, ontem, anteontem) é decidida no oura-sync-all;
-- o payload aqui é só rótulo/diagnóstico.

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
