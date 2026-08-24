---
name: factory-tune
description: Review real Factory delivery evidence and propose clearer Patterns, Gates, or charter boundaries without changing authority. Use for periodic workflow improvement after repeated Issues, review corrections, verification failures, or escaped defects.
---

# Factory tuning

Tuning converts repeated evidence into a proposal for human review. It does not change workflow authority directly.

Analyze linked Issues, pull requests, review decisions, Gate results, verification findings, and escaped defects. Look for:

- a repeated complete requirement whose activation signal, allowed paths, preserved invariants, and verification method
  can be stated precisely;
- recurring review corrections that reveal a missing Spec question or charter boundary;
- recurring verification failures that belong in a deterministic Gate;
- Gate skips or false confidence that should fail closed;
- waiting queues that reveal an avoidable human bottleneck.

For each proposal, cite the evidence and describe the configuration change, benefit, risk, and rollback. A Pattern proposal
must be a normal pull request that a user chooses to merge and later selects with an Issue label.

Pattern, charter, and Gate changes are outputs of a separate reviewable pull request. This skill produces the evidence and
recommendation for that decision; it does not apply or merge the change.
