#!/usr/bin/env bash
# 检查 Factory 是否完成安全初始化。

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
  .factory/pattern.schema.json
  .factory/gates.conf
  .factory/scripts/claim.sh
  .factory/scripts/gates.sh
  .factory/scripts/prove-test.sh
  .factory/scripts/set-issue-state.sh
  .factory/scripts/validate-pr-state.mjs
  .factory/hooks/block-merge.sh
  .codex/hooks.json
)
for path in "${required_files[@]}"; do
  [ -f "$path" ] && pass "$path exists" || fail "$path is missing"
done

command -v node >/dev/null 2>&1 \
  && pass "Node.js available for Pattern and PR state validation" \
  || fail "Node.js is required for Pattern and PR state validation"

for path in .factory/scripts/*.sh .factory/hooks/*.sh; do
  [ -e "$path" ] || continue
  [ -x "$path" ] && pass "$path is executable" || fail "$path is not executable"
done

pattern_failures=0
for path in .factory/patterns/*.json; do
  [ -e "$path" ] || continue
  node -e '
const fs = require("fs");
const path = process.argv[1];
const value = JSON.parse(fs.readFileSync(path, "utf8"));
const filename = path.split("/").pop().replace(/\.json$/, "");
const levels = new Set(["fast", "full", "deep"]);
const exactKeys = (object, allowed) => object && typeof object === "object" && !Array.isArray(object) &&
  Object.keys(object).every((key) => allowed.includes(key));
const unique = (items) => new Set(items).size === items.length;
const valid = exactKeys(value, ["$schema", "id", "version", "enabled", "activation", "scope", "execution"]) &&
  (value.$schema === undefined || value.$schema === "../pattern.schema.json") &&
  value.id === filename && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id) &&
  typeof value.enabled === "boolean" && Number.isInteger(value.version) && value.version > 0 &&
  exactKeys(value.activation, ["issueLabel"]) &&
  value.activation?.issueLabel === `factory:pattern:${value.id}` &&
  exactKeys(value.scope, ["allowedPaths", "preserved"]) &&
  Array.isArray(value.scope?.allowedPaths) && value.scope.allowedPaths.length > 0 &&
  unique(value.scope.allowedPaths) && value.scope.allowedPaths.every((item) => typeof item === "string" && item.length > 0) &&
  Array.isArray(value.scope?.preserved) && value.scope.preserved.length > 0 &&
  unique(value.scope.preserved) && value.scope.preserved.every((item) => typeof item === "string" && item.length > 0) &&
  exactKeys(value.execution, ["planReview", "gateLevel", "independentVerification", "completion"]) &&
  value.execution?.planReview === "none" && levels.has(value.execution?.gateLevel) &&
  value.execution?.independentVerification === "required" && value.execution?.completion === "verified-pr";
if (!valid) process.exit(1);
' "$path" >/dev/null 2>&1 || pattern_failures=$((pattern_failures + 1))
done
[ "$pattern_failures" -eq 0 ] && pass "Pattern configurations are valid" \
  || fail "$pattern_failures Pattern configuration(s) are invalid"

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
if node -e '
const fs = require("fs");
const value = fs.readFileSync("docs/factory/CHARTER.md", "utf8");
const matches = [...value.matchAll(/^\s*default:\s*(fast|full|deep)\s*$/gm)];
if (matches.length !== 1) process.exit(1);
' >/dev/null 2>&1; then
  pass "charter default Gate level is valid"
else
  fail "charter must define exactly one fast, full, or deep default Gate level"
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
  existing_labels="$(gh label list --limit 1000 --json name --jq '.[].name' 2>/dev/null || true)"
  for label in factory:ready-to-spec factory:wait-to-implement factory:ready-to-implement factory:needs-info factory:in-progress factory:awaiting-review factory:verified factory:rejected; do
    printf '%s\n' "$existing_labels" | grep -Fxq "$label" || missing_labels=$((missing_labels + 1))
  done
  [ "$missing_labels" -eq 0 ] && pass "Factory labels exist" \
    || warn "$missing_labels Factory labels missing; run bootstrap-github.sh --apply"
else
  warn "gh unavailable or unauthenticated; GitHub setup checks skipped"
fi

warn "review and trust project hooks with /hooks after installation or hook changes"
warn "verify the GitHub ruleset blocks direct and Agent-authored merges; see docs/factory/GITHUB.md"
printf '\nFACTORY_DOCTOR: failures=%d warnings=%d\n' "$failures" "$warnings"
[ "$failures" -eq 0 ]
