#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-claim.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT

git init -q --bare "$fixture/remote.git"
git clone -q "$fixture/remote.git" "$fixture/seed" 2>/dev/null
git -C "$fixture/seed" config user.email factory-test@example.com
git -C "$fixture/seed" config user.name "Factory Test"
printf 'base\n' > "$fixture/seed/README.md"
git -C "$fixture/seed" add README.md
git -C "$fixture/seed" commit -qm base
git -C "$fixture/seed" push -q origin HEAD:main
git -C "$fixture/remote.git" symbolic-ref HEAD refs/heads/main

for runner in runner-a runner-b; do
  git clone -q "$fixture/remote.git" "$fixture/$runner"
  git -C "$fixture/$runner" config user.email factory-test@example.com
  git -C "$fixture/$runner" config user.name "Factory Test"
done

set +e
(cd "$fixture/runner-a" && "$ROOT/template/.factory/scripts/claim.sh" 142 runner-a "Add CSV export") \
  > "$fixture/runner-a.out" 2>&1 &
runner_a_pid=$!
(cd "$fixture/runner-b" && "$ROOT/template/.factory/scripts/claim.sh" 142 runner-b "Add CSV export") \
  > "$fixture/runner-b.out" 2>&1 &
runner_b_pid=$!
wait "$runner_a_pid"; runner_a_status=$?
wait "$runner_b_pid"; runner_b_status=$?
set -e

[ $((runner_a_status + runner_b_status)) -eq 3 ]
[ "$(grep -h -c 'status=CLAIMED branch=issue/142-add-csv-export' "$fixture/runner-a.out" "$fixture/runner-b.out" | awk '{ total += $1 } END { print total }')" -eq 1 ]
[ "$(grep -h -E -c 'status=(EXISTS|LOST) branch=issue/142-add-csv-export' "$fixture/runner-a.out" "$fixture/runner-b.out" | awk '{ total += $1 } END { print total }')" -eq 1 ]

unicode_branch="$(cd "$fixture/runner-a" && git switch -q main && "$ROOT/template/.factory/scripts/claim.sh" 143 runner-a "修复 登录/超时")"
printf '%s' "$unicode_branch" | grep -q 'status=CLAIMED branch=issue/143-修复-登录-超时'

set +e
renamed_issue="$(cd "$fixture/runner-b" && "$ROOT/template/.factory/scripts/claim.sh" 143 runner-b "更新后的标题" 2>&1)"
renamed_status=$?
set -e
[ "$renamed_status" -eq 3 ]
printf '%s' "$renamed_issue" | grep -q 'status=EXISTS branch=issue/143-修复-登录-超时'

echo "claim: ok"
