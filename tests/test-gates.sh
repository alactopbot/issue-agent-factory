#!/usr/bin/env bash
set -euo pipefail

command -v node >/dev/null 2>&1 || { echo "gates: skipped (node unavailable)"; exit 0; }
command -v npm >/dev/null 2>&1 || { echo "gates: skipped (npm unavailable)"; exit 0; }
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-gates.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q
"$ROOT/install.sh" "$fixture" >/dev/null

write_package() {
  local test_command="$1"
  if [ "$test_command" = missing ]; then
    printf '%s\n' '{"private":true,"scripts":{"typecheck":"true","lint":"true"}}' > "$fixture/package.json"
  else
    printf '%s\n' "{\"private\":true,\"scripts\":{\"typecheck\":\"true\",\"lint\":\"true\",\"test\":\"$test_command\"}}" > "$fixture/package.json"
  fi
}

write_package true
green_output="$(cd "$fixture" && ./.factory/scripts/gates.sh full)"
printf '%s' "$green_output" | grep -q 'status=GREEN'

# Deep gates must not invoke registry-backed dependency audits. Repositories may
# still expose their own audit command for an explicit, on-demand security check.
real_npm="$(command -v npm)"
fake_bin="$fixture/fake-bin"
audit_marker="$fixture/audit-ran"
mkdir -p "$fake_bin"
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'if [ "${1:-}" = "audit" ]; then' \
  '  : > "$AUDIT_MARKER"' \
  '  exit 91' \
  'fi' \
  'exec "$REAL_NPM" "$@"' > "$fake_bin/npm"
chmod +x "$fake_bin/npm"
printf '%s\n' '{"name":"gate-fixture","version":"1.0.0","lockfileVersion":3,"requires":true,"packages":{}}' > "$fixture/package-lock.json"
deep_output="$(cd "$fixture" && PATH="$fake_bin:$PATH" REAL_NPM="$real_npm" AUDIT_MARKER="$audit_marker" ./.factory/scripts/gates.sh deep)"
printf '%s' "$deep_output" | grep -q 'status=GREEN'
[ ! -e "$audit_marker" ]
rm -f "$fixture/package-lock.json"

sed -i.bak -e 's/default: full/default: fast/' "$fixture/docs/factory/CHARTER.md"
rm -f "$fixture/docs/factory/CHARTER.md.bak"
default_output="$(cd "$fixture" && ./.factory/scripts/gates.sh)"
printf '%s' "$default_output" | grep -q 'level=fast status=GREEN'
sed -i.bak -e 's/default: fast/default: full/' "$fixture/docs/factory/CHARTER.md"
rm -f "$fixture/docs/factory/CHARTER.md.bak"

set +e
invalid_output="$(cd "$fixture" && ./.factory/scripts/gates.sh typo 2>&1)"; invalid_status=$?
set -e
[ "$invalid_status" -eq 2 ]
printf '%s' "$invalid_output" | grep -q 'status=MISCONFIGURED'

write_package missing
set +e
missing_output="$(cd "$fixture" && ./.factory/scripts/gates.sh full 2>&1)"; missing_status=$?
set -e
[ "$missing_status" -eq 2 ]
printf '%s' "$missing_output" | grep -q 'misconfigured=test'

write_package false
set +e
red_output="$(cd "$fixture" && ./.factory/scripts/gates.sh full 2>&1)"; red_status=$?
set -e
[ "$red_status" -eq 1 ]
printf '%s' "$red_output" | grep -q 'status=RED'

write_package true
printf '%s\n' \
  'REQUIRED_FAST=""' \
  'REQUIRED_FULL=""' \
  'REQUIRED_DEEP="architecture"' \
  'ARCHITECTURE_COMMAND=""' > "$fixture/.factory/gates.conf"
set +e
architecture_output="$(cd "$fixture" && ./.factory/scripts/gates.sh deep 2>&1)"; architecture_status=$?
set -e
[ "$architecture_status" -eq 2 ]
printf '%s' "$architecture_output" | grep -q 'misconfigured=architecture'

printf '%s\n' \
  'REQUIRED_FAST=""' \
  'REQUIRED_FULL=""' \
  'REQUIRED_DEEP="architecture"' \
  'ARCHITECTURE_COMMAND="true"' > "$fixture/.factory/gates.conf"
architecture_green="$(cd "$fixture" && ./.factory/scripts/gates.sh deep)"
printf '%s' "$architecture_green" | grep -q 'status=GREEN'
echo "gates: ok"
