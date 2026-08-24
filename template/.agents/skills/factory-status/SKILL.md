---
name: factory-status
description: Produce a read-only Factory control-room report from live GitHub Issues, deterministic branches, pull requests, review transitions, Patterns, and Checks. Use for status, next-work, queue, bottleneck, or stuck-Issue questions; never mutate workflow state.
---

# Factory status

Use GitHub live state as the source of truth. Do not modify labels, comments, branches, pull requests, Patterns, or files.

Report in the repository and Issues' established language, in this order:

1. Draft Specs awaiting human feedback or Ready;
2. verified pull requests awaiting human merge;
3. explicitly authorized Pattern work in progress;
4. ordinary implementation work in progress;
5. stale or inconsistent claim branches;
6. counts by Factory state, default-branch Gate health, and the highest-value next action.

Include links and the evidence behind each stalled classification. When data is missing, say that the state cannot be
determined; absence of a verification comment, configured project Check, or recent commit is not evidence of success.
