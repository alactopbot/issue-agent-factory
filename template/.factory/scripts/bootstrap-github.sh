#!/usr/bin/env bash
# Preview or create the six Factory Issue state labels.

set -euo pipefail

APPLY=0
case "${1:-}" in
  "") ;;
  --apply) APPLY=1 ;;
  *) echo "usage: $0 [--apply]" >&2; exit 2 ;;
esac

command -v gh >/dev/null 2>&1 || { echo "error: gh is required" >&2; exit 2; }
gh auth status >/dev/null 2>&1 || { echo "error: gh is not authenticated" >&2; exit 2; }

labels=(
  "factory:spec|FBCA04|Writing or revising the Issue Spec"
  "factory:awaiting-spec-review|C5DEF5|Draft Spec PR waiting for human review"
  "factory:implementing|1D76DB|Implementing the approved Spec"
  "factory:verifying|0E8A16|Verifying the current PR head"
  "factory:awaiting-merge|5319E7|Verified PR waiting for human merge"
  "factory:needs-info|D93F0B|Blocked on a human decision that changes the result"
)

obsolete_labels=(
  "factory:ready-to-spec"
  "factory:wait-to-implement"
  "factory:ready-to-implement"
  "factory:in-progress"
  "factory:awaiting-review"
  "factory:verified"
  "factory:rejected"
  "factory:monitor"
)

existing_labels="$(gh label list --limit 1000 --json name --jq '.[].name')"
while IFS= read -r label; do
  case "$label" in factory:pattern:*) obsolete_labels+=("$label") ;; esac
done <<< "$existing_labels"

if [ "$APPLY" -eq 0 ]; then
  echo "Would create or update these labels:"
  printf '  %s\n' "${labels[@]%%|*}"
  echo
  echo "Would delete obsolete labels if present:"
  printf '  %s\n' "${obsolete_labels[@]}"
  echo
  echo "Re-run with --apply to write them."
  exit 0
fi

for entry in "${labels[@]}"; do
  IFS='|' read -r name color description <<< "$entry"
  gh label create "$name" --color "$color" --description "$description" --force
done

for name in "${obsolete_labels[@]}"; do
  if printf '%s\n' "$existing_labels" | grep -Fxq "$name"; then
    gh label delete "$name" --yes
  fi
done

echo "Factory labels are ready."
