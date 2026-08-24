#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-doctor.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q
"$ROOT/install.sh" "$fixture" >/dev/null

set +e
(cd "$fixture" && ./.factory/scripts/doctor.sh >/dev/null); incomplete_status=$?
set -e
[ "$incomplete_status" -ne 0 ]

sed -i.bak \
  -e 's/<PROJECT_NAME>/Test project/g' \
  -e 's/<INSTALL_COMMAND>/true/g' \
  -e 's/<TEST_COMMAND>/true/g' \
  -e 's/<BUILD_COMMAND>/true/g' \
  -e 's/<RUN_COMMAND>/true/g' "$fixture/AGENTS.md"
sed -i.bak \
  -e 's/CHARTER_STATUS: incomplete/CHARTER_STATUS: ready/' \
  -e 's/TIER: <revival | greenfield | oss | client-production>/TIER: greenfield/' "$fixture/docs/factory/CHARTER.md"
rm -f "$fixture"/*.bak "$fixture/.factory"/*.bak "$fixture/docs/factory"/*.bak
(cd "$fixture" && ./.factory/scripts/doctor.sh >/dev/null)

sed -i.bak -e 's/default: full/default: typo/' "$fixture/docs/factory/CHARTER.md"
rm -f "$fixture/docs/factory/CHARTER.md.bak"
set +e
(cd "$fixture" && ./.factory/scripts/doctor.sh >/dev/null); invalid_gate_status=$?
set -e
[ "$invalid_gate_status" -ne 0 ]
echo "doctor: ok"
