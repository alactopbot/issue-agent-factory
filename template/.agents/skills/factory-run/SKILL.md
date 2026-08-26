---
name: factory-run
description: Advance GitHub Issues through the Factory workflow: atomically claim, write and review one Spec, implement the approved result, verify the current head, and hand the PR to a human for merge.
---

# Factory run

Use GitHub as live state and advance available Issues as far as their current authorization allows. Read `AGENTS.md`,
`docs/factory/CONTRACT.md`, the Issue, and its linked pull request. One requirement uses one Issue,
`issue/<issue-number>`, one Spec, and one pull request.

## Route by state

Change the mutually exclusive Issue state with:

```bash
./.factory/scripts/set-issue-state.sh <issue-number> <state>
```

- no state and no deterministic branch: atomically claim the Issue;
- `factory:spec`: write or revise the Spec;
- `factory:awaiting-spec-review`: apply review feedback, or wait while the PR remains Draft;
- trusted Draft-to-Ready transition: set `factory:implementing` and implement the Spec;
- `factory:implementing`: finish the implementation, then set `factory:verifying`;
- `factory:verifying`: use `factory-verify` on the current head;
- `factory:awaiting-merge`: wait for human merge; a changed head returns to `factory:verifying`;
- `factory:needs-info`: wait for the missing decision, then recover the stage from the branch and PR.

Labels route work but do not authorize it. Draft blocks implementation, trusted Ready authorizes implementation, and a
current-SHA accepted verification authorizes `awaiting-merge`.

## Claim and Spec

Before the first repository write run:

```bash
./.factory/scripts/claim.sh <issue-number> <unique-run-id>
```

Continue on `CLAIMED`. On `EXISTS` or `LOST`, recover the existing branch and PR or leave it for the winning run. After a
claim, set `factory:spec`.

Write `docs/requirements/<issue-number>.md` with the intended result, technical approach, affected scope, and acceptance
checks. Add other detail only when it helps review. Create the single linked Draft PR with `Closes #<issue-number>`, set
`factory:awaiting-spec-review`, and wait for review. Revise the same Spec and PR when feedback arrives. The Agent does not
click Ready.

## Implement and verify

After trusted Ready, set `factory:implementing` and implement the approved result on the same branch and PR. If the result
or scope changes materially, return the same PR to Draft and revise the Spec.

When implementation is complete, push the current head and set `factory:verifying`. Use `factory-verify` to run the
configured verification command and check the implementation against the Spec. A rejection returns to
`factory:implementing`; acceptance moves to `factory:awaiting-merge`. Any later commit requires verification again.

Use `factory:needs-info` only when a missing human decision changes the intended result or scope. Record the question on
the Issue. Recoverable tool, test, and Git failures remain in the current stage. Never merge the PR.
