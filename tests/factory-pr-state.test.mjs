import assert from "node:assert/strict";
import test from "node:test";

import {
  paginate,
  selectGateLevel,
  validatePrState,
} from "../template/.factory/scripts/validate-pr-state.mjs";

const specSha = "1".repeat(40);
const headSha = "2".repeat(40);

function comment(body, overrides = {}) {
  return {
    body,
    authorAssociation: "COLLABORATOR",
    createdAt: "2026-08-24T00:00:00Z",
    url: "https://github.com/example/project/pull/8#issuecomment-1",
    ...overrides,
  };
}

function transition(event = "ready_for_review", overrides = {}) {
  return {
    event,
    commitId: specSha,
    trustedActor: true,
    createdAt: "2026-08-24T00:00:00Z",
    url: "https://api.github.com/repos/example/project/issues/events/1",
    ...overrides,
  };
}

function verification(sha = headSha, decision = "accepted", gateLevel = "full", gateStatus = "GREEN") {
  return comment(`<!-- factory-verification -->\nrequirement: REQ-007\ndecision: ${decision}\nverified_sha: ${sha}\ngate_level: ${gateLevel}\ngate_status: ${gateStatus}`);
}

function reviewedContext() {
  return {
    pr: {
      number: 8,
      state: "OPEN",
      isDraft: false,
      headSha,
      labels: ["factory:verified"],
      changedFiles: ["src/feature.js", "docs/requirements/REQ-007-example/design.md"],
    },
    issue: { number: 7, state: "OPEN", labels: [] },
    issueComments: [comment("<!-- factory-handoff -->\nrequirement: REQ-007\npattern: none\ndone_when: the complete result works")],
    prComments: [verification()],
    specTransitions: [transition()],
    openLinkedPrs: [8],
    comparisons: { [specSha]: { ancestorOfHead: true, changedFiles: ["src/feature.js"] } },
    pattern: null,
    hasReviewedSpec: true,
    defaultGateLevel: "full",
  };
}

function patternContext() {
  const context = reviewedContext();
  context.issue.labels = ["factory:pattern:feature-family"];
  context.issueComments = [comment("<!-- factory-handoff -->\nrequirement: REQ-007\npattern: feature-family\ndone_when: the complete result works")];
  context.pr.changedFiles = ["src/feature.js"];
  context.pr.isDraft = false;
  context.specTransitions = [];
  context.comparisons = {};
  context.hasReviewedSpec = false;
  context.pattern = {
    id: "feature-family",
    version: 1,
    enabled: true,
    activation: { issueLabel: "factory:pattern:feature-family" },
    scope: { allowedPaths: ["src/**"], preserved: ["existing behavior"] },
    execution: {
      planReview: "none",
      gateLevel: "full",
      independentVerification: "required",
      completion: "verified-pr",
    },
  };
  return context;
}

test("reviewed Spec Ready state and current independent verification pass", () => {
  assert.deepEqual(validatePrState(reviewedContext()), { ok: true, errors: [] });
  assert.equal(selectGateLevel(reviewedContext()), "full");
});

test("verification selects a configured, sufficiently strict gate level", () => {
  const docs = reviewedContext();
  docs.pr.changedFiles = ["docs/guide.md", "docs/requirements/REQ-007-example/design.md"];
  docs.prComments = [verification(headSha, "accepted", "fast")];
  assert.equal(validatePrState(docs).ok, true);
  assert.equal(selectGateLevel(docs), "fast");

  const governance = reviewedContext();
  governance.pr.changedFiles.push(".factory/gates.conf");
  governance.prComments = [verification(headSha, "accepted", "full")];
  assert.ok(validatePrState(governance).errors.includes("verification:gate-level-below-required:full:deep"));

  const pattern = patternContext();
  pattern.prComments = [verification(headSha, "accepted", "deep")];
  assert.ok(validatePrState(pattern).errors.includes("verification:pattern-gate-level-mismatch:deep:full"));
});

test("missing or invalid gate configuration fails closed", () => {
  const missingMarker = reviewedContext();
  missingMarker.prComments = [comment(`<!-- factory-verification -->\nrequirement: REQ-007\ndecision: accepted\nverified_sha: ${headSha}`)];
  assert.ok(validatePrState(missingMarker).errors.includes("verification:gate-level-invalid"));

  const invalidCharter = reviewedContext();
  invalidCharter.defaultGateLevel = "typo";
  assert.ok(validatePrState(invalidCharter).errors.includes("gate-level:charter-default-invalid"));
});

test("Ready without an exact commit SHA fails closed", () => {
  const context = reviewedContext();
  context.specTransitions[0].commitId = null;
  assert.ok(validatePrState(context).errors.includes("spec-ready:invalid-sha"));
});

test("Ready approval cannot move past Spec drift", () => {
  const context = reviewedContext();
  context.comparisons[specSha].changedFiles = ["docs/requirements/REQ-007-example/design.md"];
  const errors = validatePrState(context).errors;
  assert.ok(errors.includes("spec-ready:spec-drift"));
});

test("Draft and Convert to draft revoke approval", () => {
  const missing = reviewedContext();
  missing.pr.isDraft = true;
  missing.specTransitions = [];
  assert.ok(validatePrState(missing).errors.includes("spec-ready:missing"));

  const converted = reviewedContext();
  converted.pr.isDraft = true;
  converted.specTransitions.push(transition("convert_to_draft", { createdAt: "2026-08-24T00:01:00Z" }));
  assert.ok(validatePrState(converted).errors.includes("spec-ready:pr-is-draft"));
});

test("write collaborator is trusted but untrusted actor is rejected", () => {
  const collaborator = reviewedContext();
  collaborator.specTransitions[0] = transition("ready_for_review", { trustedActor: true, authorAssociation: "NONE" });
  assert.equal(validatePrState(collaborator).ok, true);

  const outsider = reviewedContext();
  outsider.specTransitions[0] = transition("ready_for_review", { trustedActor: false, authorAssociation: "NONE" });
  assert.ok(validatePrState(outsider).errors.includes("spec-ready:untrusted-actor"));
});

test("unique PR and current verification fail closed", () => {
  const secondPr = reviewedContext();
  secondPr.openLinkedPrs.push(9);
  assert.ok(validatePrState(secondPr).errors.includes("pr:not-unique-open"));

  const stale = reviewedContext();
  stale.prComments[0] = verification(specSha);
  assert.ok(validatePrState(stale).errors.includes("verification:stale-sha"));

  const rejected = reviewedContext();
  rejected.pr.labels.push("factory:rejected");
  assert.ok(validatePrState(rejected).errors.includes("verification:rejected-label-present"));

  const redGate = reviewedContext();
  redGate.prComments[0] = verification(headSha, "accepted", "full", "RED");
  assert.ok(validatePrState(redGate).errors.includes("verification:gate-not-green"));
});

test("missing reviewed Spec and closed issue fail closed", () => {
  const context = reviewedContext();
  context.issue.state = "CLOSED";
  context.hasReviewedSpec = false;
  const errors = validatePrState(context).errors;
  assert.ok(errors.includes("issue:not-open"));
  assert.ok(errors.includes("spec:design-missing"));
});

test("an enabled Pattern cannot authorize Factory governance changes", () => {
  const context = patternContext();
  context.pr.changedFiles.push(".agents/skills/factory-spec/SKILL.md");
  context.pattern.scope.allowedPaths.push(".agents/**");
  assert.ok(validatePrState(context).errors.includes("governance:pattern-cannot-authorize:.agents/skills/factory-spec/SKILL.md"));
});

test("an explicitly enabled Pattern skips Spec Ready but keeps scope and verification", () => {
  const context = patternContext();
  assert.equal(validatePrState(context).ok, true);

  context.pr.isDraft = true;
  assert.ok(validatePrState(context).errors.includes("pattern:pr-is-draft"));
  context.pr.isDraft = false;

  context.pr.changedFiles.push("package.json");
  assert.ok(validatePrState(context).errors.includes("pattern:not-allowed:package.json"));
  context.pr.changedFiles.pop();

  context.prComments = [];
  assert.ok(validatePrState(context).errors.includes("verification:missing"));
});

test("a disabled or unlabeled Pattern cannot bypass Spec Ready", () => {
  const disabled = patternContext();
  disabled.pattern.enabled = false;
  assert.ok(validatePrState(disabled).errors.includes("pattern:missing-disabled-or-invalid"));

  const unlabeled = patternContext();
  unlabeled.issue.labels = [];
  assert.ok(validatePrState(unlabeled).errors.includes("pattern:configuration-without-activation-label"));
  assert.ok(validatePrState(unlabeled).errors.includes("spec-ready:missing"));
});

test("an untrusted marker cannot shadow the latest trusted handoff", () => {
  const context = reviewedContext();
  context.issueComments.push(comment(
    "<!-- factory-handoff -->\nrequirement: REQ-999\npattern: none",
    { authorAssociation: "NONE", createdAt: "2026-08-24T00:05:00Z" },
  ));
  assert.equal(validatePrState(context).ok, true);
});

test("pagination reads item 101", async () => {
  const originalFetch = globalThis.fetch;
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }));
  globalThis.fetch = async (url) => {
    const page = new URL(url).searchParams.get("page");
    return new Response(JSON.stringify(page === "1" ? firstPage : [{ id: 101 }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await paginate("/repos/example/project/pulls/8/files", "token");
    assert.equal(result.length, 101);
    assert.equal(result.at(-1).id, 101);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
