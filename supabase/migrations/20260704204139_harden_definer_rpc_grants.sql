-- =============================================================================
-- Migration: move EXECUTE grants on public-schema functions to least privilege
-- Author:    Felipe (for Alex's review)
-- Date:      2026-07-04
-- =============================================================================
--
-- Supabase grants EXECUTE on every `public`-schema function to the `anon` and
-- `authenticated` API roles by default, and exposes each function over the REST
-- API at /rest/v1/rpc/<function>. The least-privilege baseline is for functions
-- to be executable only by the roles that actually call them.
--
-- This migration revokes the default grants where the app does not call the
-- function from the client:
--
--   1) Functions used only by Edge Functions (service_role) or fired by
--      triggers: revoked from both `anon` and `authenticated`.
--   2) Functions called from the app by logged-in users: revoked from `anon`
--      only (the `authenticated` grant stays).
--
-- `service_role` is NOT affected by these REVOKEs, so the Edge Function flows
-- (Oura callback, session creation, etc.) keep working.
--
-- Left intentionally untouched: has_role() and can_access_trainer() — RLS
-- policy evaluation for anon/authenticated needs EXECUTE on them, and they
-- only return booleans.
--
-- Complements the approach started in `chore/revoke-kpi-execute-from-anon`.
-- A separate review of individual function bodies is planned as a follow-up.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Backend-only functions: revoke from BOTH anon and authenticated.
--    Called only by Edge Functions (service_role) or fired by triggers.
-- -----------------------------------------------------------------------------
revoke execute on function public.get_oura_access_token(uuid)                       from anon, authenticated;
revoke execute on function public.get_oura_refresh_token(uuid)                      from anon, authenticated;
revoke execute on function public.store_oura_tokens(uuid, text, text, timestamp with time zone) from anon, authenticated;
revoke execute on function public.cleanup_rate_limit_attempts()                     from anon, authenticated;
revoke execute on function public.migrate_oura_tokens_to_vault()                    from anon, authenticated;
revoke execute on function public.compute_week_adherence()                          from anon, authenticated;  -- trigger fn
revoke execute on function public.update_folder_full_path()                         from anon, authenticated;  -- trigger fn

-- -----------------------------------------------------------------------------
-- 2) Authenticated-only functions: revoke from anon (keep authenticated —
--    these are called from the browser by a logged-in trainer/admin).
-- -----------------------------------------------------------------------------
revoke execute on function public.count_active_students(date)                       from anon;
revoke execute on function public.count_students_inactive(integer)                  from anon;
revoke execute on function public.count_students_frequency_dropping()               from anon;
revoke execute on function public.count_prescriptions_stagnant(integer)             from anon;
revoke execute on function public.list_students_inactive(integer)                   from anon;
revoke execute on function public.list_students_frequency_dropping()                from anon;
revoke execute on function public.list_prescriptions_stagnant(integer)              from anon;
revoke execute on function public.calc_oura_baseline(uuid, integer)                 from anon;
revoke execute on function public.delete_prescription_cascade(uuid)                 from anon;
revoke execute on function public.update_prescription_with_exercises(uuid, text, text, jsonb) from anon;
revoke execute on function public.create_workout_session_with_exercises(uuid, date, time without time zone, text, jsonb) from anon;
revoke execute on function public.create_group_workout_session_with_exercises(uuid, uuid, date, time without time zone, jsonb) from anon;
revoke execute on function public.list_unlinked_session_exercise_review()           from anon;
revoke execute on function public.search_exercises_by_name(text, text, integer)     from anon;
revoke execute on function public.normalize_objective(text)                         from anon;

commit;
