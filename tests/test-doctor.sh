#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-doctor.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q
"$ROOT/install.sh" "$fixture" >/dev/null

set +e
(cd "$fixture" && ./.factory/scripts/doctor.sh >/dev/null)
incomplete_status=$?
set -e
[ "$incomplete_status" -ne 0 ]

git -C "$fixture" remote add origin https://example.invalid/project.git
printf '%s\n' 'VERIFY_COMMAND="true"' > "$fixture/.factory/gates.conf"
mkdir -p "$fixture/bin"
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'if [ "${1:-}" = auth ] && [ "${2:-}" = status ]; then exit 0; fi' \
  'exit 1' > "$fixture/bin/gh"
chmod +x "$fixture/bin/gh"

(cd "$fixture" && PATH="$fixture/bin:$PATH" ./.factory/scripts/doctor.sh >/dev/null)
echo "doctor: ok"
