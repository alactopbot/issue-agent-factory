#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hook="$ROOT/template/.factory/hooks/block-merge.sh"
blocked() {
  set +e
  printf '{"tool_input":{"command":"%s"}}\n' "$1" | bash "$hook" >/dev/null 2>&1
  local status=$?
  set -e
  [ "$status" -eq 2 ] || { echo "expected block: $1" >&2; exit 1; }
}
allowed() {
  set +e
  printf '{"tool_input":{"command":"%s"}}\n' "$1" | bash "$hook" >/dev/null 2>&1
  local status=$?
  set -e
  [ "$status" -eq 0 ] || { echo "expected allow: $1" >&2; exit 1; }
}

allowed 'git status'
blocked 'gh pr merge 42 --squash'
blocked 'git push origin main'
blocked 'git push origin HEAD:main'
blocked 'git push origin +refs/heads/main'
blocked 'git push origin +issue/3-add-export'
allowed 'git push origin HEAD:refs/heads/issue/3-add-export'
allowed 'git push origin --delete issue/3-add-export'
allowed 'printf x > docs/requirements/example.tmp'
allowed './.factory/scripts/gates.sh full > /tmp/factory-gates.log'
echo "hook: ok"
