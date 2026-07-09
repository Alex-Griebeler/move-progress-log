-- Fix: 20260704204139_harden_definer_rpc_grants misclassified
-- public.compute_week_adherence() as a trigger-only/backend function and
-- revoked EXECUTE from authenticated. It is actually one of the 4 dashboard
-- KPI RPCs, called from the browser by useDashboardKPIs.ts ("Adesão da
-- semana"), so the revoke broke that card with 42501 (found 2026-07-09 right
-- after applying the grants migration in production).
--
-- anon and PUBLIC stay revoked (the dashboard is authenticated-only).
GRANT EXECUTE ON FUNCTION public.compute_week_adherence() TO authenticated;
