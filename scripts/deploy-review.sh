#!/usr/bin/env bash
#
# One-command owner review deployment.
#
# Prerequisites (see docs/REVIEW_DEPLOYMENT.md for the click path):
#   - a Supabase project
#   - a Vercel account
#   - the Supabase and Vercel CLIs installed and logged in
#
# Everything secret is read from the environment. Nothing is written to disk,
# committed, or shipped in the client bundle.
#
#   export SUPABASE_PROJECT_REF=abcdefghijklmnop
#   export SUPABASE_DB_PASSWORD='...'
#   export NEXT_PUBLIC_SUPABASE_URL='https://abcdefghijklmnop.supabase.co'
#   export NEXT_PUBLIC_SUPABASE_ANON_KEY='...'
#   export SUPABASE_SERVICE_ROLE_KEY='...'
#   export REVIEW_EMAIL='you@example.com'
#   ./scripts/deploy-review.sh

set -euo pipefail

require() {
  if [ -z "${!1:-}" ]; then
    echo "Missing required environment variable: $1" >&2
    exit 1
  fi
}

for var in SUPABASE_PROJECT_REF SUPABASE_DB_PASSWORD NEXT_PUBLIC_SUPABASE_URL \
           NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY REVIEW_EMAIL; do
  require "$var"
done

DB_URL="postgresql://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

echo "==> 1/5  Applying migrations to the Supabase project"
npx supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
npx supabase db push --password "$SUPABASE_DB_PASSWORD"

echo "==> 2/5  Importing the production Content Master"
node scripts/import-course-content.mjs \
  content/deutsch_auf_der_baustelle_FINAL_v2.xlsx --db "$DB_URL"

echo "==> 3/5  Verifying the import"
psql "$DB_URL" -tAc "
  select 'phrases=' || (select count(*) from phrases)
      || ' vocabulary=' || (select count(*) from vocabulary_items)
      || ' lessons=' || (select count(*) from lessons)
      || ' lesson_map=' || (select count(*) from lesson_phrases)
      || ' audio_generated=' || (select count(*) from audio_assets where status <> 'pending');"

echo "==> 4/5  Creating the review account"
SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
DATABASE_URL="$DB_URL" \
  node scripts/create-review-user.mjs "$REVIEW_EMAIL"

echo "==> 5/5  Deploying to Vercel"
# Secrets go into the deployment environment, never into the repository.
printf '%s' "$NEXT_PUBLIC_SUPABASE_URL"      | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production --force
printf '%s' "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force
printf '%s' "$SUPABASE_SERVICE_ROLE_KEY"     | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production --force
printf '%s' "true"                           | npx vercel env add ALLOW_DEMO_MODE_IN_PRODUCTION production --force

npx vercel deploy --prod --yes

echo
echo "Done. Open the URL Vercel printed above, and sign in with the review"
echo "account credentials printed in step 4."
