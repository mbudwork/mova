#!/bin/sh
# Convenience wrapper for the integration suite against a local Postgres.
#
# With Supabase CLI (normal developer setup):
#   supabase start && supabase db reset
#   DATABASE_URL="$(supabase status -o env | grep DB_URL | cut -d= -f2-)" npm run test:integration
#
# The suite rebuilds its own database (dadb_test) from supabase/migrations
# plus supabase/seed.sql, so it never touches development data.
set -e
: "${PGHOST:=/tmp}"
: "${PGPORT:=5433}"
export PGHOST PGPORT
npx vitest run tests/integration
