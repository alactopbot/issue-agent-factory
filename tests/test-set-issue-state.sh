#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-state.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q
"$ROOT/install.sh" "$fixture" >/dev/null

fake_bin="$fixture/fake-bin"
calls="$fixture/gh-calls"
mkdir -p "$fake_bin"
printf '%s\n' \
  '#!/usr/bin/env bash' \
  'case "${1:-} ${2:-}" in' \
  '  "auth status") exit 0 ;;' \
  '  "issue view") printf "%s\n" "$GH_LABELS"; exit 0 ;;' \
  '  "api --method") printf "%s\n" "$@" > "$GH_CALLS"; exit 0 ;;' \
  '  *) exit 9 ;;' \
  'esac' > "$fake_bin/gh"
chmod +x "$fake_bin/gh"

updated_output="$(cd "$fixture" && PATH="$fake_bin:$PATH" GH_CALLS="$calls" GH_LABELS="$(printf 'bug\nfactory:pattern:small-fix\nfactory:wait-to-implement\nfactory:in-progress')" ./.factory/scripts/set-issue-state.sh 27 needs-info)"
printf '%s' "$updated_output" | grep -q 'status=UPDATED'
printf '%s' "$updated_output" | grep -q 'state=factory:needs-info'
grep -Fxq 'labels[]=bug' "$calls"
grep -Fxq 'labels[]=factory:pattern:small-fix' "$calls"
grep -Fxq 'labels[]=factory:needs-info' "$calls"
! grep -Fq 'factory:wait-to-implement' "$calls"
! grep -Fq 'factory:in-progress' "$calls"
[ "$(grep -c '^PATCH$' "$calls")" -eq 1 ]

rm -f "$calls"
unchanged_output="$(cd "$fixture" && PATH="$fake_bin:$PATH" GH_CALLS="$calls" GH_LABELS="$(printf 'bug\nfactory:needs-info')" ./.factory/scripts/set-issue-state.sh 27 factory:needs-info)"
printf '%s' "$unchanged_output" | grep -q 'status=UNCHANGED'
[ ! -e "$calls" ]

set +e
invalid_output="$(cd "$fixture" && PATH="$fake_bin:$PATH" ./.factory/scripts/set-issue-state.sh 27 verified 2>&1)"; invalid_status=$?
set -e
[ "$invalid_status" -eq 2 ]
printf '%s' "$invalid_output" | grep -q 'reason=invalid-state'
echo "set-issue-state: ok"
