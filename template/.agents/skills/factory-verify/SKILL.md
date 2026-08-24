---
name: factory-verify
description: Independently verify one Factory pull request against its Issue, approved Spec or explicit Pattern, complete diff, tests, and fail-closed Gates. Use from a fresh context after implementation or when rechecking a changed head; publish a verdict bound to the exact commit.
---

# Factory verification

Verification protects the reviewer from implementation bias. Work from repository and GitHub evidence, not the
implementer's explanation, and reject when the available evidence cannot support acceptance.

## Inputs

Read the contract, charter, project policy, complete Issue and trusted handoff, unique linked pull request, default-branch
base, full diff, Checks, and the applicable authority:

- ordinary path: approved `design.md` plus trusted Ready history;
- Pattern path: the enabled Pattern selected by the Issue's unique activation label.

Confirm the head SHA before running checks.

## Verification procedure

1. Decide whether `done_when` is literally true as a complete user outcome.
2. Confirm the authority is current: no Spec/governance drift after Ready, or no Pattern mismatch/expansion.
3. For Pattern work, check every changed path against `allowedPaths`, prove every `preserved` invariant, and reject any
   Factory governance change.
4. Confirm behavior evidence fails without the implementation and passes with it. Use
   `./.factory/scripts/prove-test.sh` when applicable from a clean committed checkout.
5. Run the required Gate level independently. Missing, skipped, red, or misconfigured required checks reject the PR.
6. Check that the pull request states the product result, material risk, evidence, and remaining human merge decision.

## Verdict

List blocking findings with reproduction evidence before the summary. On rejection, add `factory:rejected` and remove any
stale verified label. On acceptance, publish exactly one trusted comment bound to the current full SHA:

```text
<!-- factory-verification -->
requirement: REQ-<three-digit Issue number>
decision: accepted
verified_sha: <current full commit SHA>
```

Add `factory:verified` and remove `factory:rejected`. Do not merge, approve the product, or convert a Draft plan to Ready.
