---
name: factory-verify
description: Independently verify one Factory pull request against its Issue, approved Spec or explicit Pattern, complete diff, tests, and fail-closed Gates. Use from a fresh context after implementation or when rechecking a changed head; publish a verdict bound to the exact commit.
---

# Factory verification

Verification protects the reviewer from implementation bias. Work from repository and GitHub evidence, not the
implementer's explanation, and reject when the available evidence cannot support acceptance.

## Inputs

Read `AGENTS.md`, the contract, charter, complete Issue and trusted handoff, unique linked pull request, default-branch
base, full diff, Checks, and the applicable authority:

- ordinary path: approved `design.md` plus trusted Ready history;
- Pattern path: the enabled Pattern selected by the Issue's unique activation label.

Confirm the head SHA before running checks.

## Verification procedure

1. Decide whether `done_when` is literally true as a complete user outcome.
2. Confirm the authority is current: for ordinary work, the trusted Ready event authorizes continuation and the complete
   current Spec remains within the approved product outcome and scope; for Pattern work, require no mismatch or expansion.
3. For Pattern work, check every changed path against `allowedPaths`, prove every `preserved` invariant, and reject any
   Factory governance change.
4. Confirm behavior evidence fails without the implementation and passes with it. Use
   `./.factory/scripts/prove-test.sh` when applicable from a clean committed checkout.
5. Select and run the required Gate independently: an explicit Pattern uses its exact configured level; Factory
   governance changes use `deep`; a change containing only `docs/**` and `README.md` files may use `fast`; every other
   ordinary requirement uses at least the charter default. Record the level actually run. Missing, skipped, red, or
   misconfigured required checks reject the PR.
6. Check that the pull request states the product result, material risk, evidence, and remaining human merge decision.

## Verdict

List blocking findings with reproduction evidence before the summary. Before publishing a new verdict, remove any existing
`factory:verified` label so stale acceptance cannot survive a new head or verdict. On rejection, add `factory:rejected`.
On acceptance, first publish exactly one trusted comment bound to the current full SHA and the Gate result actually run:

```text
<!-- factory-verification -->
requirement: REQ-<three-digit Issue number>
decision: accepted
verified_sha: <current full commit SHA>
gate_level: <level actually run: fast | full | deep>
gate_status: GREEN
```

Then remove `factory:rejected`, add `factory:verified`, and run
`node .factory/scripts/validate-pr-state.mjs --pr <pull-request-number>`. A non-green or misconfigured state result
prevents completion until its evidence is resolved. Only a real authorization, implementation, Gate, scope, or stale-SHA
risk is an independent rejection. Missing optional platform capabilities or validator metadata incompatibility is a
recoverable workflow diagnostic: report it without consuming an implementation-rejection attempt. Do not merge, approve
the product, or convert a Draft plan to Ready.
