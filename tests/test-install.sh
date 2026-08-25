#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-install.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q
"$ROOT/install.sh" "$fixture" >/dev/null

for path in \
  AGENTS.md \
  .agents/skills/factory-spec/SKILL.md \
  .agents/skills/factory-implement/SKILL.md \
  .factory/pattern.schema.json \
  .factory/scripts/claim.sh \
  .factory/scripts/gates.sh \
  .factory/scripts/set-issue-state.sh \
  .factory/scripts/validate-pr-state.mjs \
  .factory/hooks/block-merge.sh \
  .codex/hooks.json \
  docs/factory/CONTRACT.md \
  docs/requirements/README.md; do
  [ -e "$fixture/$path" ] || { echo "missing installed file: $path" >&2; exit 1; }
done

[ -x "$fixture/.factory/scripts/claim.sh" ]
[ -x "$fixture/.factory/scripts/set-issue-state.sh" ]
[ -x "$fixture/.factory/scripts/validate-pr-state.mjs" ]
[ ! -e "$fixture/.github/workflows" ]
[ ! -e "$fixture/.factory/scripts/ci-setup.sh" ]
[ ! -e "$fixture/.factory/scripts/validate-pr-gates.mjs" ]
[ ! -e "$fixture/.factory/project.json" ]
[ ! -e "$fixture/.factory/project.schema.json" ]

second_run="$("$ROOT/install.sh" "$fixture")"
printf '%s' "$second_run" | grep -q 'created: 0'

set +e
"$ROOT/install.sh" --unknown "$fixture" >/dev/null 2>&1
unknown_status=$?
set -e
[ "$unknown_status" -eq 2 ]
echo "install: ok"
