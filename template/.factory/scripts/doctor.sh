#!/usr/bin/env bash
# 检查 Codex-only Factory 是否完成安全初始化。

set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 2
failures=0
warnings=0
pass() { printf 'PASS  %s\n' "$1"; }
warn() { printf 'WARN  %s\n' "$1"; warnings=$((warnings + 1)); }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }

required_files=(
  AGENTS.md
  docs/factory/CONTRACT.md
  docs/factory/CHARTER.md
  docs/factory/GITHUB.md
  docs/requirements/README.md
  .factory/project.json
  .factory/project.schema.json
  .factory/pattern.schema.json
  .factory/requirement.schema.json
  .factory/gates.conf
  .factory/scripts/gates.sh
  .factory/scripts/prove-test.sh
  .factory/scripts/validate-pr-gates.mjs
  .factory/hooks/block-merge.sh
  .codex/hooks.json
  .github/workflows/factory-gates.yml
)
for path in "${required_files[@]}"; do
  [ -f "$path" ] && pass "$path exists" || fail "$path is missing"
done

for path in .factory/scripts/*.sh .factory/hooks/*.sh; do
  [ -e "$path" ] || continue
  [ -x "$path" ] && pass "$path is executable" || fail "$path is not executable"
done

if [ -d .claude ] || [ -f CLAUDE.md ]; then
  fail "Claude-specific files are present; this Factory distribution is Codex-only"
else
  pass "no Claude compatibility layer"
fi

if grep -q '<PROJECT_NAME>\|<PROJECT_TIER>\|<WORKFLOW_LANGUAGE>\|<PRODUCT_LANGUAGE>' .factory/project.json 2>/dev/null; then
  fail ".factory/project.json still contains setup placeholders"
else
  pass ".factory/project.json placeholders replaced"
fi

if grep -q 'docs/factory/CONTRACT.md' AGENTS.md 2>/dev/null; then
  pass "AGENTS.md includes Factory entrypoint"
else
  fail "AGENTS.md does not include the Factory entrypoint; merge the installed instructions into the existing file"
fi

if grep -q '<PROJECT_NAME>\|<INSTALL_COMMAND>\|<TEST_COMMAND>\|<BUILD_COMMAND>\|<RUN_COMMAND>' AGENTS.md 2>/dev/null; then
  fail "AGENTS.md still contains setup placeholders"
else
  pass "AGENTS.md placeholders replaced"
fi

grep -q '^CHARTER_STATUS: ready$' docs/factory/CHARTER.md 2>/dev/null \
  && pass "charter is marked ready" || fail "charter is not marked ready"
grep -Eq '^TIER: (revival|greenfield|oss|client-production)$' docs/factory/CHARTER.md 2>/dev/null \
  && pass "charter tier is valid" || fail "charter tier is missing or invalid"

if find docs/factory -type f \( -name 'QUEUE.md' -o -name 'STATE.md' \) | grep -q . || [ -d docs/factory/runs ]; then
  fail "legacy Git-backed live state files are present"
else
  pass "GitHub is the only live state store"
fi

if git rev-parse --git-dir >/dev/null 2>&1; then
  pass "Git repository detected"
  git remote get-url origin >/dev/null 2>&1 && pass "origin remote detected" || warn "no origin remote"
else
  fail "not a Git repository"
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  pass "GitHub CLI authenticated"
  missing_labels=0
  for label in factory:ready-to-spec factory:plan-review factory:wait-to-implement factory:ready-to-implement factory:needs-info factory:in-progress factory:awaiting-review factory:verified factory:rejected; do
    gh label view "$label" >/dev/null 2>&1 || missing_labels=$((missing_labels + 1))
  done
  [ "$missing_labels" -eq 0 ] && pass "Factory labels exist" \
    || warn "$missing_labels Factory labels missing; run bootstrap-github.sh --apply"
else
  warn "gh unavailable or unauthenticated; GitHub checks skipped"
fi

warn "review and trust project hooks with /hooks after installation or hook changes"
warn "verify GitHub ruleset and required Factory Gates check manually; see docs/factory/GITHUB.md"
printf '\nFACTORY_DOCTOR: failures=%d warnings=%d\n' "$failures" "$warnings"
[ "$failures" -eq 0 ]
