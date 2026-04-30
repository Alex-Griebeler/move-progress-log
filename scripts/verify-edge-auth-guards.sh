#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="supabase/config.toml"
FUNCTIONS_DIR="supabase/functions"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[edge-auth] FAIL: config file not found: $CONFIG_FILE"
  exit 1
fi

current_function=""
verify_jwt_entries=0
verify_jwt_false_functions=()

while IFS= read -r line; do
  if [[ "$line" =~ ^\[functions\.([a-zA-Z0-9_-]+)\]$ ]]; then
    current_function="${BASH_REMATCH[1]}"
    continue
  fi

  if [[ -n "$current_function" && "$line" =~ ^verify_jwt[[:space:]]*=[[:space:]]*(true|false) ]]; then
    verify_value="${BASH_REMATCH[1]}"
    verify_jwt_entries=$((verify_jwt_entries + 1))
    if [[ "$verify_value" == "false" ]]; then
      verify_jwt_false_functions+=("$current_function")
    fi
    current_function=""
  fi
done < "$CONFIG_FILE"

if [[ $verify_jwt_entries -eq 0 ]]; then
  echo "[edge-auth] FAIL: no function verify_jwt entries parsed from $CONFIG_FILE"
  exit 1
fi

# Intentionally public endpoints (token/state validated inside business flow)
INTENTIONALLY_PUBLIC=(
  "validate-student-invite"
  "create-student-from-invite"
  "oura-callback"
)

is_intentionally_public() {
  local fn="$1"
  for allowed in "${INTENTIONALLY_PUBLIC[@]}"; do
    if [[ "$allowed" == "$fn" ]]; then
      return 0
    fi
  done
  return 1
}

guarded_missing=()
public_missing=()

for function_name in "${verify_jwt_false_functions[@]}"; do
  file_path="$FUNCTIONS_DIR/$function_name/index.ts"
  if [[ ! -f "$file_path" ]]; then
    guarded_missing+=("$function_name (missing file)")
    continue
  fi

  if is_intentionally_public "$function_name"; then
    if ! grep -qE "invite_token|state|expires_at|is_used|authorization code" "$file_path"; then
      public_missing+=("$function_name")
    fi
    continue
  fi

  # For verify_jwt=false operational endpoints, require at least one
  # explicit authentication/authorization control in code.
  if ! grep -qE "authenticateServiceRoleOrUserRole|auth\.getUser\(|x-admin-key|service_role required|SUPABASE_SERVICE_ROLE_KEY|role.*admin|role.*trainer" "$file_path"; then
    guarded_missing+=("$function_name")
  fi
done

if [[ ${#guarded_missing[@]} -gt 0 || ${#public_missing[@]} -gt 0 ]]; then
  echo "[edge-auth] FAIL: missing expected auth guards"
  if [[ ${#guarded_missing[@]} -gt 0 ]]; then
    echo "  - verify_jwt=false endpoints without detected guard:"
    for item in "${guarded_missing[@]}"; do
      echo "    - $item"
    done
  fi
  if [[ ${#public_missing[@]} -gt 0 ]]; then
    echo "  - intentionally public endpoints without token/state markers:"
    for item in "${public_missing[@]}"; do
      echo "    - $item"
    done
  fi
  exit 1
fi

echo "[edge-auth] PASS: verify_jwt=false endpoints have expected guard markers."
