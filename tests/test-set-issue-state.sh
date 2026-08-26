#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-state.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q
"$ROOT/install.sh" "$fixture" >/dev/null
fake_bin="$fixture/bin"
calls="$fixture/calls"
mkdir -p "$fake_bin"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'if [ "${1:-}" = auth ] && [ "${2:-}" = status ]; then exit 0; fi' \
  'if [ "${1:-}" = issue ] && [ "${2:-}" = view ]; then printf "%s\n" "$GH_LABELS"; exit 0; fi' \
  'if [ "${1:-}" = api ]; then printf "%s\n" "$@" > "$GH_CALLS"; exit 0; fi' \
  'exit 1' > "$fake_bin/gh"
chmod +x "$fake_bin/gh"

updated_output="$(cd "$fixture" && PATH="$fake_bin:$PATH" GH_CALLS="$calls" GH_LABELS="$(printf 'bug\nfactory:wait-to-implement\nfactory:in-progress\nfactory:verifying')" ./.factory/scripts/set-issue-state.sh 27 needs-info)"
printf '%s' "$updated_output" | grep -q 'status=UPDATED'
printf '%s' "$updated_output" | grep -q 'state=factory:needs-info'
grep -Fxq 'labels[]=bug' "$calls"
grep -Fxq 'labels[]=factory:needs-info' "$calls"
! grep -Fq 'factory:wait-to-implement' "$calls"
! grep -Fq 'factory:in-progress' "$calls"
! grep -Fq 'factory:verifying' "$calls"

unchanged_output="$(cd "$fixture" && PATH="$fake_bin:$PATH" GH_CALLS="$calls" GH_LABELS="factory:needs-info" ./.factory/scripts/set-issue-state.sh 27 factory:needs-info)"
printf '%s' "$unchanged_output" | grep -q 'status=UNCHANGED'

set +e
invalid_output="$(cd "$fixture" && PATH="$fake_bin:$PATH" GH_CALLS="$calls" GH_LABELS="" ./.factory/scripts/set-issue-state.sh 27 in-progress 2>&1)"
invalid_status=$?
set -e
[ "$invalid_status" -eq 2 ]
printf '%s' "$invalid_output" | grep -q 'reason=invalid-state'

echo "set-issue-state: ok"
