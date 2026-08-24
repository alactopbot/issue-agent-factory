#!/usr/bin/env bash
# 预览或创建 Factory 使用的 GitHub 标签。

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
  "factory:ready-to-spec|FBCA04|Needs one unified product and technical spec"
  "factory:wait-to-implement|C5DEF5|Waiting for Draft PR feedback or Ready decision"
  "factory:ready-to-implement|0E8A16|Approved spec or explicitly enabled pattern; implementation may resume"
  "factory:needs-info|D93F0B|Blocked on one decision that changes the result"
  "factory:in-progress|1D76DB|The unique requirement PR is being implemented or verified"
  "factory:awaiting-review|5319E7|Verified delivery waiting for human merge"
  "factory:verified|0E8A16|Independent verifier accepted the current PR head"
  "factory:rejected|B60205|Independent verifier found a blocker"
  "factory:monitor|BFDADC|Factory monitor follow-up"
)

if [ "$APPLY" -eq 0 ]; then
  echo "Would create or update these labels:"
  printf '  %s\n' "${labels[@]%%|*}"
  echo
  echo "Re-run with --apply to write them."
  exit 0
fi

for entry in "${labels[@]}"; do
  IFS='|' read -r name color description <<< "$entry"
  gh label create "$name" --color "$color" --description "$description" --force
done

echo "Factory labels are ready."
