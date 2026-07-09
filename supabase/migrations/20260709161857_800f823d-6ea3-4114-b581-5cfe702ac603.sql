ALTER TABLE public.whoop_sync_logs
  ADD COLUMN IF NOT EXISTS workouts_synced integer;