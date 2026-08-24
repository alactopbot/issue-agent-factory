---
name: factory-implement
description: Recover or atomically claim one executable GitHub Issue, implement the complete product outcome, run fail-closed gates, obtain independent verification, and deliver one verified pull request. Use after an ordinary Spec is Ready or when an explicitly enabled Pattern is selected.
---

# Factory implementation

Implement exactly one complete requirement per run. Finishing an internal step does not justify another Issue, branch,
pull request, or approval gate.

## Establish authority

Read the contract, charter, project policy, complete Issue discussion, trusted handoff, current labels, linked pull
requests, Checks, and either the approved `design.md` or the explicitly selected Pattern.

- Ordinary path: require a trusted Ready transition and no later Spec or governance drift.
- Pattern path: require one activation label, an enabled matching Pattern on the default branch, complete semantic match,
  and no expected governance-file changes.

Recover an existing deterministic branch or unique pull request. If neither exists, claim before writing:

```bash
./.factory/scripts/claim.sh <issue-number> <unique-run-id> "<exact Issue title>"
```

Only `CLAIMED` may create new work. `EXISTS` or `LOST` means another run owns the same Issue; recover its branch/PR or
stop. After a successful claim, set the Issue to `factory:in-progress`.

## Implement the outcome

Re-read `done_when` as the stopping condition. Establish a test or equivalent artifact that fails on the old behavior,
then make the smallest complete change that satisfies the approved outcome. Avoid unrelated cleanup and abstractions.

Stay within the ordinary Spec or Pattern authorization. A new dependency, changed existing-test semantics, new
load-bearing path, product decision, or scope expansion returns an ordinary requirement to the same Draft PR. A Pattern
that does not fit must stop and enter the ordinary Spec path; it cannot authorize Factory governance changes.

## Gates and evidence

Run the gate level selected by the Pattern, project defaults, and charter:

```bash
./.factory/scripts/gates.sh <fast|full|deep>
```

A required skip, red result, or `MISCONFIGURED` result blocks delivery. Record the completed result, material risk, exact
Gate verdict, and verification state in the requirement's `delivery.md`.

## Independent verification

Hand the Issue, authority source, base revision, current head, and complete diff to a fresh independent Agent context.
Do not provide the implementer's persuasive summary. The verifier follows `factory-verify` and reaches its own verdict.

Fix a rejection on the same branch, rerun Gates, and request verification again. Stop after two consecutive rejections.
Any commit after acceptance makes the verification stale.

## Complete the run

When the current full SHA has accepted verification, `factory:verified` is present, `factory:rejected` is absent, and
Factory Gates are green, set the Issue to `factory:awaiting-review`. The pull request explains the result, risk, tests,
and evidence. Stop without merging or publishing; merge is the human product-acceptance decision.
