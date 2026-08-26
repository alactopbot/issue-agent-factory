#!/usr/bin/env bash
# Set exactly one Factory workflow-state label on an Issue.

set -euo pipefail

ISSUE="${1:-}"
REQUESTED_STATE="${2:-}"

if ! [[ "$ISSUE" =~ ^[1-9][0-9]*$ ]] || [ -z "$REQUESTED_STATE" ]; then
  echo "usage: $0 <issue-number> <spec|awaiting-spec-review|implementing|verifying|awaiting-merge|needs-info>" >&2
  exit 2
fi

case "$REQUESTED_STATE" in
  factory:*) TARGET_STATE="$REQUESTED_STATE" ;;
  *) TARGET_STATE="factory:$REQUESTED_STATE" ;;
esac

is_target_state() {
  case "$1" in
    factory:spec|factory:awaiting-spec-review|factory:implementing|factory:verifying|factory:awaiting-merge|factory:needs-info) return 0 ;;
    *) return 1 ;;
  esac
}

is_factory_state() {
  if is_target_state "$1"; then return 0; fi
  case "$1" in
    factory:ready-to-spec|factory:wait-to-implement|factory:ready-to-implement|factory:in-progress|factory:awaiting-review) return 0 ;;
    *) return 1 ;;
  esac
}

if ! is_target_state "$TARGET_STATE"; then
  echo "FACTORY_STATE: issue=$ISSUE status=MISCONFIGURED reason=invalid-state state=$TARGET_STATE" >&2
  exit 2
fi

command -v gh >/dev/null 2>&1 || {
  echo "FACTORY_STATE: issue=$ISSUE status=MISCONFIGURED reason=gh-unavailable state=$TARGET_STATE" >&2
  exit 2
}
gh auth status >/dev/null 2>&1 || {
  echo "FACTORY_STATE: issue=$ISSUE status=MISCONFIGURED reason=gh-not-authenticated state=$TARGET_STATE" >&2
  exit 2
}

if ! current_labels="$(gh issue view "$ISSUE" --json labels --jq '.labels[].name')"; then
  echo "FACTORY_STATE: issue=$ISSUE status=ERROR reason=issue-read-failed state=$TARGET_STATE" >&2
  exit 1
fi

preserved_labels=()
previous_states=()
while IFS= read -r label; do
  [ -n "$label" ] || continue
  if is_factory_state "$label"; then
    previous_states+=("$label")
  else
    preserved_labels+=("$label")
  fi
done <<< "$current_labels"

if [ "${#previous_states[@]}" -eq 1 ] && [ "${previous_states[0]}" = "$TARGET_STATE" ]; then
  echo "FACTORY_STATE: issue=$ISSUE status=UNCHANGED previous=$TARGET_STATE state=$TARGET_STATE"
  exit 0
fi

previous="none"
if [ "${#previous_states[@]}" -gt 0 ]; then
  previous="$(IFS=,; printf '%s' "${previous_states[*]}")"
fi

api_args=(--method PATCH "repos/{owner}/{repo}/issues/$ISSUE")
for label in "${preserved_labels[@]}" "$TARGET_STATE"; do
  api_args+=(-f "labels[]=$label")
done

if ! gh api "${api_args[@]}" >/dev/null; then
  echo "FACTORY_STATE: issue=$ISSUE status=ERROR reason=issue-update-failed previous=$previous state=$TARGET_STATE" >&2
  exit 1
fi

echo "FACTORY_STATE: issue=$ISSUE status=UPDATED previous=$previous state=$TARGET_STATE"
