#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-install.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q
"$ROOT/install.sh" "$fixture" >/dev/null

for path in \
  AGENTS.md \
  .agents/skills/factory-run/SKILL.md \
  .agents/skills/factory-verify/SKILL.md \
  .factory/gates.conf \
  .factory/scripts/claim.sh \
  .factory/scripts/doctor.sh \
  .factory/scripts/gates.sh \
  .factory/scripts/set-issue-state.sh \
  .factory/scripts/validate-pr-state.mjs \
  docs/factory/CONTRACT.md; do
  [ -e "$fixture/$path" ] || { echo "missing installed file: $path" >&2; exit 1; }
done

for path in \
  .agents/skills/factory-triage \
  .agents/skills/factory-spec \
  .agents/skills/factory-implement \
  .agents/skills/factory-monitor \
  .agents/skills/factory-status \
  .agents/skills/factory-tune \
  .factory/pattern.schema.json \
  .factory/patterns \
  .factory/hooks \
  .codex \
  .factory/scripts/prove-test.sh \
  .factory/scripts/sync-default-branch.sh; do
  [ ! -e "$fixture/$path" ] || { echo "obsolete installed path: $path" >&2; exit 1; }
done

[ -x "$fixture/.factory/scripts/claim.sh" ]
[ -x "$fixture/.factory/scripts/doctor.sh" ]
[ -x "$fixture/.factory/scripts/gates.sh" ]
[ -x "$fixture/.factory/scripts/set-issue-state.sh" ]
[ -x "$fixture/.factory/scripts/validate-pr-state.mjs" ]
[ ! -e "$fixture/.github/workflows" ]

second_run="$("$ROOT/install.sh" "$fixture")"
printf '%s' "$second_run" | grep -q 'created: 0'

echo "install: ok"
