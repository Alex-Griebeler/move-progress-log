#!/usr/bin/env bash
set -euo pipefail

# Local fallback for Vite-style env names (keeps CI behavior unchanged).
if [[ -z "${SUPABASE_URL:-}" && -n "${VITE_SUPABASE_URL:-}" ]]; then
  SUPABASE_URL="${VITE_SUPABASE_URL}"
fi

if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  if [[ -n "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
    SUPABASE_ANON_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"
  elif [[ -n "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
    SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"
  fi
fi

required_vars=(
  SUPABASE_URL
  SUPABASE_ANON_KEY
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "::error::Missing required environment variable: ${var}"
    exit 1
  fi
done

RUN_SERVICE_ROLE_TESTS="${RUN_SERVICE_ROLE_TESTS:-false}"
TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-120}"
REPORT_DIR="${REPORT_DIR:-artifacts}"
REPORT_FILE="${REPORT_DIR}/edge-smoke-report.md"
mkdir -p "${REPORT_DIR}"

failures=0
rows=()

truncate_body() {
  local input="$1"
  echo "$input" | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g' | cut -c1-220
}

append_row() {
  local scenario="$1"
  local expected="$2"
  local obtained="$3"
  local status="$4"
  rows+=("| ${scenario} | ${expected} | ${obtained} | ${status} |")
}

call_endpoint() {
  local endpoint="$1"
  local payload="$2"
  local token="${3:-}"
  local tmp_body
  tmp_body="$(mktemp)"
  local url="${SUPABASE_URL%/}/functions/v1/${endpoint}"

  local -a args=(
    -sS
    -m "${TIMEOUT_SECONDS}"
    -X POST
    "${url}"
    -H "Content-Type: application/json"
    -o "${tmp_body}"
    -w "%{http_code}"
    -d "${payload}"
  )

  if [[ -n "${token}" ]]; then
    args+=(-H "Authorization: Bearer ${token}")
  fi

  HTTP_STATUS="$(curl "${args[@]}" || true)"
  HTTP_BODY="$(cat "${tmp_body}" 2>/dev/null || true)"
  rm -f "${tmp_body}"
}

is_one_of() {
  local value="$1"
  shift
  for candidate in "$@"; do
    if [[ "${value}" == "${candidate}" ]]; then
      return 0
    fi
  done
  return 1
}

expect_status() {
  local scenario="$1"
  local expected_text="$2"
  shift 2
  local body_preview
  body_preview="$(truncate_body "${HTTP_BODY}")"

  if is_one_of "${HTTP_STATUS}" "$@"; then
    append_row "${scenario}" "${expected_text}" "${HTTP_STATUS} ${body_preview}" "PASS"
  else
    append_row "${scenario}" "${expected_text}" "${HTTP_STATUS} ${body_preview}" "FAIL"
    failures=$((failures + 1))
  fi
}

expect_not_status() {
  local scenario="$1"
  local expected_text="$2"
  shift 2
  local body_preview
  body_preview="$(truncate_body "${HTTP_BODY}")"

  if is_one_of "${HTTP_STATUS}" "$@"; then
    append_row "${scenario}" "${expected_text}" "${HTTP_STATUS} ${body_preview}" "FAIL"
    failures=$((failures + 1))
  else
    append_row "${scenario}" "${expected_text}" "${HTTP_STATUS} ${body_preview}" "PASS"
  fi
}

FORGED_JWT='eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.invalid'

# Non-destructive auth rejection smoke tests
call_endpoint "import-exercises" '{"format":"spreadsheet","skip_orphans":true,"exercises":[]}'
expect_status "A1 import-exercises sem auth" "401" "401"

call_endpoint "oura-sync-all" '{}'
expect_status "B1 oura-sync-all sem auth" "401" "401"

call_endpoint "oura-sync-all" '{}' "${FORGED_JWT}"
expect_status "B2 oura-sync-all token forjado" "401/403" "401" "403"

call_endpoint "oura-sync-all" '{}' "${SUPABASE_ANON_KEY}"
expect_status "B3 oura-sync-all anon bearer" "401" "401"

call_endpoint "oura-sync-scheduled" '{}'
expect_status "C1 oura-sync-scheduled sem auth" "401" "401"

call_endpoint "oura-sync-scheduled" '{}' "${FORGED_JWT}"
expect_status "C2 oura-sync-scheduled token forjado" "401/403" "401" "403"

call_endpoint "oura-sync-scheduled" '{}' "${SUPABASE_ANON_KEY}"
expect_status "C3 oura-sync-scheduled anon bearer" "401" "401"

call_endpoint "generate-student-report" '{"studentId":"00000000-0000-0000-0000-000000000000","periodStart":"2026-01-01","periodEnd":"2026-01-31","trackedExercises":["00000000-0000-0000-0000-000000000000"]}'
expect_status "D0 generate-student-report sem auth" "401" "401"

# Optional service role validations
if [[ "${RUN_SERVICE_ROLE_TESTS}" == "true" ]]; then
  if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    append_row "A3/B4/C4 service_role" "secret presente" "SUPABASE_SERVICE_ROLE_KEY ausente" "FAIL"
    failures=$((failures + 1))
  else
    call_endpoint "import-exercises" '{"format":"spreadsheet","skip_orphans":true,"exercises":[]}' "${SUPABASE_SERVICE_ROLE_KEY}"
    expect_status "A3 import-exercises service_role" "200/201" "200" "201"

    call_endpoint "oura-sync-all" '{}' "${SUPABASE_SERVICE_ROLE_KEY}"
    expect_not_status "B4 oura-sync-all service_role" "não 401/403" "401" "403"

    call_endpoint "oura-sync-scheduled" '{}' "${SUPABASE_SERVICE_ROLE_KEY}"
    expect_not_status "C4 oura-sync-scheduled service_role" "não 401/403" "401" "403"
  fi
else
  append_row "A3/B4/C4 service_role" "opcional (workflow_dispatch)" "não executado" "SKIP"
fi

{
  echo "# Edge Auth Smoke Report"
  echo
  echo "| Cenário | Esperado | Obtido | Status |"
  echo "|---|---|---|---|"
  for row in "${rows[@]}"; do
    echo "${row}"
  done
  echo
  echo "- Failures: ${failures}"
  echo "- RUN_SERVICE_ROLE_TESTS: ${RUN_SERVICE_ROLE_TESTS}"
} > "${REPORT_FILE}"

cat "${REPORT_FILE}"

if [[ "${failures}" -gt 0 ]]; then
  echo "::error::Smoke tests failed (${failures})"
  exit 1
fi

echo "Smoke tests passed."
