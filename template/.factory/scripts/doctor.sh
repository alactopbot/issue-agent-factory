#!/usr/bin/env bash
# Check only the prerequisites required to run the Factory.

set -uo pipefail

failures=0
pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }

if git rev-parse --git-dir >/dev/null 2>&1; then
  pass "Git repository"
  git remote get-url origin >/dev/null 2>&1 && pass "origin remote" || fail "origin remote is missing"
else
  fail "not a Git repository"
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  pass "GitHub CLI authenticated"
else
  fail "GitHub CLI is missing or not authenticated"
fi

command -v node >/dev/null 2>&1 && pass "Node.js available" || fail "Node.js is required by PR validation"

if [ -f .factory/gates.conf ] && ! grep -q 'VERIFY_COMMAND="<VERIFY_COMMAND>"' .factory/gates.conf; then
  pass "verification command configured"
else
  fail "configure VERIFY_COMMAND in .factory/gates.conf"
fi

printf '\nFACTORY_DOCTOR: failures=%d\n' "$failures"
[ "$failures" -eq 0 ]
