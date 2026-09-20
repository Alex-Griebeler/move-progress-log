#!/usr/bin/env bash
# Teste COMPORTAMENTAL do RPC replace_whoop_metrics_batch num Postgres local
# (Postgres.app / `psql -d postgres`), com o DDL REAL de whoop_metrics tirado
# das migrations. Não roda no CI (sem Postgres lá); rodar localmente antes de
# mexer na migration:
#   scripts/test-whoop-merge-sql.sh
# Sai com código != 0 se qualquer ASSERT falhar.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=whoop_merge_test_$$
psql -d postgres -qAt -c "CREATE DATABASE $DB" >/dev/null
trap 'psql -d postgres -qAt -c "DROP DATABASE IF EXISTS $DB" >/dev/null' EXIT

MIGRATION=$(ls supabase/migrations/*whoop_metrics_merge*.sql | tail -1)
DDL=$(mktemp)
{
  echo "CREATE TABLE IF NOT EXISTS public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), trainer_id uuid, name text);"
  awk '/CREATE TABLE public.whoop_metrics \(/,/\);/' supabase/migrations/20260709161835_278374c0-a482-4792-8b87-a2492581c6e9.sql
  for f in $(ls supabase/migrations/*.sql | sort); do grep -h "ALTER TABLE[^;]*whoop_metrics[^;]*ADD COLUMN[^;]*;" "$f" || true; done
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
\i $MIGRATION
\i supabase/tests/whoop_metrics_merge.test.sql
SQL
rm -f "$DDL"
echo "OK: supabase/tests/whoop_metrics_merge.test.sql passou"
