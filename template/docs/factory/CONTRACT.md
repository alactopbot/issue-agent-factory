# Factory execution contract

The Factory guarantees one recoverable Spec-driven path:

```text
Issue
  -> scheduler scan
  -> atomic issue/<number> branch
  -> Spec
  -> Draft PR waiting for human review
  -> trusted Ready for review
  -> implementation
  -> verification
  -> PR waiting for human merge
  -> merged and Issue closed
```

GitHub is the live state. One requirement uses one Issue, one deterministic branch, one Spec, and one pull request. The
Draft Spec PR becomes the implementation PR.

One-time setup: configure `.factory/gates.conf`, run `./.factory/scripts/bootstrap-github.sh --apply`, and protect the
default branch so pull requests are merged by humans. Factory does not install GitHub Actions or local merge hooks.

## States

An open Factory Issue has exactly one of these mutually exclusive labels after it is claimed:

- `factory:spec`: writing or revising the Spec;
- `factory:awaiting-spec-review`: the Draft PR is waiting for human review;
- `factory:implementing`: implementing the approved Spec;
- `factory:verifying`: verifying the current PR head;
- `factory:awaiting-merge`: the current head is verified and waiting for human merge;
- `factory:needs-info`: a human decision that can change the result is missing.

Use `./.factory/scripts/set-issue-state.sh <issue-number> <state>` for every transition. Labels route work; the branch,
PR Draft/Ready history, current SHA, verification comment, and merge state are the authority. If a label conflicts with
those facts, repair the label and obey the facts.

## Claim and Spec

Before the first repository write run:

```bash
./.factory/scripts/claim.sh <issue-number> <unique-run-id>
```

The first non-forced push of `issue/<issue-number>` wins. `EXISTS` or `LOST` means recover the existing branch and PR or
leave it for the winning run.

After `CLAIMED`, set `factory:spec`. Write `docs/requirements/<issue-number>.md` with the intended result, technical
approach, affected scope, and acceptance checks. Add other detail only when it helps review. Create the linked Draft PR
with `Closes #<issue-number>`, set `factory:awaiting-spec-review`, and wait for review.

Ordinary review comments revise the same Spec and PR. Agents never click Ready. A trusted human selecting
**Ready for review** authorizes implementation; converting the PR back to Draft revokes that authorization.

## Implementation and verification

After trusted Ready, set `factory:implementing` and implement the complete approved Spec on the same branch and PR. A
changed product result or expanded scope returns the same PR to Draft and the Issue to `factory:spec`.

When implementation is complete, set `factory:verifying` and run the one configured repository command:

```bash
./.factory/scripts/gates.sh
```

The verifier checks the Issue, approved Spec, diff, current full head SHA, and command result. Its PR comment is:

```text
<!-- factory-verification -->
decision: <accepted | rejected>
verified_sha: <current full commit SHA>
gate_status: <GREEN | RED | MISCONFIGURED>
```

A current-head rejection returns to `factory:implementing`. An accepted current head with `gate_status: GREEN` and a
green `validate-pr-state.mjs` result moves to `factory:awaiting-merge`. Any later commit makes the verdict stale and moves
the Issue back to `factory:verifying`.

Only a missing decision that can change the approved result or scope uses `factory:needs-info`. Tool failures, test
failures, stale verification, and ordinary Git conflicts remain in their current executable stage.

The final merge is human product acceptance. Agents do not merge.
