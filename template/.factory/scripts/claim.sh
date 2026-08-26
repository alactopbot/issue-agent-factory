#!/usr/bin/env bash
# Atomically claim one Issue with a stable deterministic remote branch.
# The first non-forced push wins; a competing push from the same base diverges
# and is rejected by Git. Labels remain visible state, not the lock.

set -euo pipefail

ISSUE="${1:-}"
RUN_ID="${2:-}"
BASE_REF="${3:-}"

if ! [[ "$ISSUE" =~ ^[1-9][0-9]*$ ]] || [ -z "$RUN_ID" ]; then
  echo "usage: $0 <issue-number> <run-id> [base-ref]" >&2
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "FACTORY_CLAIM: status=MISCONFIGURED reason=not-a-git-repository" >&2
  exit 2
}
cd "$ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "FACTORY_CLAIM: status=MISCONFIGURED reason=working-tree-not-clean" >&2
  exit 2
fi

git remote get-url origin >/dev/null 2>&1 || {
  echo "FACTORY_CLAIM: status=MISCONFIGURED reason=missing-origin" >&2
  exit 2
}

git fetch --quiet origin
BRANCH="issue/$ISSUE"
if git rev-parse --verify "refs/remotes/origin/$BRANCH^{commit}" >/dev/null 2>&1; then
  echo "FACTORY_CLAIM: status=EXISTS branch=$BRANCH"
  exit 3
fi

if [ -z "$BASE_REF" ]; then
  BASE_REF="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
fi
if [ -z "$BASE_REF" ]; then
  for candidate in origin/main origin/master; do
    if git rev-parse --verify "$candidate^{commit}" >/dev/null 2>&1; then
      BASE_REF="$candidate"
      break
    fi
  done
fi
git rev-parse --verify "$BASE_REF^{commit}" >/dev/null 2>&1 || {
  echo "FACTORY_CLAIM: status=MISCONFIGURED reason=missing-default-branch" >&2
  exit 2
}

git switch --quiet -c "$BRANCH" "$BASE_REF"
git commit --quiet --allow-empty -m "factory: claim issue #$ISSUE ($RUN_ID)"

set +e
git push --quiet origin "HEAD:refs/heads/$BRANCH"
push_status=$?
set -e
if [ "$push_status" -ne 0 ]; then
  echo "FACTORY_CLAIM: status=LOST branch=$BRANCH reason=push-rejected"
  exit 3
fi

echo "FACTORY_CLAIM: status=CLAIMED branch=$BRANCH"
