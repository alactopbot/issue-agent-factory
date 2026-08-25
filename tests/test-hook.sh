#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hook="$ROOT/template/.factory/hooks/block-merge.sh"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/issue-agent-factory-hook.XXXXXX")"
trap 'rm -rf "$fixture"' EXIT
git -C "$fixture" init -q

hook_status() {
  local branch="$1" command="$2"
  git -C "$fixture" symbolic-ref HEAD "refs/heads/$branch"
  (cd "$fixture" && printf '{"tool_input":{"command":"%s"}}\n' "$command" | bash "$hook" >/dev/null 2>&1)
}
blocked() {
  local command="$1" branch="${2:-issue/29}" status
  set +e; hook_status "$branch" "$command"; status=$?; set -e
  [ "$status" -eq 2 ] || { echo "expected block on $branch: $command" >&2; exit 1; }
}
allowed() {
  local command="$1" branch="${2:-issue/29}" status
  set +e; hook_status "$branch" "$command"; status=$?; set -e
  [ "$status" -eq 0 ] || { echo "expected allow on $branch: $command" >&2; exit 1; }
}

allowed 'git status'
allowed 'git merge origin/main'
allowed 'git merge origin/master'
blocked 'git merge issue/29' main
blocked 'git merge issue/29' master
blocked 'git merge issue/29' develop
blocked 'git merge issue/29' production
allowed 'git merge --abort' main
allowed 'git merge --quit' main
blocked 'gh pr merge 42 --squash'
blocked "bash -lc 'gh pr merge 42 --squash'"
blocked "gh api repos/example/project/pulls/42/merge --method PUT"
blocked "gh api graphql -f 'query=mutation { mergePullRequest(input: {}) { clientMutationId } }'"
blocked "curl -X PUT https://api.github.com/repos/example/project/pulls/42/merge"
blocked 'git push origin main'
blocked 'git push origin HEAD:main'
blocked 'git push origin +refs/heads/main'
blocked 'git push origin +issue/3-add-export'
blocked 'git push --force origin issue/29'
blocked 'git push -f origin issue/29'
blocked 'git push --force-with-lease origin issue/29'
blocked 'env GIT_TRACE=1 git push --force origin issue/29'
allowed 'git push origin HEAD:refs/heads/issue/3-add-export'
allowed 'git push origin --delete issue/3-add-export'
allowed "gh issue create --title hook --body 'The fix allows git merge origin/main on issue branches'"
allowed "gh pr create --title hook --body 'Do not run gh pr merge or call /pulls/42/merge'"
allowed "gh issue comment 29 --body 'The blocked command was git push --force origin main'"
allowed "printf 'gh pr merge 42 and mergePullRequest'"
blocked "gh issue create --title hook --body 'quoted git merge origin/main' && gh pr merge 42"
allowed 'printf x > docs/requirements/example.tmp'
allowed './.factory/scripts/gates.sh full > /tmp/factory-gates.log'
echo "hook: ok"
