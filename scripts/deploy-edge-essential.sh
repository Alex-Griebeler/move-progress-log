#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  SUPABASE_PROJECT_REF
  SUPABASE_ACCESS_TOKEN
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "::error::Missing required environment variable: ${var}"
    exit 1
  fi
done

functions=(
  "import-exercises"
  "oura-sync-all"
  "oura-sync-scheduled"
  "generate-student-report"
)

echo "Deploying essential edge functions to project ${SUPABASE_PROJECT_REF}..."

for fn in "${functions[@]}"; do
  echo "-> Deploying ${fn}"
  supabase functions deploy "${fn}" --project-ref "${SUPABASE_PROJECT_REF}"
done

echo "Edge deployment finished successfully."
