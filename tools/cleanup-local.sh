#!/usr/bin/env bash
# Local cleanup with confirmation. There are no AWS resources to delete in this project.
# Asks once before starting and once more before removing the Stop hook retry counters (local data).
# A failing step prints a warning and the script continues. Pass --yes to skip the prompts.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
YES="${1:-}"
confirm() {
  [ "$YES" = "--yes" ] && return 0
  printf '%s [y/N] ' "$1"
  read -r answer
  [ "$answer" = "y" ] || [ "$answer" = "Y" ]
}
step() {
  local label="$1"; shift
  if "$@"; then echo "done: ${label}"; else echo "WARN: ${label} failed; continuing"; fi
}

echo "This removes: examples/frontend-demo/node_modules, test-results, playwright-report."
confirm "Continue?" || { echo "Aborted."; exit 0; }
step "remove demo dependencies" rm -rf "${ROOT}/examples/frontend-demo/node_modules"
step "remove test results" rm -rf "${ROOT}/examples/frontend-demo/test-results" "${ROOT}/examples/frontend-demo/playwright-report"

COUNTERS="${TMPDIR:-/tmp}/kiro-ui-verify"
if [ -d "$COUNTERS" ]; then
  if confirm "Also delete the Stop hook retry counters in ${COUNTERS}?"; then
    step "remove retry counters" rm -rf "$COUNTERS"
  fi
fi

echo "Not removed (see README, Cleanup): the Playwright browser cache, the npx cache of @playwright/mcp,"
echo "and anything copied into other repositories."
