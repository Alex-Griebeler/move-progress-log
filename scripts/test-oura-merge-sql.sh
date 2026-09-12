#!/usr/bin/env bash
# Teste COMPORTAMENTAL do RPC upsert_oura_row_merge num Postgres local
# (Postgres.app / `psql -d postgres`), com o DDL REAL de oura_metrics e
# oura_acute_metrics extraído das migrations do repo. Não roda no CI (sem
# Postgres lá); rodar localmente antes de mexer na migration:
#   scripts/test-oura-merge-sql.sh
# Sai com código != 0 se qualquer ASSERT falhar.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=oura_merge_test_$$
psql -d postgres -qAt -c "CREATE DATABASE $DB" >/dev/null
trap 'psql -d postgres -qAt -c "DROP DATABASE IF EXISTS $DB" >/dev/null' EXIT

DDL=$(mktemp)
{
  echo "CREATE SCHEMA IF NOT EXISTS auth; CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS \$\$ SELECT NULL::uuid \$\$;"
  echo "CREATE TABLE IF NOT EXISTS public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), trainer_id uuid, name text);"
  awk '/CREATE TABLE IF NOT EXISTS public.oura_metrics \(/,/\);/' supabase/migrations/20251030010328_82923690-2cfc-4eb8-b498-4af0297b29a6.sql
  for f in $(ls supabase/migrations/*.sql | sort); do grep -h "ALTER TABLE[^;]*oura_metrics ADD COLUMN[^;]*;" "$f" || true; done | sed 's/ALTER TABLE oura_metrics/ALTER TABLE public.oura_metrics/'
  awk '/CREATE TABLE IF NOT EXISTS public.oura_acute_metrics \(/,/\);/' supabase/migrations/20260410161257_2a8c2f00-23fd-4b5f-9178-a4a480da324d.sql
  for f in $(ls supabase/migrations/*.sql | sort); do grep -h "ALTER TABLE[^;]*oura_acute_metrics ADD COLUMN[^;]*;" "$f" || true; done
} > "$DDL"

psql -d "$DB" -v ON_ERROR_STOP=1 -qAt <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END \$\$;
\i $DDL
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
\i supabase/migrations/20260912150000_oura_upsert_merge_rpc.sql
\i supabase/tests/oura_upsert_merge.test.sql
SQL
rm -f "$DDL"
echo "OK: supabase/tests/oura_upsert_merge.test.sql passou"
