SELECT cron.schedule(
  'oura-sync-midmorning',
  '0 13 * * *',
  $$SELECT private.invoke_cron_edge('oura-sync-scheduled', '{"time":"midmorning","schedule":"6h"}'::jsonb);$$
);

SELECT cron.schedule(
  'whoop-sync-midmorning',
  '15 13 * * *',
  $$SELECT private.invoke_cron_edge('whoop-sync-all', '{"schedule":"midmorning"}'::jsonb);$$
);