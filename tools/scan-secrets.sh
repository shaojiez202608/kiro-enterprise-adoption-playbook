#!/usr/bin/env bash
# Secret scan of the complete git history, plus a canary that proves the scanner can detect a leak.
# The canary is generated at run time in a temporary directory outside this repository; nothing is committed.
# Exit codes: 0 history clean and canary detected; 1 leak found in history; 3 canary NOT detected.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GITLEAKS="${GITLEAKS:-gitleaks}"
command -v "$GITLEAKS" >/dev/null 2>&1 || { echo "gitleaks not found"; exit 2; }

echo "== gitleaks: full history of ${ROOT##*/}"
"$GITLEAKS" git --no-banner --redact --exit-code 42 --config "${ROOT}/.gitleaks.toml" --log-opts="--all" "$ROOT"
history_status=$?

echo "== canary: a generated fake key must be reported"
CANARY_DIR="$(mktemp -d)"
trap 'rm -rf "$CANARY_DIR"' EXIT
key="AKIA$(LC_ALL=C tr -dc 'A-Z2-7' < /dev/urandom | head -c 16)"
printf 'aws_access_key_id = %s\n' "$key" > "${CANARY_DIR}/canary.txt"
# Scanned as a directory (no commit), with the same configuration as the history scan.
"$GITLEAKS" dir --no-banner --redact --exit-code 42 --config "${ROOT}/.gitleaks.toml" "$CANARY_DIR" >/dev/null 2>&1
canary_status=$?

# 42 = leaks found; any other code is a scanner error, which also fails the canary.
if [ "$canary_status" -ne 42 ]; then echo "FAIL: canary not detected (gitleaks exit ${canary_status})"; exit 3; fi
echo "OK: canary detected (gitleaks exit ${canary_status})"
if [ "$history_status" -ne 0 ]; then echo "FAIL: gitleaks history scan exit ${history_status} (42 = findings)"; exit 1; fi
echo "OK: no leaks in history"
