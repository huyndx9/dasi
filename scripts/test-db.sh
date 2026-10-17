#!/usr/bin/env bash
# Apply the auth stub, every migration and seed.sql to an EMPTY Postgres database,
# then run the RLS checks. Usage: DATABASE_URL=postgres://... scripts/test-db.sh
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to an empty Postgres 15+ database}"
cd "$(dirname "$0")/.."

psql_run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

psql_run -f supabase/tests/auth-stub.sql
for migration in supabase/migrations/*.sql; do
  echo "migration: $migration"
  psql_run -f "$migration"
done
echo "seed: supabase/seed.sql"
psql_run -1 -f supabase/seed.sql

# RLS checks run on a fresh state inside a transaction that is rolled back.
psql_run -c 'truncate auth.users cascade'
psql_run -1 -o /dev/null -f supabase/tests/rls.sql
echo "Database checks passed."
