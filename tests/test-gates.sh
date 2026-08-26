#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-gates.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q
"$ROOT/install.sh" "$fixture" >/dev/null

set +e
missing_output="$(cd "$fixture" && ./.factory/scripts/gates.sh 2>&1)"
missing_status=$?
set -e
[ "$missing_status" -eq 2 ]
printf '%s' "$missing_output" | grep -q 'status=MISCONFIGURED reason=verify-command-not-configured'

printf '%s\n' 'VERIFY_COMMAND="true"' > "$fixture/.factory/gates.conf"
green_output="$(cd "$fixture" && ./.factory/scripts/gates.sh)"
printf '%s' "$green_output" | grep -q 'status=GREEN'

printf '%s\n' 'VERIFY_COMMAND="false"' > "$fixture/.factory/gates.conf"
set +e
red_output="$(cd "$fixture" && ./.factory/scripts/gates.sh 2>&1)"
red_status=$?
set -e
[ "$red_status" -eq 1 ]
printf '%s' "$red_output" | grep -q 'status=RED exit=1'

echo "gates: ok"
