-- whoop_sync_logs: track how many workout rows each sync upserted, now that
-- whoop-sync persists /v2/activity/workout into whoop_workouts (B2 follow-up
-- to 20260707182719_whoop_integration; gap found in Codex audit 2026-07-09).
ALTER TABLE public.whoop_sync_logs
  ADD COLUMN IF NOT EXISTS workouts_synced integer;

COMMENT ON COLUMN public.whoop_sync_logs.workouts_synced IS 'Number of whoop_workouts rows upserted by this sync run (null for legacy rows logged before the column existed).';
