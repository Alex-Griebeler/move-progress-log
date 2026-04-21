#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

TARGETS=(
  "src"
  "supabase/functions"
)

echo "[query-safety] Checking for select('*') usage in typed app code..."

PATTERN="select\\(\\s*['\\\"]\\*['\\\"]"

if rg -n -g '*.{ts,tsx,js,jsx}' "${PATTERN}" "${TARGETS[@]}"; then
  echo "[query-safety] FAIL: found select('*') usage. Use explicit select columns."
  exit 1
fi

echo "[query-safety] PASS: no select('*') found in src or supabase/functions."
