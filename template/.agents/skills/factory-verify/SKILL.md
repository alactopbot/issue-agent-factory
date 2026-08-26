---
name: factory-verify
description: Verify the current head of one Ready Factory pull request against its approved Spec and configured project command, then route it back to implementation or forward to human merge.
---

# Factory verification

Read the Issue, `docs/requirements/<issue-number>.md`, the linked Ready pull request, its diff, and current full head SHA.
Check that the intended result and acceptance checks in the Spec are satisfied, then run:

```bash
./.factory/scripts/gates.sh
```

Publish a PR comment for the current head:

```text
<!-- factory-verification -->
decision: <accepted | rejected>
verified_sha: <current full commit SHA>
gate_status: <GREEN | RED | MISCONFIGURED>
```

On rejection, set `factory:implementing`. On acceptance, require `gate_status: GREEN`, run
`node .factory/scripts/validate-pr-state.mjs --pr <pull-request-number>`, and set `factory:awaiting-merge` only when it is
green. A later commit makes the verdict stale and returns to `factory:verifying`. Do not merge the PR.
