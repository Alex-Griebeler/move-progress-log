#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/4] Lint"
npm run lint

echo "==> [2/4] Tests"
npm run test

echo "==> [3/4] Build"
npm run build

echo "==> [4/4] Security audit (high)"
npm audit --audit-level=high

echo ""
echo "Essential automated gates: PASS"
