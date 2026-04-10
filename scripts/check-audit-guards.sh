#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

WILDCARD_PATTERN='select\(\s*["'"'"']\*["'"'"']\s*\)'
TS_IGNORE_PATTERN='@ts-ignore'
TARGET_PATHS=(src supabase/functions)

search_matches() {
  local pattern="$1"
  shift

  if command -v rg >/dev/null 2>&1; then
    rg -n "$pattern" "$@"
  else
    grep -RInE "$pattern" "$@" || true
  fi
}

echo "==> Audit guard 1/2: disallow wildcard selects"
WILDCARD_MATCHES="$(search_matches "$WILDCARD_PATTERN" "${TARGET_PATHS[@]}" || true)"
if [[ -n "$WILDCARD_MATCHES" ]]; then
  echo "Found forbidden wildcard select usage:"
  echo "$WILDCARD_MATCHES"
  exit 1
fi
echo "OK: no wildcard select usage found."

echo "==> Audit guard 2/2: disallow @ts-ignore"
TS_IGNORE_MATCHES="$(search_matches "$TS_IGNORE_PATTERN" "${TARGET_PATHS[@]}" || true)"
if [[ -n "$TS_IGNORE_MATCHES" ]]; then
  echo "Found forbidden @ts-ignore usage:"
  echo "$TS_IGNORE_MATCHES"
  exit 1
fi
echo "OK: no @ts-ignore usage found."

echo "Audit guards: PASS"
