---
name: factory-monitor
description: Recover and inspect the live Factory workflow across GitHub Issues, deterministic branches, pull requests, review transitions, Patterns, Checks, and verification evidence. Use for scheduled health sweeps or stalled work; do not implement product changes or alter Pattern authority.
---

# Factory monitor

Monitoring makes an interrupted run recoverable without treating chat history or repository journals as state.

## Inspect live state

Read open Factory-labelled Issues, trusted handoffs, deterministic `issue/<number>` branches, unique linked
pull requests, Draft/Ready transitions, review comments, Checks, verification markers, ordinary Specs, and selected
Patterns.

Report or route these conditions:

- Draft plan with new feedback → `factory-spec`;
- trusted Ready with no later drift → `factory-implement`;
- valid explicit Pattern waiting to run → `factory-implement` without fabricating a Ready event;
- `in-progress` with no branch or pull request → inconsistent state;
- claim branch without a pull request or recent activity → possible stale claim requiring human recovery;
- `awaiting-review` without current-SHA green Gate evidence, green PR state validation, or configured project CI →
  incomplete delivery;
- waiting work beyond the charter's back-pressure threshold → human bottleneck.

Repair only unambiguous state-label drift that does not change product or authorization decisions. Never delete or take
over a claim branch, create or widen a Pattern, implement a finding, merge, or publish. When authority is unclear, leave a
specific recoverable finding and stop.

A trusted Ready transition makes replacing `factory:wait-to-implement` with `factory:ready-to-implement` on the Issue an
unambiguous repair. Do not perform it without a current, trusted Ready transition. For this or any other unambiguous state
repair, run `./.factory/scripts/set-issue-state.sh <issue-number> <state>`; never add or remove Factory state labels directly.
