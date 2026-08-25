---
name: factory-spec
description: Turn one ordinary GitHub Issue into a single human-readable Spec and iterate it through the same Draft pull request. Use when no explicit Pattern authorizes direct execution, when plan feedback arrives, or when an approved plan changes; do not create duplicate machine-readable requirement manifests.
---

# Factory specification

The Spec stage resolves product and technical uncertainty before implementation makes it expensive. It handles one
complete requirement and uses one Draft pull request as the review surface.

## Preconditions and recovery

Read `AGENTS.md`, the contract, charter, complete Issue, latest trusted handoff, current labels, deterministic branch,
linked pull requests, review timeline, and comments.

- If the deterministic branch or the unique linked pull request exists, recover it.
- Otherwise, before the first repository write, run:

  ```bash
  ./.factory/scripts/claim.sh <issue-number> <unique-run-id>
  ```

  Continue only on `CLAIMED`. On `EXISTS` or `LOST`, recover the winner or stop. Do not invent another branch name.
- If a valid explicit Pattern covers the Issue, return it to triage or implementation; do not create a redundant Spec.

## Write one Spec

Create `docs/requirements/REQ-<number>-<slug>/design.md`. Make it executable without relying on chat history. Cover:

- goal, non-goals, and user-visible behavior;
- technical approach, data or assets, affected areas, and preserved invariants;
- internal implementation order;
- tests, acceptance criteria, risks, and rollback considerations.

For an ordinary requirement, `design.md` is the complete plan authority used by review and implementation.

## Review lifecycle

Push the claimed branch and create the single linked Draft pull request with `Closes #<issue>`. Set the Issue to
`factory:wait-to-implement` by running
`./.factory/scripts/set-issue-state.sh <issue-number> wait-to-implement`, then stop. Never add or remove Factory state labels
directly. The Draft state is the plan-review state; do not duplicate it with a PR label.

- Feedback: keep the pull request Draft and revise the same `design.md` from ordinary review comments.
- Approval: only a trusted human selecting **Ready for review** authorizes implementation.
- Revocation: **Convert to draft**, a changed authorized product outcome, or expanded scope requires a new review cycle.
  Editing the current Spec without changing that authorization does not revoke a trusted Ready event; the complete current
  Spec is checked by Gates and independent verification.

Humans do not need to provide keywords, hashes, or structured approval comments. This skill never clicks Ready on their
behalf and never begins product implementation.
